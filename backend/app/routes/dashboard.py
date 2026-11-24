import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Order, Payment, Product, Dispatch, Complaint, Customer

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics")
def get_dashboard_metrics(
    time_range: str = Query("30d", alias="range"),
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db)
):
    now = datetime.datetime.utcnow()
    
    # Calculate cutoff date
    if time_range == "today":
        cutoff = now - datetime.timedelta(hours=24)
    elif time_range == "7d":
        cutoff = now - datetime.timedelta(days=7)
    elif time_range == "30d":
        cutoff = now - datetime.timedelta(days=30)
    elif time_range == "all":
        cutoff = datetime.datetime(2020, 1, 1)
    else:
        cutoff = now - datetime.timedelta(days=30)

    if start_date and end_date:
        try:
            cutoff = datetime.datetime.strptime(start_date, "%Y-%m-%d")
        except Exception:
            pass

    # 1. Orders in range
    orders_in_range = db.query(Order).filter(Order.order_date >= cutoff).all()
    all_orders = db.query(Order).all()

    # Revenue
    revenue = sum(o.total_amount for o in orders_in_range if o.status != "Cancelled")
    
    # Order Status counts
    today_orders = db.query(Order).filter(Order.order_date >= (now - datetime.timedelta(hours=24))).count()
    pending_orders = sum(1 for o in all_orders if o.status in ["New", "Confirmed", "Processing", "Packed"])
    completed_orders = sum(1 for o in all_orders if o.status == "Delivered")
    cancelled_orders = sum(1 for o in all_orders if o.status == "Cancelled")

    # Payments
    total_booked = sum(o.total_amount for o in all_orders if o.status != "Cancelled")
    total_collected = db.query(func.sum(Payment.amount)).filter(Payment.status == "Success").scalar() or 0.0
    pending_payments_count = sum(1 for o in all_orders if o.payment_status in ["Unpaid", "Failed", "Partial"] and o.status != "Cancelled")
    total_outstanding_amount = max(0.0, total_booked - total_collected)

    # Inventory
    products = db.query(Product).all()
    total_products = len(products)
    low_stock_products = [p for p in products if (p.stock_quantity - p.reserved_stock) <= p.reorder_level]
    out_of_stock_products = [p for p in products if p.stock_quantity <= 0]
    in_stock_count = total_products - len(low_stock_products)
    inventory_availability_pct = round((in_stock_count / total_products * 100), 1) if total_products > 0 else 100.0

    # Logistics / Dispatch
    delayed_dispatches = db.query(Dispatch).filter(
        Dispatch.status.in_(["In Transit", "Preparing", "Out for Delivery"]),
        Dispatch.expected_delivery_date < now
    ).count()

    # Support / Complaints
    open_complaints = db.query(Complaint).filter(Complaint.status.in_(["Open", "In Progress", "Escalated"])).count()

    # Customer Growth
    total_customers = db.query(Customer).count()
    new_customers_30d = db.query(Customer).filter(Customer.created_at >= (now - datetime.timedelta(days=30))).count()

    # Revenue & Order Trends (Last 7 days daily breakdown)
    trends = []
    for i in range(6, -1, -1):
        day = now - datetime.timedelta(days=i)
        day_start = datetime.datetime(day.year, day.month, day.day)
        day_end = day_start + datetime.timedelta(days=1)
        
        day_orders = [o for o in all_orders if day_start <= o.order_date < day_end and o.status != "Cancelled"]
        day_rev = sum(o.total_amount for o in day_orders)
        trends.append({
            "date": day_start.strftime("%b %d"),
            "revenue": round(day_rev, 2),
            "orders": len(day_orders)
        })

    # Category Revenue Distribution
    category_map = {}
    for o in orders_in_range:
        if o.status != "Cancelled":
            for it in o.items:
                cat = it.product.category if it.product else "Beverages"
                category_map[cat] = category_map.get(cat, 0.0) + it.subtotal

    category_distribution = [
        {"category": cat, "revenue": round(rev, 2)}
        for cat, rev in category_map.items()
    ]

    return {
        "range": time_range,
        "metrics": {
            "total_revenue": round(revenue, 2),
            "today_orders": today_orders,
            "pending_orders": pending_orders,
            "completed_orders": completed_orders,
            "cancelled_orders": cancelled_orders,
            "pending_payments_count": pending_payments_count,
            "total_outstanding_amount": round(total_outstanding_amount, 2),
            "inventory_availability_pct": inventory_availability_pct,
            "low_stock_count": len(low_stock_products),
            "out_of_stock_count": len(out_of_stock_products),
            "delayed_dispatches_count": delayed_dispatches,
            "open_complaints_count": open_complaints,
            "total_customers": total_customers,
            "new_customers_30d": new_customers_30d
        },
        "revenue_trends": trends,
        "category_distribution": category_distribution,
        "low_stock_preview": [
            {
                "sku": p.sku,
                "name": p.name,
                "available": max(0, p.stock_quantity - p.reserved_stock),
                "reorder_level": p.reorder_level,
                "unit": p.unit
            }
            for p in low_stock_products[:4]
        ]
    }
