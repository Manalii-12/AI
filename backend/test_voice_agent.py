import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from fastapi.testclient import TestClient
from app.main import app

def test_voice_agent_dialogues():
    client = TestClient(app)
    print("=" * 70)
    print("TESTING VOICE-FIRST AI ASSISTANT CONVERSATION & ACTIONS")
    print("=" * 70)

    session_id = "test_owner_session"

    # Conversation Turn 1: Daily Report
    print("\n[Turn 1] Owner: 'Good morning. Give me today's business report.'")
    r1 = client.post("/api/voice/chat", json={"message": "Good morning. Give me today's business report.", "session_id": session_id})
    assert r1.status_code == 200, f"Error: {r1.text}"
    d1 = r1.json()
    print(f"Assistant: \"{d1['spoken_response']}\"")
    assert "orders" in d1["spoken_response"].lower()

    # Conversation Turn 2: Delayed orders root cause
    print("\n[Turn 2] Owner: 'Why are orders getting delayed?'")
    r2 = client.post("/api/voice/chat", json={"message": "Why are orders getting delayed?", "session_id": session_id})
    assert r2.status_code == 200
    d2 = r2.json()
    print(f"Assistant: \"{d2['spoken_response']}\"")
    assert "delayed" in d2["spoken_response"].lower()

    # Conversation Turn 3: Contextual Follow-up "Which products?"
    print("\n[Turn 3] Owner: 'Which products?' (Contextual Follow-up)")
    r3 = client.post("/api/voice/chat", json={"message": "Which products?", "session_id": session_id})
    assert r3.status_code == 200
    d3 = r3.json()
    print(f"Assistant: \"{d3['spoken_response']}\"")
    assert "Hugg" in d3["spoken_response"] or "units" in d3["spoken_response"]

    # Conversation Turn 4: Payments
    print("\n[Turn 4] Owner: 'How much money are we supposed to receive?'")
    r4 = client.post("/api/voice/chat", json={"message": "How much money are we supposed to receive?", "session_id": session_id})
    assert r4.status_code == 200
    d4 = r4.json()
    print(f"Assistant: \"{d4['spoken_response']}\"")
    assert "pending" in d4["spoken_response"].lower()

    # Conversation Turn 5: Highest pending payment
    print("\n[Turn 5] Owner: 'Show me the highest pending payment.'")
    r5 = client.post("/api/voice/chat", json={"message": "Show me the highest pending payment.", "session_id": session_id})
    assert r5.status_code == 200
    d5 = r5.json()
    print(f"Assistant: \"{d5['spoken_response']}\"")
    assert "HUG-" in d5["spoken_response"]

    # Conversation Turn 6: Voice-Controlled Action Proposal: "Create a reorder request."
    print("\n[Turn 6] Owner: 'Create a reorder request.' (Voice Action Proposal)")
    r6 = client.post("/api/voice/chat", json={"message": "Create a reorder request.", "session_id": session_id})
    assert r6.status_code == 200
    d6 = r6.json()
    print(f"Assistant: \"{d6['spoken_response']}\"")
    assert d6["action_state"] == "AWAITING_CONFIRMATION", f"Expected AWAITING_CONFIRMATION, got {d6['action_state']}"
    assert "Should I submit it?" in d6["spoken_response"] or "confirm" in d6["spoken_response"].lower()

    # Conversation Turn 7: Voice Confirmation: "Yes, submit it."
    print("\n[Turn 7] Owner: 'Yes, submit it.' (Voice Confirmation)")
    r7 = client.post("/api/voice/chat", json={"message": "Yes, submit it.", "session_id": session_id})
    assert r7.status_code == 200
    d7 = r7.json()
    print(f"Assistant: \"{d7['spoken_response']}\"")
    assert d7["action_state"] == "EXECUTED", f"Expected EXECUTED, got {d7['action_state']}"
    assert "PO-" in d7["spoken_response"] or "created" in d7["spoken_response"].lower()

    # Conversation Turn 8: Urgent complaints
    print("\n[Turn 8] Owner: 'What are our urgent complaints?'")
    r8 = client.post("/api/voice/chat", json={"message": "What are our urgent complaints?", "session_id": session_id})
    assert r8.status_code == 200
    d8 = r8.json()
    print(f"Assistant: \"{d8['spoken_response']}\"")
    assert "complaint" in d8["spoken_response"].lower()

    # Conversation Turn 9: Executive priorities
    print("\n[Turn 9] Owner: 'What should I focus on today?'")
    r9 = client.post("/api/voice/chat", json={"message": "What should I focus on today?", "session_id": session_id})
    assert r9.status_code == 200
    d9 = r9.json()
    print(f"Assistant: \"{d9['spoken_response']}\"")

    # Conversation Turn 10: Order Lookup
    print("\n[Turn 10] Owner: 'Find order HUG-1003'")
    r10 = client.post("/api/voice/chat", json={"message": "Find order HUG-1003", "session_id": session_id})
    assert r10.status_code == 200
    d10 = r10.json()
    print(f"Assistant: \"{d10['spoken_response']}\"")
    assert "HUG-1003" in d10["spoken_response"]

    print("\n" + "=" * 70)
    print("ALL 10 VOICE-FIRST CONVERSATIONAL & ACTION WORKFLOWS PASSED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    test_voice_agent_dialogues()
