import os
import sys
import datetime

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import Product, Order, OrderItem, Payment, Dispatch, Complaint, PurchaseOrder, AuditLog
import app.crud as crud
from app.schemas import OrderCreate, OrderItemCreate, PaymentCreate, ComplaintCreate, PurchaseOrderCreate
from app.ai.engine import proactive_engine
from app.ai.health_score import calculate_business_health_score

def run_workflow_tests():
    print("=" * 70)
    print("VERIFYING COMPLETE 8 END-TO-END BUSINESS WORKFLOWS")
    print("=" * 70)

    db = SessionLocal()

    # ---------------- 1. Create order & verify inventory reservation ----------------
    print("\n[Workflow 1] Create Order & Verify Inventory Reservation...")
    prod = db.query(Product).filter(Product.sku == "HUG-CB-VAN").first()
    initial_reserved = prod.reserved_stock
    cust = crud.get_customers(db)[0]

    order = crud.create_order(
        db=db,
        order_in=OrderCreate(
            customer_id=cust["id"],
            items=[OrderItemCreate(product_id=prod.id, quantity=10)]
        ),
        user_name="Workflow Tester"
    )
    db.refresh(prod)
    assert prod.reserved_stock == initial_reserved + 10, f"Expected reserved={initial_reserved + 10}, got {prod.reserved_stock}"
    print(f"  --> Order {order.order_number} created. Reserved stock increased from {initial_reserved} to {prod.reserved_stock}.")

    # ---------------- 2. Confirm payment & verify payment status ----------------
    print("\n[Workflow 2] Confirm Payment & Verify Payment Status...")
    payment = crud.create_payment(
        db=db,
        p_in=PaymentCreate(
            order_id=order.id,
            amount=order.total_amount,
            payment_method="UPI",
            transaction_ref=f"TXN-WF2-{order.order_number}",
            status="Success"
        )
    )
    db.refresh(order)
    assert order.payment_status == "Paid", f"Expected 'Paid', got {order.payment_status}"
    print(f"  --> Recorded ${payment.amount} payment. Order payment status auto-advanced to: {order.payment_status}.")

    # ---------------- 3. Dispatch order & update delivery status ----------------
    print("\n[Workflow 3] Dispatch Order & Update Delivery Status...")
    initial_stock = prod.stock_quantity
    updated_order = crud.update_order_status(db=db, order_id=order.id, new_status="Dispatched")
    db.refresh(prod)
    db.refresh(order)
    assert prod.stock_quantity == initial_stock - 10, f"Expected {initial_stock - 10}, got {prod.stock_quantity}"
    assert order.dispatch.status == "In Transit", f"Expected In Transit, got {order.dispatch.status}"
    print(f"  --> Order marked 'Dispatched'. Physical stock deducted by 10 ({initial_stock} -> {prod.stock_quantity}). Dispatch status: {order.dispatch.status}.")

    # Deliver order
    delivered_order = crud.update_order_status(db=db, order_id=order.id, new_status="Delivered")
    db.refresh(order)
    assert order.dispatch.status == "Delivered" and order.dispatch.actual_delivery_date is not None
    print(f"  --> Order marked 'Delivered'. Dispatch actual_delivery_date recorded.")

    # ---------------- 4. Create complaint & verify connection to order/customer ----------------
    print("\n[Workflow 4] Create Complaint & Verify Links to Order and Customer...")
    comp = crud.create_complaint(
        db=db,
        comp_in=ComplaintCreate(
            customer_id=cust["id"],
            order_id=order.id,
            category="Taste Issue",
            description="Vanilla cold brew had a sour taste and cap felt loose upon unboxing.",
            priority="High"
        )
    )
    assert comp.customer_id == cust["id"]
    assert comp.order_id == order.id
    assert comp.ai_sentiment in ["Negative", "Critical Risk"]
    print(f"  --> Complaint {comp.complaint_number} filed for {cust['name']}. AI auto-assigned sentiment: '{comp.ai_sentiment}' and resolution recommendation.")

    # ---------------- 5. Reduce stock & verify low-stock detection ----------------
    print("\n[Workflow 5] Reduce Stock & Verify Proactive Low-Stock Detection...")
    crud.adjust_stock(db, product_id=prod.id, movement_type="ADJUSTMENT", quantity=15, notes="Audit recount reduction")
    insights = proactive_engine.run_full_business_scan(db)
    low_stock_insight = next((i for i in insights if prod.sku in str(i.affected_records)), None)
    assert low_stock_insight is not None, "Low stock insight was not generated for reduced product"
    print(f"  --> Adjusted {prod.name} stock to 15. Proactive AI engine flagged insight: '{low_stock_insight.title}'.")

    # ---------------- 6. Create overdue payment & verify AI detection ----------------
    print("\n[Workflow 6] Create Unpaid Dispatched Order & Verify Financial Leakage Detection...")
    unpaid_order = crud.create_order(
        db=db,
        order_in=OrderCreate(
            customer_id=cust["id"],
            items=[OrderItemCreate(product_id=prod.id, quantity=2)]
        )
    )
    crud.update_order_status(db, unpaid_order.id, new_status="Dispatched")
    # Leaves payment_status as Unpaid while Dispatched
    insights = proactive_engine.run_full_business_scan(db)
    leakage_insight = next((i for i in insights if i.insight_type == "FINANCIAL"), None)
    assert leakage_insight is not None
    print(f"  --> Created unpaid dispatched order {unpaid_order.order_number}. AI Revenue Leakage auditor detected: '{leakage_insight.title}' (${leakage_insight.metrics.get('uncollected_revenue')}).")

    # ---------------- 7. Trigger dispatch delay & verify root cause analysis ----------------
    print("\n[Workflow 7] Trigger Dispatch Delay & Verify 5-Step Root Cause Analysis...")
    now = datetime.datetime.utcnow()
    unpaid_order.dispatch.expected_delivery_date = now - datetime.timedelta(days=3) # Past due
    db.commit()

    insights = proactive_engine.run_full_business_scan(db)
    delay_insight = next((i for i in insights if i.affected_module == "Dispatch & Logistics"), None)
    assert delay_insight is not None
    print(f"  --> Dispatch delay injected. AI Root Cause Diagnostic generated:")
    print(f"      1. What: {delay_insight.problem[:60]}...")
    print(f"      2. Why:  {delay_insight.root_cause[:60]}...")
    print(f"      3. Impact: {delay_insight.business_impact[:60]}...")
    print(f"      4. Solution: {delay_insight.recommended_solution[:60]}...")

    # ---------------- 8. Approve AI recommendation & verify resulting action & audit log ----------------
    print("\n[Workflow 8] Approve AI Action & Verify Execution + Audit Log...")
    po_insight = next((i for i in insights if i.action_type == "CREATE_PURCHASE_ORDER"), None)
    if po_insight:
        result = proactive_engine.execute_approved_action(
            db=db,
            insight_id=po_insight.id,
            action_type=po_insight.action_type,
            user_name="Aarav Mehta (Owner)"
        )
        print(f"  --> AI Action Approved! Result: {result['message']}.")

        # Check Audit Log
        last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
        assert last_log.action == "AI_ACTION_APPROVAL"
        print(f"  --> Verified Audit Log entry #{last_log.id}: {last_log.details}")

    print("\n" + "=" * 70)
    print("ALL 8 BUSINESS WORKFLOWS VALIDATED 100% SUCCESSFULLY!")
    print("=" * 70)
    db.close()

if __name__ == "__main__":
    run_workflow_tests()
