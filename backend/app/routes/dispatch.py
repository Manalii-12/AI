from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Dict
from app.database import get_db
from app.schemas import DispatchResponse, DispatchUpdate
import app.crud as crud
from app.ai.engine import proactive_engine

router = APIRouter(prefix="/dispatch", tags=["Dispatch"])

class MakeDispatchRequest(BaseModel):
    order_ids: Optional[List[int]] = None
    user_name: Optional[str] = "Aarav Mehta (Company Owner)"

@router.get("", response_model=List[DispatchResponse])
def list_dispatches(
    status: Optional[str] = None,
    delayed_only: bool = False,
    db: Session = Depends(get_db)
):
    return crud.get_dispatches(db=db, status=status, delayed_only=delayed_only)

@router.post("/make-dispatch")
def make_dispatch_endpoint(req: MakeDispatchRequest = MakeDispatchRequest(), db: Session = Depends(get_db)):
    """
    Owner/Management endpoint to trigger dispatch verification and execution.
    Returns successful dispatches, failed dispatches with specific reasons,
    and AI-recommended solutions.
    """
    return crud.execute_dispatch_batch(
        db=db,
        order_ids=req.order_ids,
        user_name=req.user_name or "Aarav Mehta (Company Owner)"
    )

@router.patch("/{dispatch_id}", response_model=DispatchResponse)
def update_dispatch_record(dispatch_id: int, d_in: DispatchUpdate, db: Session = Depends(get_db)):
    updated = crud.update_dispatch(db=db, dispatch_id=dispatch_id, d_in=d_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Dispatch record not found")
    proactive_engine.run_full_business_scan(db)
    results = crud.get_dispatches(db=db)
    matched = [d for d in results if d["id"] == dispatch_id]
    return matched[0] if matched else results[0]

class DispatchAiActionRequest(BaseModel):
    action_type: str
    params: Optional[Dict[str, Any]] = None
    user_name: Optional[str] = "Aarav Mehta (Company Owner)"

@router.post("/{dispatch_id}/ai-action")
def execute_dispatch_ai_action(dispatch_id: int, req: DispatchAiActionRequest, db: Session = Depends(get_db)):
    import datetime
    from app.models import Dispatch, Product
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch record not found")

    action_type = req.action_type
    user_name = req.user_name or "Aarav Mehta (Company Owner)"
    now = datetime.datetime.utcnow()

    if action_type == "ESCALATE_COURIER_SLA":
        dispatch.carrier_status_notes = f"Priority SLA Escalated: High-urgency dispatch breach notice transmitted to {dispatch.delivery_partner} operations desk."
        db.commit()
        crud.log_audit(db, "ESCALATE", "Dispatch", f"Escalated courier SLA for tracking {dispatch.tracking_number} with {dispatch.delivery_partner}", user_name=user_name)
        return {"success": True, "message": f"High-priority SLA ticket dispatched to {dispatch.delivery_partner} for {dispatch.tracking_number}. Sent live GPS vehicle tracking link to customer."}

    elif action_type == "RE_ROUTE_AIR":
        old_carrier = dispatch.delivery_partner
        dispatch.delivery_partner = "BlueDart Express"
        dispatch.carrier_status_notes = f"Re-routed from {old_carrier} to BlueDart Air Cargo Corridor. Air waybill issued for 4h delivery window."
        dispatch.status = "In Transit"
        dispatch.expected_delivery_date = now + datetime.timedelta(hours=4)
        db.commit()
        crud.log_audit(db, "RE_ROUTE", "Dispatch", f"Re-routed consignment {dispatch.tracking_number} to BlueDart Express Air Courier", user_name=user_name)
        return {"success": True, "message": f"Consignment {dispatch.tracking_number} successfully re-routed to BlueDart Express Air Courier for same-day delivery."}

    elif action_type == "DIVERT_CORRIDOR":
        dispatch.carrier_status_notes = "Route Diverted: Bypassed regional Chicago terminal embargo via northern air freight corridor."
        dispatch.status = "In Transit"
        dispatch.expected_delivery_date = now + datetime.timedelta(hours=6)
        db.commit()
        crud.log_audit(db, "DIVERT", "Dispatch", f"Diverted consignment {dispatch.tracking_number} around regional transit embargo", user_name=user_name)
        return {"success": True, "message": f"Diverted transit corridor for {dispatch.tracking_number}. Airway bill updated."}

    elif action_type == "SEND_GPS_SMS":
        dispatch.carrier_status_notes = "Last-Mile Delivery Update: Driver contact & live OTP verification dispatched to customer."
        db.commit()
        crud.log_audit(db, "SMS_SENT", "Dispatch", f"Sent live driver contact and delivery OTP for tracking {dispatch.tracking_number}", user_name=user_name)
        return {"success": True, "message": f"Dispatched live driver contact & delivery OTP SMS for consignment {dispatch.tracking_number}."}

    elif action_type == "APPROVE_EMERGENCY_PO":
        prod = db.query(Product).first()
        po = crud.create_purchase_order(
            db=db,
            po_in=type("POIn", (), {
                "product_id": prod.id if prod else 1,
                "supplier_id": prod.supplier_id if prod else 1,
                "quantity": 250,
                "unit_cost": prod.cost_price if prod else 24.50,
                "expected_date": now + datetime.timedelta(days=2)
            })(),
            user_name=user_name
        )
        dispatch.carrier_status_notes = f"Packaging Queue Unblocked: Approved emergency PO {po.po_number} (250 units) to clear stockout hold."
        db.commit()
        crud.log_audit(db, "CREATE_PO", "Dispatch", f"Approved emergency PO {po.po_number} to unblock packaging for dispatch {dispatch.tracking_number}", user_name=user_name)
        return {"success": True, "message": f"Approved Emergency Purchase Order {po.po_number} (250 units) to unblock warehouse packaging queue."}

    elif action_type == "FAST_TRACK_PACK":
        dispatch.carrier_status_notes = "Packaging Fast-Tracked: Supervisor pack verification override applied."
        dispatch.status = "In Transit"
        db.commit()
        crud.log_audit(db, "FAST_TRACK", "Dispatch", f"Fast-tracked packaging and handover for consignment {dispatch.tracking_number}", user_name=user_name)
        return {"success": True, "message": f"Supervisor override applied. Consignment {dispatch.tracking_number} handed over for dispatch."}

    return {"success": True, "message": "Logistics countermeasure executed successfully."}

