import sys
import json
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000"

def get(path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def post(path, payload):
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

print("=== 1. Checking Proactive Greeting ===")
greeting = get("/api/voice/proactive-greeting")
print("Spoken Greeting:", greeting["spoken_greeting"])
print("Suggested Prompts:", greeting["suggested_prompts"])

print("\n=== 2. Asking: 'Why are orders getting delayed?' ===")
turn1 = post("/api/voice/chat", {"message": "Why are orders getting delayed?", "session_id": "test_live"})
print("AI:", turn1["spoken_response"])

print("\n=== 3. Contextual Follow-Up: 'Which products?' ===")
turn2 = post("/api/voice/chat", {"message": "Which products?", "session_id": "test_live"})
print("AI:", turn2["spoken_response"])

print("\n=== 4. Proposing Voice Action: 'Create a reorder request' ===")
turn3 = post("/api/voice/chat", {"message": "Create a reorder request", "session_id": "test_live"})
print("AI:", turn3["spoken_response"])
print("Pending Action:", turn3.get("pending_action"))

print("\n=== 5. Spoken Confirmation: 'Yes, submit it' ===")
turn4 = post("/api/voice/confirm", {"confirm": True, "session_id": "test_live"})
print("AI:", turn4["spoken_response"])
print("Action Executed:", turn4.get("action_executed"))

print("\n=== 6. Checking Audit Logs & Purchase Orders ===")
pos = get("/api/suppliers/purchase-orders")
print(f"Total Purchase Orders in DB: {len(pos)}")
latest_po = pos[0] if pos else None
if latest_po:
    print(f"Latest PO: #{latest_po.get('po_number')} - Status: {latest_po.get('status')} - Units: {latest_po.get('quantity_ordered')} - Total: Rs {latest_po.get('total_cost')}")

print("\nALL LIVE TESTS COMPLETED SUCCESSFULLY!")
