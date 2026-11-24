import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Product, Order, OrderItem

def run_what_if_simulation(
    db: Session,
    demand_increase_pct: float = 0.0,
    supplier_delay_days: int = 0,
    price_change_pct: float = 0.0
) -> dict:
    """
    Simulates operational & financial ripple effects based on actual historical baseline metrics.
    Assumptions:
    - Baseline 30-day run rate calculated from completed orders.
    - Price elasticity: For beverages, price elasticity is approximated at -1.1 (a 5% price increase drops unit demand by ~5.5%).
    - Supplier delay: Pushes out replenishment arrivals, causing stockouts on products with runway < (lead_time + delay_days).
    """
    now = datetime.datetime.utcnow()
    thirty_days_ago = now - datetime.timedelta(days=30)

    # Baseline 30-day numbers
    all_orders = db.query(Order).filter(
        Order.order_date >= thirty_days_ago,
        Order.status != "Cancelled"
    ).all()

    baseline_revenue = sum(o.total_amount for o in all_orders) or 10000.0
    baseline_units_sold = db.query(func.sum(OrderItem.quantity)).join(Order).filter(
        Order.order_date >= thirty_days_ago,
        Order.status != "Cancelled"
    ).scalar() or 200

    products = db.query(Product).all()

    # Calculate elasticity-adjusted demand factor
    # Price elasticity of beverage goods roughly -1.1
    elasticity = -1.1
    price_demand_impact = (price_change_pct * elasticity) / 100.0 # e.g. +5% price -> -5.5% volume
    net_volume_multiplier = 1.0 + (demand_increase_pct / 100.0) + price_demand_impact
    net_volume_multiplier = max(0.2, net_volume_multiplier)

    # Price factor
    price_multiplier = 1.0 + (price_change_pct / 100.0)

    # Projected revenue
    projected_units = baseline_units_sold * net_volume_multiplier
    projected_revenue = baseline_revenue * net_volume_multiplier * price_multiplier
    revenue_delta = projected_revenue - baseline_revenue

    # Margin calculation: Average gross margin = (Revenue - COGS) / Revenue
    avg_cogs_ratio = 0.42 # ~42% average production cost for cold-fill beverages
    projected_margin = ((projected_revenue - (projected_units * 3.5 * avg_cogs_ratio)) / projected_revenue) * 100 if projected_revenue > 0 else 0

    # Stockout risk analysis under simulated conditions
    stockout_products = []
    total_delayed_orders_estimate = 0

    for p in products:
        baseline_daily = max(0.5, (p.sales_velocity_30d if hasattr(p, 'sales_velocity_30d') else 15) / 30.0)
        simulated_daily = baseline_daily * net_volume_multiplier
        available = max(0, p.stock_quantity - p.reserved_stock)
        
        simulated_runway_days = int(available / simulated_daily) if simulated_daily > 0 else 999
        effective_lead_time = (p.supplier.lead_time_days if p.supplier else 5) + supplier_delay_days

        if simulated_runway_days < effective_lead_time:
            days_short = effective_lead_time - simulated_runway_days
            units_short = int(days_short * simulated_daily)
            stockout_products.append({
                "sku": p.sku,
                "name": p.name,
                "available_stock": available,
                "simulated_runway_days": simulated_runway_days,
                "effective_lead_time_days": effective_lead_time,
                "estimated_units_shortage": max(10, units_short),
                "recommended_buffer_order": max(p.reorder_quantity, int(effective_lead_time * simulated_daily * 1.5))
            })
            total_delayed_orders_estimate += max(1, int(units_short / 4))

    # Cash flow impact: Extra working capital needed to fund higher inventory
    extra_inventory_cost = sum(sp["recommended_buffer_order"] * 3.5 for sp in stockout_products)

    # Generate narrative
    assumptions_applied = [
        f"Baseline 30-day revenue: ${baseline_revenue:,.2f} ({baseline_units_sold} units sold)",
        f"Simulated demand volume shift: {demand_increase_pct:+.1f}% organic demand change",
        f"Price elasticity multiplier: {price_demand_impact*100:+.1f}% volume response to {price_change_pct:+.1f}% price move",
        f"Supplier lead time shock: +{supplier_delay_days} day(s) transit/production delay added across supply chain"
    ]

    strategic_recs = []
    if stockout_products:
        strategic_recs.append(f"Pre-order {sum(sp['recommended_buffer_order'] for sp in stockout_products)} additional units across {len(stockout_products)} vulnerable SKUs before the supplier delay window begins.")
    if revenue_delta > 0:
        strategic_recs.append(f"Net top-line revenue expected to rise by ${revenue_delta:,.2f}; allocate 20% to shipping contingency reserves.")
    else:
        strategic_recs.append(f"Net top-line revenue expected to decrease by ${abs(revenue_delta):,.2f}; consider bundled promotions to protect margin.")
    if supplier_delay_days > 3:
        strategic_recs.append(f"Activate secondary backup supplier or pre-alert key wholesale accounts about potential dispatch lead times.")

    return {
        "scenario": f"Demand: {demand_increase_pct:+}% | Supplier Delay: +{supplier_delay_days}d | Price: {price_change_pct:+}%",
        "baseline_revenue": round(baseline_revenue, 2),
        "projected_revenue": round(projected_revenue, 2),
        "revenue_delta": round(revenue_delta, 2),
        "projected_margin": round(projected_margin, 1),
        "stockout_risk_products": stockout_products,
        "orders_delayed_count": total_delayed_orders_estimate,
        "cash_flow_impact": round(extra_inventory_cost, 2),
        "assumptions_applied": assumptions_applied,
        "strategic_recommendations": strategic_recs
    }
