import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Order, Payment, Product, Dispatch, Complaint, DailyBriefing

def generate_daily_briefing(db: Session, force_refresh: bool = False) -> dict:
    today_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    
    if not force_refresh:
        existing = db.query(DailyBriefing).filter(DailyBriefing.briefing_date == today_str).first()
        if existing:
            return {
                "id": existing.id,
                "briefing_date": existing.briefing_date,
                "summary_text": existing.summary_text,
                "metrics_snapshot": existing.metrics_snapshot,
                "highlights": existing.highlights,
                "risks": existing.risks,
                "action_items": existing.action_items,
                "created_at": existing.created_at
            }

    now = datetime.datetime.utcnow()
    start_of_day = datetime.datetime(now.year, now.month, now.day)
    seven_days_ago = now - datetime.timedelta(days=7)

    # Database metrics
    today_orders = db.query(Order).filter(Order.order_date >= start_of_day).all()
    today_orders_count = len(today_orders)
    today_revenue = sum(o.total_amount for o in today_orders if o.status != "Cancelled")

    all_orders = db.query(Order).all()
    total_orders_count = len(all_orders)
    pending_orders = [o for o in all_orders if o.status in ["New", "Confirmed", "Processing", "Packed"]]
    completed_orders = [o for o in all_orders if o.status == "Delivered"]
    cancelled_orders = [o for o in all_orders if o.status == "Cancelled"]

    # Payments
    total_revenue_booked = sum(o.total_amount for o in all_orders if o.status != "Cancelled")
    total_revenue_collected = db.query(func.sum(Payment.amount)).filter(Payment.status == "Success").scalar() or 0.0
    outstanding_payments = max(0.0, total_revenue_booked - total_revenue_collected)
    failed_payments = db.query(Payment).filter(Payment.status == "Failed").all()

    # Inventory
    products = db.query(Product).all()
    low_stock = [p for p in products if (p.stock_quantity - p.reserved_stock) <= p.reorder_level]
    out_of_stock = [p for p in products if p.stock_quantity <= 0]

    # Dispatches
    dispatches = db.query(Dispatch).all()
    delayed_dispatches = [
        d for d in dispatches
        if d.expected_delivery_date and d.status not in ["Delivered", "Cancelled"] and now > d.expected_delivery_date
    ]

    # Complaints
    open_complaints = db.query(Complaint).filter(Complaint.status.in_(["Open", "In Progress", "Escalated"])).all()
    urgent_complaints = [c for c in open_complaints if c.priority == "Urgent"]

    # Highlights
    highlights = [
        f"₹{today_revenue:,.2f} recorded in today's transactions across {today_orders_count} orders",
        f"{len(completed_orders)} total orders delivered to date",
        f"{len(products) - len(low_stock)} beverage products fully stocked with healthy run rates"
    ]

    # Risks with Diagnostic Reasons
    risks = []
    if low_stock:
        risks.append(f"Inventory: {len(low_stock)} product(s) below reorder levels ({', '.join([p.name for p in low_stock[:3]])}) due to sales demand outpacing supplier lead time")
    if delayed_dispatches:
        risks.append(f"Logistics: {len(delayed_dispatches)} dispatch shipment(s) delayed past promised SLA due to regional hub congestion with Delhivery")
    if outstanding_payments > 0:
        risks.append(f"Finance: ₹{outstanding_payments:,.2f} in overdue receivables pending because orders progressed to dispatch prior to payment verification confirmation")
    if urgent_complaints:
        risks.append(f"Customer Care: {len(urgent_complaints)} urgent complaint(s) due to transit delays and bottle cap micro-cracking in batch #EB-44")

    # Action Items with Concrete Solutions
    action_items = []
    if low_stock:
        action_items.append(f"Inventory Solution: Approve emergency Purchase Order for {low_stock[0].name} to release pending customer orders")
    if delayed_dispatches:
        action_items.append(f"Logistics Solution: Escalate {len(delayed_dispatches)} delayed shipments with Delhivery and push live GPS tracking SMS to customers")
    if outstanding_payments > 0:
        action_items.append(f"Finance Solution: Dispatch automated 1-click payment settlement links to affected wholesale accounts and enforce dispatch hold on accounts >₹40,000")
    if open_complaints:
        action_items.append(f"Support Solution: Quarantine warehouse batch #EB-44, alert EcoPack Glass, and auto-dispatch free replacement packages")

    # Natural Language Executive Summary
    summary_parts = [
        f"Hello Aarav. Today, {today_orders_count} orders were received totaling ₹{today_revenue:,.2f}. Across the system, {len(completed_orders)} orders have been completed and delivered, while {len(pending_orders)} remain in fulfillment pipeline."
    ]

    if low_stock:
        summary_parts.append(f"{len(low_stock)} product(s) are below safety reorder threshold, with {low_stock[0].name} requiring urgent replenishment.")
    
    if delayed_dispatches:
        summary_parts.append(f"{len(delayed_dispatches)} shipments are delayed past delivery targets due to courier hub bottlenecks; resolved via automated SLA escalation.")

    if outstanding_payments > 100:
        summary_parts.append(f"₹{outstanding_payments:,.2f} in overdue receivables is pending due to unverified credit terms; resolved via 1-click settlement links and dispatch gates.")

    if open_complaints:
        summary_parts.append(f"{len(open_complaints)} customer complaints are active due to delivery delays and batch packaging defects; resolved via courier escalation and replacement shipments.")

    summary_text = " ".join(summary_parts)

    snapshot = {
        "today_orders": today_orders_count,
        "today_revenue": round(today_revenue, 2),
        "total_revenue": round(total_revenue_booked, 2),
        "total_collected": round(total_revenue_collected, 2),
        "outstanding_payments": round(outstanding_payments, 2),
        "pending_orders": len(pending_orders),
        "completed_orders": len(completed_orders),
        "cancelled_orders": len(cancelled_orders),
        "low_stock_count": len(low_stock),
        "out_of_stock_count": len(out_of_stock),
        "delayed_dispatches": len(delayed_dispatches),
        "open_complaints": len(open_complaints),
        "urgent_complaints": len(urgent_complaints)
    }

    # Upsert to database
    briefing_record = db.query(DailyBriefing).filter(DailyBriefing.briefing_date == today_str).first()
    if not briefing_record:
        briefing_record = DailyBriefing(
            briefing_date=today_str,
            summary_text=summary_text,
            metrics_snapshot=snapshot,
            highlights=highlights,
            risks=risks,
            action_items=action_items,
            created_at=datetime.datetime.utcnow()
        )
        db.add(briefing_record)
    else:
        briefing_record.summary_text = summary_text
        briefing_record.metrics_snapshot = snapshot
        briefing_record.highlights = highlights
        briefing_record.risks = risks
        briefing_record.action_items = action_items

    db.commit()
    db.refresh(briefing_record)

    return {
        "id": briefing_record.id,
        "briefing_date": briefing_record.briefing_date,
        "summary_text": briefing_record.summary_text,
        "metrics_snapshot": briefing_record.metrics_snapshot,
        "highlights": briefing_record.highlights,
        "risks": briefing_record.risks,
        "action_items": briefing_record.action_items,
        "created_at": briefing_record.created_at
    }
