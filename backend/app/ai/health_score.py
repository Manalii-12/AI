import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Order, Payment, Product, Dispatch, Complaint

def calculate_business_health_score(db: Session) -> dict:
    """
    Computes a composite Business Health Score out of 100 based on 5 weighted pillars:
    1. Order Fulfillment (Weight: 25%)
    2. Payment Collection (Weight: 20%)
    3. Inventory Availability (Weight: 20%)
    4. On-Time Dispatch & Delivery (Weight: 20%)
    5. Customer Complaint Resolution (Weight: 15%)
    """
    deduction_reasons = []
    positive_factors = []
    now = datetime.datetime.utcnow()

    # --- 1. Order Fulfillment (Max 25 pts) ---
    all_orders = db.query(Order).all()
    total_orders_count = len(all_orders)
    if total_orders_count == 0:
        fulfillment_score = 25.0
    else:
        cancelled_count = sum(1 for o in all_orders if o.status == "Cancelled")
        completed_count = sum(1 for o in all_orders if o.status in ["Delivered", "Dispatched", "Packed"])
        cancel_rate = (cancelled_count / total_orders_count) * 100
        
        # Base fulfillment ratio
        fulfillment_ratio = (completed_count / total_orders_count)
        fulfillment_score = round(max(0.0, min(25.0, fulfillment_ratio * 25.0)), 1)

        if cancel_rate > 10.0:
            deduction = min(5.0, round(cancel_rate * 0.2, 1))
            fulfillment_score = max(0.0, fulfillment_score - deduction)
            deduction_reasons.append(f"Order cancellation rate is {cancel_rate:.1f}% (-{deduction} pts)")
        else:
            positive_factors.append(f"Low cancellation rate of {cancel_rate:.1f}%")

    # --- 2. Payment Collection (Max 20 pts) ---
    total_revenue_booked = sum(o.total_amount for o in all_orders if o.status != "Cancelled")
    total_revenue_collected = db.query(func.sum(Payment.amount)).filter(Payment.status == "Success").scalar() or 0.0

    if total_revenue_booked == 0:
        payment_score = 20.0
    else:
        collection_ratio = min(1.0, total_revenue_collected / total_revenue_booked)
        payment_score = round(collection_ratio * 20.0, 1)

        unpaid_count = sum(1 for o in all_orders if o.payment_status in ["Unpaid", "Failed", "Partial"] and o.status != "Cancelled")
        if unpaid_count > 0:
            deduction_reasons.append(f"{unpaid_count} uncollected/overdue orders totaling ${max(0.0, total_revenue_booked - total_revenue_collected):,.2f}")
        else:
            positive_factors.append("Strong collection discipline with zero overdue receivables")

    # --- 3. Inventory Availability (Max 20 pts) ---
    products = db.query(Product).all()
    total_products = len(products)
    if total_products == 0:
        inventory_score = 20.0
    else:
        out_of_stock_count = sum(1 for p in products if p.stock_quantity <= 0)
        low_stock_count = sum(1 for p in products if 0 < (p.stock_quantity - p.reserved_stock) <= p.reorder_level)
        
        stockout_pct = (out_of_stock_count / total_products) * 100
        low_stock_pct = (low_stock_count / total_products) * 100

        pts_deducted = (stockout_pct * 0.15) + (low_stock_pct * 0.08)
        inventory_score = round(max(0.0, min(20.0, 20.0 - pts_deducted)), 1)

        if out_of_stock_count > 0:
            deduction_reasons.append(f"{out_of_stock_count} product(s) completely out of stock")
        if low_stock_count > 0:
            deduction_reasons.append(f"{low_stock_count} product(s) below recommended reorder threshold")
        if out_of_stock_count == 0 and low_stock_count == 0:
            positive_factors.append("Healthy inventory depth across all beverage SKUs")

    # --- 4. On-Time Dispatch & Delivery (Max 20 pts) ---
    dispatches = db.query(Dispatch).all()
    if len(dispatches) == 0:
        dispatch_score = 20.0
    else:
        delayed_count = sum(
            1 for d in dispatches
            if d.expected_delivery_date and d.status not in ["Delivered", "Cancelled"] and now > d.expected_delivery_date
        )
        ontime_ratio = (len(dispatches) - delayed_count) / len(dispatches)
        dispatch_score = round(max(0.0, min(20.0, ontime_ratio * 20.0)), 1)

        if delayed_count > 0:
            deduction_reasons.append(f"{delayed_count} shipment(s) currently delayed past promised SLA")
        else:
            positive_factors.append("100% on-time dispatch SLA fulfillment")

    # --- 5. Customer Complaint Resolution (Max 15 pts) ---
    complaints = db.query(Complaint).all()
    if len(complaints) == 0:
        complaint_score = 15.0
        positive_factors.append("Zero customer complaints registered")
    else:
        open_complaints = sum(1 for c in complaints if c.status in ["Open", "In Progress", "Escalated"])
        urgent_complaints = sum(1 for c in complaints if c.priority == "Urgent" and c.status != "Resolved")
        
        resolved_ratio = (len(complaints) - open_complaints) / len(complaints)
        complaint_score = round(max(0.0, min(15.0, resolved_ratio * 15.0)), 1)

        if urgent_complaints > 0:
            complaint_score = max(0.0, complaint_score - (urgent_complaints * 3.0))
            deduction_reasons.append(f"{urgent_complaints} urgent/critical customer complaint(s) unresolved")
        elif open_complaints > 0:
            deduction_reasons.append(f"{open_complaints} open complaint ticket(s) awaiting resolution")

    # Total Score
    total_score = int(round(fulfillment_score + payment_score + inventory_score + dispatch_score + complaint_score))
    total_score = max(0, min(100, total_score))

    if total_score >= 85:
        status = "Excellent"
    elif total_score >= 70:
        status = "Healthy"
    elif total_score >= 50:
        status = "Needs Attention"
    else:
        status = "Critical Risk"

    return {
        "overall_score": total_score,
        "status": status,
        "category_scores": {
            "order_fulfillment": fulfillment_score,
            "payment_collection": payment_score,
            "inventory_availability": inventory_score,
            "ontime_dispatch": dispatch_score,
            "complaint_resolution": complaint_score
        },
        "max_category_scores": {
            "order_fulfillment": 25,
            "payment_collection": 20,
            "inventory_availability": 20,
            "ontime_dispatch": 20,
            "complaint_resolution": 15
        },
        "deduction_reasons": deduction_reasons,
        "positive_factors": positive_factors
    }
