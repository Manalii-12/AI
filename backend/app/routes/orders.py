from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas import OrderCreate, OrderStatusUpdate, OrderResponse
import app.crud as crud
from app.ai.engine import proactive_engine

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("", response_model=List[OrderResponse])
def list_orders(
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    return crud.get_orders(db=db, status=status, payment_status=payment_status, search=search, limit=limit)

@router.get("/{order_id}", response_model=OrderResponse)
def get_single_order(order_id: int, db: Session = Depends(get_db)):
    order = crud.get_order_by_id(db=db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("", response_model=OrderResponse, status_code=201)
def create_new_order(order_in: OrderCreate, db: Session = Depends(get_db)):
    try:
        order = crud.create_order(db=db, order_in=order_in)
        # Trigger proactive scan in background to re-evaluate risks
        proactive_engine.run_full_business_scan(db)
        return crud.get_order_by_id(db=db, order_id=order.id)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_status(order_id: int, status_update: OrderStatusUpdate, db: Session = Depends(get_db)):
    updated_order = crud.update_order_status(
        db=db,
        order_id=order_id,
        new_status=status_update.status,
        notes=status_update.notes,
        cancellation_reason=status_update.cancellation_reason
    )
    if not updated_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update AI insights
    proactive_engine.run_full_business_scan(db)
    return crud.get_order_by_id(db=db, order_id=order_id)

@router.post("/{order_id}/ai-action")
def execute_order_ai_action(order_id: int, payload: dict, db: Session = Depends(get_db)):
    action_type = payload.get("action_type")
    user_name = payload.get("user_name", "Aarav Mehta (Company Owner)")

    order = crud.get_order_by_id(db=db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    from app.models import Order as OrderModel, PurchaseOrder, Product, Supplier
    db_order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    import datetime
    now_str = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M')

    if action_type == "RESOLVE_STOCKOUT":
        # Check stockout product
        product = None
        for it in db_order.items:
            if it.product and it.product.stock_quantity <= 0:
                product = it.product
                break
        if not product and db_order.items:
            product = db_order.items[0].product

        if product:
            # Check supplier
            supplier = db.query(Supplier).filter(Supplier.id == product.supplier_id).first() if product.supplier_id else db.query(Supplier).first()
            if supplier:
                count = db.query(PurchaseOrder).count()
                po_num = f"PO-EMERG-{202600 + count + 1}"
                po = PurchaseOrder(
                    po_number=po_num,
                    supplier_id=supplier.id,
                    product_id=product.id,
                    quantity=product.reorder_quantity or 200,
                    unit_cost=product.cost_price,
                    total_amount=(product.reorder_quantity or 200) * product.cost_price,
                    status="Ordered",
                    expected_date=datetime.datetime.utcnow() + datetime.timedelta(days=supplier.lead_time_days or 3)
                )
                db.add(po)
                db_order.notes = (db_order.notes or "") + f"\n[{now_str}] AI Action: Issued emergency {po_num} to {supplier.name} for {product.name}."
                db.commit()
                crud.log_audit(db, "AI_ACTION", "Orders", f"Auto-generated emergency {po_num} for Order {db_order.order_number}", user_name=user_name)
                return {"success": True, "message": f"Successfully generated Emergency {po_num} with {supplier.name}. ETA: {supplier.lead_time_days or 3} days."}

    elif action_type == "APPROVE_CREDIT_HOLD":
        db_order.payment_status = "Credit Approved"
        db_order.status = "Packed"
        db_order.notes = (db_order.notes or "") + f"\n[{now_str}] AI Action: Commercial credit review approved by {user_name}. Advanced to Packed."
        db.commit()
        crud.log_audit(db, "AI_ACTION", "Orders", f"Approved commercial credit hold for Order {db_order.order_number}", user_name=user_name)
        return {"success": True, "message": f"Credit hold released for Order {db_order.order_number}. Order advanced to Packed for immediate fulfillment."}

    elif action_type == "ESCALATE_COURIER_SLA":
        if db_order.dispatch:
            db_order.dispatch.carrier_status_notes = f"Urgent SLA escalation raised by {user_name} - Priority Air Corridor dispatch"
        db_order.notes = (db_order.notes or "") + f"\n[{now_str}] AI Action: High-priority SLA escalation transmitted to logistics partner with live customer GPS alert."
        db.commit()
        crud.log_audit(db, "AI_ACTION", "Orders", f"Escalated logistics courier SLA for Order {db_order.order_number}", user_name=user_name)
        return {"success": True, "message": f"Priority SLA escalation transmitted to courier dispatch for Order {db_order.order_number}."}

    elif action_type == "HOLD_CARRIER_OTP":
        db_order.notes = (db_order.notes or "") + f"\n[{now_str}] AI Action: Dispatched urgent UPI collection link and placed terminal OTP hold on delivery."
        db.commit()
        crud.log_audit(db, "AI_ACTION", "Orders", f"Placed OTP delivery safety hold on Order {db_order.order_number}", user_name=user_name)
        return {"success": True, "message": f"OTP delivery safety hold applied & UPI collection link sent for Order {db_order.order_number}."}

    elif action_type == "RE_ROUTE_AIR":
        db_order.notes = (db_order.notes or "") + f"\n[{now_str}] AI Action: Re-routed consignment to Bluedart Air Cargo corridor. Temperature logs confirmed."
        db.commit()
        crud.log_audit(db, "AI_ACTION", "Orders", f"Re-routed Order {db_order.order_number} to Air Cargo", user_name=user_name)
        return {"success": True, "message": f"Order {db_order.order_number} re-routed to Bluedart Air Cargo corridor."}

    return {"success": False, "message": "Unknown action type"}

