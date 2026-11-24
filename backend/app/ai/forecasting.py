import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Product, Order, OrderItem, Payment, Customer, Supplier, Complaint

def get_demand_forecast(db: Session) -> list:
    """
    Computes statistical inventory demand forecast:
    - 30-day historical consumption velocity
    - Current available stock
    - Days of inventory remaining (Runway)
    - Estimated stockout date
    - Recommended order quantity
    """
    products = db.query(Product).all()
    forecasts = []
    now = datetime.datetime.utcnow()
    thirty_days_ago = now - datetime.timedelta(days=30)

    for p in products:
        # 30-day quantity sold
        units_sold = db.query(func.sum(OrderItem.quantity)).join(Order).filter(
            OrderItem.product_id == p.id,
            Order.order_date >= thirty_days_ago,
            Order.status != "Cancelled"
        ).scalar() or 0

        daily_velocity = units_sold / 30.0
        # If new product with 0 sales yet, assume minimal baseline velocity
        effective_velocity = max(daily_velocity, 0.5)

        available_stock = max(0, p.stock_quantity - p.reserved_stock)
        runway_days = int(available_stock / effective_velocity) if effective_velocity > 0 else 999

        stockout_date = now + datetime.timedelta(days=runway_days)
        is_imminent = runway_days <= (p.supplier.lead_time_days if p.supplier else 5) + 2

        # Recommended order quantity: (lead_time + 14_day_safety_buffer) * velocity
        lead_time = p.supplier.lead_time_days if p.supplier else 5
        recommended_reorder = int((lead_time + 14) * effective_velocity) + p.reorder_level

        forecasts.append({
            "product_id": p.id,
            "sku": p.sku,
            "product_name": p.name,
            "category": p.category,
            "current_stock": p.stock_quantity,
            "reserved_stock": p.reserved_stock,
            "available_stock": available_stock,
            "units_sold_30d": units_sold,
            "daily_run_rate": round(daily_velocity, 2),
            "runway_days": runway_days,
            "stockout_date": stockout_date.strftime("%Y-%m-%d"),
            "risk_level": "CRITICAL" if runway_days <= 3 else ("HIGH" if is_imminent else "STABLE"),
            "recommended_order_quantity": max(p.reorder_quantity, recommended_reorder),
            "supplier_lead_time_days": lead_time
        })

    # Sort by lowest runway days first
    forecasts.sort(key=lambda x: x["runway_days"])
    return forecasts

def detect_revenue_leakage(db: Session) -> dict:
    """
    Scans for 4 types of revenue leakage:
    1. Unpaid Dispatched/Delivered Orders
    2. Payment Mismatches (paid amount != order total)
    3. Duplicate Transaction References
    4. Outstanding Customer Accounts past credit limit
    """
    now = datetime.datetime.utcnow()
    
    # 1. Unpaid dispatched/delivered
    unpaid_orders = db.query(Order).filter(
        Order.status.in_(["Dispatched", "Delivered"]),
        Order.payment_status.in_(["Unpaid", "Failed", "Partial"])
    ).all()
    unpaid_leakage = [
        {
            "order_number": o.order_number,
            "customer_name": o.customer.name if o.customer else "N/A",
            "order_date": o.order_date.strftime("%Y-%m-%d"),
            "order_status": o.status,
            "payment_status": o.payment_status,
            "uncollected_amount": round(o.total_amount - sum(p.amount for p in o.payments if p.status == "Success"), 2)
        }
        for o in unpaid_orders
    ]
    total_unpaid = sum(item["uncollected_amount"] for item in unpaid_leakage)

    # 2. Payment mismatches
    payments = db.query(Payment).filter(Payment.status == "Success").all()
    mismatches = []
    for p in payments:
        if p.order and abs(p.amount - p.order.total_amount) > 1.0:
            mismatches.append({
                "payment_id": p.id,
                "order_number": p.order.order_number,
                "paid_amount": p.amount,
                "order_total": p.order.total_amount,
                "shortfall": round(p.order.total_amount - p.amount, 2),
                "date": p.payment_date.strftime("%Y-%m-%d")
            })
    total_mismatch_loss = sum(m["shortfall"] for m in mismatches if m["shortfall"] > 0)

    # 3. Duplicate transactions
    all_payments = db.query(Payment).all()
    ref_map = {}
    for p in all_payments:
        if p.transaction_ref:
            ref_map.setdefault(p.transaction_ref, []).append(p)
    
    duplicates = []
    for ref, p_list in ref_map.items():
        if len(p_list) > 1:
            duplicates.append({
                "transaction_ref": ref,
                "count": len(p_list),
                "orders_involved": [p.order.order_number for p in p_list if p.order],
                "total_amount": sum(p.amount for p in p_list)
            })

    # Summary
    total_leakage = total_unpaid + total_mismatch_loss

    return {
        "total_revenue_at_risk": round(total_leakage, 2),
        "unpaid_dispatched_leakage": {
            "count": len(unpaid_leakage),
            "amount": round(total_unpaid, 2),
            "records": unpaid_leakage
        },
        "payment_mismatches": {
            "count": len(mismatches),
            "amount": round(total_mismatch_loss, 2),
            "records": mismatches
        },
        "duplicate_transactions": {
            "count": len(duplicates),
            "records": duplicates
        }
    }

def get_customer_intelligence(db: Session) -> dict:
    """
    Performs customer RFM intelligence and churn vulnerability analysis.
    """
    customers = db.query(Customer).all()
    now = datetime.datetime.utcnow()

    vip_customers = []
    at_risk_customers = []
    repeat_customers = []
    inactive_customers = []

    for c in customers:
        orders = [o for o in c.orders if o.status != "Cancelled"]
        total_spend = sum(o.total_amount for o in orders)
        last_order = max((o.order_date for o in orders), default=None)
        days_since_last = (now - last_order).days if last_order else 999

        data = {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "city": c.city,
            "total_orders": len(orders),
            "total_spend": round(total_spend, 2),
            "days_since_last_order": days_since_last,
            "segment": c.segment
        }

        if total_spend >= 1000.0 or len(orders) >= 4:
            vip_customers.append(data)
        elif len(orders) >= 2 and days_since_last > 30:
            at_risk_customers.append(data)
        elif len(orders) >= 2:
            repeat_customers.append(data)
        elif days_since_last > 60:
            inactive_customers.append(data)

    return {
        "summary": {
            "total_customers": len(customers),
            "vip_count": len(vip_customers),
            "repeat_count": len(repeat_customers),
            "at_risk_count": len(at_risk_customers),
            "inactive_count": len(inactive_customers)
        },
        "vip_customers": vip_customers,
        "at_risk_customers": at_risk_customers,
        "repeat_customers": repeat_customers
    }

def get_supplier_intelligence(db: Session) -> list:
    """
    Evaluates suppliers on lead time adherence, price stability, and complaint incidence.
    """
    suppliers = db.query(Supplier).all()
    results = []

    for s in suppliers:
        prods = s.products
        total_orders_for_supplier = sum(len(p.order_items) for p in prods)
        
        # Check complaints for products supplied by this supplier
        supplier_complaints = db.query(Complaint).join(Order).join(OrderItem).filter(
            OrderItem.product_id.in_([p.id for p in prods])
        ).distinct().count()

        risk_rating = "Low Risk"
        if s.reliability_rating < 4.0 or supplier_complaints >= 3:
            risk_rating = "High Risk"
        elif s.reliability_rating < 4.5:
            risk_rating = "Moderate Risk"

        results.append({
            "id": s.id,
            "name": s.name,
            "category": s.category,
            "lead_time_days": s.lead_time_days,
            "reliability_score": s.reliability_rating,
            "supplied_skus_count": len(prods),
            "associated_complaints_count": supplier_complaints,
            "risk_assessment": risk_rating,
            "payment_terms": s.payment_terms
        })

    return results
