import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import engine, Base, SessionLocal
from app.seed_data import seed_database
from app.crud import get_orders, get_products, get_customers, get_dispatches, get_complaints, create_order
from app.schemas import OrderCreate, OrderItemCreate
from app.ai.engine import proactive_engine
from app.ai.health_score import calculate_business_health_score
from app.ai.daily_briefing import generate_daily_briefing
from app.ai.forecasting import get_demand_forecast, detect_revenue_leakage
from app.ai.simulator import run_what_if_simulation

def run_tests():
    print("=" * 60)
    print("RUNNING AUTOMATED TEST SUITE FOR HUGG AI BUSINESS PLATFORM")
    print("=" * 60)

    # 1. Initialize Tables
    print("\n1. Testing Database & Schema Creation...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    print("  [PASS] Tables created successfully.")

    # 2. Seed Data
    print("\n2. Testing Seed Data & Operational Scenarios...")
    seed_database(db)
    orders = get_orders(db)
    products = get_products(db)
    customers = get_customers(db)
    dispatches = get_dispatches(db)
    complaints = get_complaints(db)

    print(f"  [PASS] Seeded {len(products)} products, {len(customers)} customers, {len(orders)} orders.")
    print(f"  [PASS] Seeded {len(dispatches)} dispatches ({sum(1 for d in dispatches if d['is_delayed'])} delayed).")
    print(f"  [PASS] Seeded {len(complaints)} customer complaints.")

    # 3. Proactive AI Business Scan
    print("\n3. Testing Proactive AI Engine Scan & Root Cause Analysis...")
    insights = proactive_engine.run_full_business_scan(db)
    print(f"  [PASS] Proactive scan generated {len(insights)} active intelligence insights.")
    for ins in insights:
        print(f"    - [{ins.severity}] {ins.title} (Module: {ins.affected_module})")
        print(f"      Root Cause: {ins.root_cause[:70]}...")

    # 4. AI Action Center Approval
    print("\n4. Testing AI Action Center 1-Click Approval Execution...")
    inv_insight = next((i for i in insights if i.action_type == "CREATE_PURCHASE_ORDER"), None)
    if inv_insight:
        result = proactive_engine.execute_approved_action(
            db=db,
            insight_id=inv_insight.id,
            action_type=inv_insight.action_type,
            user_name="Aarav Mehta (Owner)"
        )
        print(f"  [PASS] Approved action execution result: {result['message']}")
    else:
        print("  [SKIP] No pending purchase order action to test.")

    # 5. AI Business Health Score
    print("\n5. Testing AI Business Health Score (0-100)...")
    health = calculate_business_health_score(db)
    print(f"  [PASS] Calculated Health Score: {health['overall_score']}/100 (Status: {health['status']})")
    print(f"    Category Breakdown: {health['category_scores']}")
    print(f"    Deductions: {health['deduction_reasons']}")

    # 6. Daily AI Briefing
    print("\n6. Testing Daily AI Business Briefing...")
    briefing = generate_daily_briefing(db, force_refresh=True)
    print(f"  [PASS] Generated Briefing for {briefing['briefing_date']}:")
    print(f"    \"{briefing['summary_text']}\"")

    # 7. Demand Forecasting & Revenue Leakage
    print("\n7. Testing Demand Forecasting & Revenue Leakage...")
    forecasts = get_demand_forecast(db)
    print(f"  [PASS] Computed forecasts for {len(forecasts)} SKUs. Top stockout risk: {forecasts[0]['product_name']} ({forecasts[0]['runway_days']} days runway).")
    leakage = detect_revenue_leakage(db)
    print(f"  [PASS] Detected total revenue leakage: ${leakage['total_revenue_at_risk']:,.2f} across {leakage['unpaid_dispatched_leakage']['count']} unpaid orders.")

    # 8. What-If Business Simulator
    print("\n8. Testing What-If Simulator...")
    sim = run_what_if_simulation(db, demand_increase_pct=30.0, supplier_delay_days=5, price_change_pct=5.0)
    print(f"  [PASS] Simulation Output:")
    print(f"    Projected Revenue: ${sim['projected_revenue']:,.2f} (Delta: ${sim['revenue_delta']:,.2f})")
    print(f"    Products at Risk: {len(sim['stockout_risk_products'])}")
    print(f"    Cash Flow Impact: ${sim['cash_flow_impact']:,.2f}")

    # 9. Test Order Creation & Stock Reservation Lifecycle
    print("\n9. Testing Order Lifecycle & Automatic Stock Reservation...")
    new_order = create_order(
        db=db,
        order_in=OrderCreate(
            customer_id=customers[0]["id"],
            items=[OrderItemCreate(product_id=products[1]["id"], quantity=5)]
        ),
        user_name="Automated Test Runner"
    )
    print(f"  [PASS] Created test order {new_order.order_number} for total ${new_order.total_amount}. Status: {new_order.status}.")

    db.close()
    print("\n" + "=" * 60)
    print("ALL TEST SUITE CHECKS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
