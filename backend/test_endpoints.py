import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app

def test_all_api_endpoints():
    client = TestClient(app)
    print("Testing API endpoints via TestClient...")

    # 1. Health
    r = client.get("/api/health")
    assert r.status_code == 200, f"Healthcheck failed: {r.text}"
    print("  [PASS] GET /api/health")

    # 2. Dashboard metrics
    r = client.get("/api/dashboard/metrics?range=30d")
    assert r.status_code == 200, f"Dashboard metrics failed: {r.text}"
    data = r.json()
    assert "metrics" in data and "revenue_trends" in data
    print(f"  [PASS] GET /api/dashboard/metrics (Revenue: ${data['metrics']['total_revenue']:,.2f})")

    # 3. Orders
    r = client.get("/api/orders")
    assert r.status_code == 200, f"Orders failed: {r.text}"
    orders = r.json()
    assert len(orders) > 0
    print(f"  [PASS] GET /api/orders ({len(orders)} orders found)")

    # 4. Customers
    r = client.get("/api/customers")
    assert r.status_code == 200, f"Customers failed: {r.text}"
    custs = r.json()
    assert len(custs) > 0
    print(f"  [PASS] GET /api/customers ({len(custs)} customers found)")

    # 5. Inventory
    r = client.get("/api/inventory/products")
    assert r.status_code == 200, f"Inventory failed: {r.text}"
    prods = r.json()
    assert len(prods) > 0
    print(f"  [PASS] GET /api/inventory/products ({len(prods)} products found)")

    # 6. Payments
    r = client.get("/api/payments")
    assert r.status_code == 200, f"Payments failed: {r.text}"
    payments = r.json()
    print(f"  [PASS] GET /api/payments ({len(payments)} payments found)")

    # 7. Dispatch
    r = client.get("/api/dispatch")
    assert r.status_code == 200, f"Dispatch failed: {r.text}"
    dispatches = r.json()
    print(f"  [PASS] GET /api/dispatch ({len(dispatches)} dispatches found)")

    # 8. Complaints
    r = client.get("/api/complaints")
    assert r.status_code == 200, f"Complaints failed: {r.text}"
    complaints = r.json()
    print(f"  [PASS] GET /api/complaints ({len(complaints)} complaints found)")

    # 9. Suppliers
    r = client.get("/api/suppliers")
    assert r.status_code == 200, f"Suppliers failed: {r.text}"
    suppliers = r.json()
    print(f"  [PASS] GET /api/suppliers ({len(suppliers)} suppliers found)")

    # 10. AI Insights
    r = client.get("/api/ai/insights")
    assert r.status_code == 200, f"AI insights failed: {r.text}"
    insights = r.json()
    print(f"  [PASS] GET /api/ai/insights ({len(insights)} insights found)")

    # 11. AI Health Score
    r = client.get("/api/ai/health-score")
    assert r.status_code == 200, f"Health score failed: {r.text}"
    health = r.json()
    print(f"  [PASS] GET /api/ai/health-score (Score: {health['overall_score']}/100)")

    # 12. AI Daily Briefing
    r = client.get("/api/ai/daily-briefing")
    assert r.status_code == 200, f"Daily briefing failed: {r.text}"
    briefing = r.json()
    print(f"  [PASS] GET /api/ai/daily-briefing")

    # 13. What-If Simulator
    r = client.post("/api/ai/simulate", json={"demand_increase_pct": 25.0, "supplier_delay_days": 4, "price_change_pct": 5.0})
    assert r.status_code == 200, f"Simulator failed: {r.text}"
    sim = r.json()
    print(f"  [PASS] POST /api/ai/simulate (Projected Rev: ${sim['projected_revenue']:,.2f})")

    # 14. Employees & Audit Logs
    r = client.get("/api/employees")
    assert r.status_code == 200
    r_logs = client.get("/api/audit-logs")
    assert r_logs.status_code == 200
    print("  [PASS] GET /api/employees & GET /api/audit-logs")

    print("\nALL API ENDPOINTS TESTED AND VALIDATED SUCCESSFULLY!")

if __name__ == "__main__":
    test_all_api_endpoints()
