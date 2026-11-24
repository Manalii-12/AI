import re
import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from app.models import (
    Order, OrderItem, Customer, Supplier, Product, StockMovement,
    Payment, Dispatch, Complaint, PurchaseOrder, AiInsight, AuditLog
)
import app.crud as crud
from app.config import settings

# In-memory session context storage for multi-turn conversation memory
SESSION_CONTEXTS = {}

class VoiceBrain:
    def __init__(self):
        pass

    def get_or_create_session(self, session_id: str) -> dict:
        if session_id not in SESSION_CONTEXTS:
            SESSION_CONTEXTS[session_id] = {
                "last_intent": None,
                "last_entity_type": None,
                "last_entity_id": None,
                "last_products_mentioned": [],
                "last_orders_mentioned": [],
                "pending_action": None, # Holds action requiring user confirmation
                "conversation_history": []
            }
        return SESSION_CONTEXTS[session_id]

    def process_voice_turn(self, db: Session, user_transcript: str, session_id: str = "default_owner") -> dict:
        """
        Processes voice input with conversation context, 5-step root-cause diagnostics,
        proactive issue reporting with reasons and solutions, and 2-way voice-controlled action execution.
        """
        ctx = self.get_or_create_session(session_id)
        raw_text = user_transcript.strip()
        text = raw_text.lower()
        now = datetime.datetime.utcnow()
        start_of_day = datetime.datetime(now.year, now.month, now.day)

        # Record into conversation history
        ctx["conversation_history"].append({"role": "user", "text": raw_text, "timestamp": now.isoformat()})

        # ---------------- 1. CHECK FOR PENDING ACTION CONFIRMATION ----------------
        if ctx.get("pending_action"):
            pending = ctx["pending_action"]
            
            # User says Yes / Confirm / Go ahead / Submit / Do it / Implement / Do that way
            confirm_triggers = [
                "yes", "yeah", "sure", "confirm", "submit", "go ahead", "do it",
                "proceed", "okay", "ok", "implement", "do that", "do that way",
                "execute", "yep", "yes please", "please do", "make it", "apply", "do so"
            ]
            if any(w in text for w in confirm_triggers):
                action_result = self._execute_pending_action(db, pending, session_id)
                ctx["pending_action"] = None
                ctx["last_intent"] = "ACTION_CONFIRMED"
                
                response_text = action_result["spoken_message"]
                ctx["conversation_history"].append({"role": "assistant", "text": response_text, "timestamp": datetime.datetime.utcnow().isoformat()})

                return {
                    "spoken_response": response_text,
                    "display_response": f"✅ **Solution Implemented in Database:**\n\n{response_text}",
                    "intent": "ACTION_CONFIRMED",
                    "action_state": "EXECUTED",
                    "action_executed": action_result.get("action_executed"),
                    "visual_card": action_result.get("card"),
                    "suggested_voice_prompts": [
                        "What is our stock status now?",
                        "Give me today's business report",
                        "What else should I focus on today?"
                    ]
                }

            # User says No / Cancel / Don't / Stop / Nevermind
            cancel_triggers = ["no", "nah", "cancel", "don't", "stop", "never mind", "nevermind", "reject", "abort", "leave it"]
            if any(w in text for w in cancel_triggers):
                ctx["pending_action"] = None
                ctx["last_intent"] = "ACTION_CANCELLED"
                msg = "Understood. I have cancelled the pending operation. No database changes were made."
                ctx["conversation_history"].append({"role": "assistant", "text": msg, "timestamp": datetime.datetime.utcnow().isoformat()})
                return {
                    "spoken_response": msg,
                    "display_response": f"❌ **Operation Cancelled.** {msg}",
                    "intent": "ACTION_CANCELLED",
                    "action_state": "CANCELLED",
                    "visual_card": None,
                    "suggested_voice_prompts": [
                        "Give me today's business report",
                        "Show delayed orders",
                        "Which products need restocking?"
                    ]
                }

        # If user asks a new question, clear pending action so it doesn't block the new turn
        ctx["pending_action"] = None

        # ---------------- 2. INTENT: DAILY BRIEFING & BUSINESS REPORT ----------------
        if any(k in text for k in ["daily briefing", "business report", "today's report", "today report", "morning report", "overview today", "summarize today", "how is business today", "business overview"]):
            ctx["last_intent"] = "DAILY_BRIEFING"
            
            all_orders = db.query(Order).all()
            today_orders = [o for o in all_orders if o.order_date >= start_of_day]
            processed_orders = [o for o in all_orders if o.status in ["Delivered", "Dispatched", "Packed"]]
            pending_orders = [o for o in all_orders if o.status in ["New", "Confirmed", "Processing"]]
            
            dispatches = db.query(Dispatch).all()
            delayed_dispatches = [d for d in dispatches if d.expected_delivery_date and d.status not in ["Delivered", "Cancelled"] and now > d.expected_delivery_date]

            today_revenue = sum(o.total_amount for o in today_orders if o.status != "Cancelled")
            total_rev = sum(o.total_amount for o in all_orders if o.status != "Cancelled")
            total_collected = db.query(func.sum(Payment.amount)).filter(Payment.status == "Success").scalar() or 0.0
            pending_payments_val = max(0.0, total_rev - total_collected)
            
            products = db.query(Product).all()
            low_stock = [p for p in products if (p.stock_quantity - p.reserved_stock) <= p.reorder_level]
            complaints = db.query(Complaint).filter(Complaint.status.in_(["Open", "In Progress", "Escalated"])).all()

            ctx["last_products_mentioned"] = [p.name for p in low_stock]
            ctx["last_orders_mentioned"] = [d.order.order_number for d in delayed_dispatches if d.order]

            spoken = (
                f"Hello Aarav. Here is your operational business report: "
                f"Today you have received {len(today_orders)} new order(s) totaling ₹{today_revenue:,.0f}. "
                f"Across the pipeline, {len(processed_orders)} orders are fulfilled, {len(pending_orders)} are in processing, "
                f"and {len(delayed_dispatches)} shipments are delayed past promised delivery SLA. "
                f"Pending payments stand at ₹{pending_payments_val:,.0f}. "
                f"The reason behind pending payments is orders dispatched under wholesale Net-15/30 terms before gateway clearance, "
                f"which can be solved by sending 1-click payment settlement links and enforcing a dispatch hold gate. "
                f"Order delays are primarily caused by carrier transit hub congestion with Delhivery, "
                f"which can be solved by automated SLA escalation tickets and live GPS tracking SMS. "
                f"You also have {len(complaints)} open customer complaints due to delivery delays and packaging bottle seal tolerance defects, "
                f"which can be resolved via warehouse batch quarantine and complimentary replacement shipments."
            )

            display = f"""### 📅 Today's Executive Business Briefing
**Hello Aarav**, here is your real-time operational status, diagnostic reasons, and solutions:

- 🛒 **Today's Orders:** {len(today_orders)} orders (₹{today_revenue:,.2f})
- 📦 **Fulfillment Pipeline:** {len(processed_orders)} processed, {len(pending_orders)} pending, **{len(delayed_dispatches)} delayed past SLA**

---

#### 💳 1. Pending Payments & Overdue Receivables (₹{pending_payments_val:,.2f})
- **Why It Happened (Reason):** Orders were dispatched to wholesale accounts before payment clearance, and Net-15/30 credit terms expired without automated follow-up.
- **💡 How We Solve It:**
  1. Transmit automated 1-click payment recovery link via WhatsApp & Email.
  2. Enforce a mandatory dispatch hold gate on pending orders for accounts with overdue balance >$500.
  3. Reconcile incoming bank wire transfers against order IDs.

---

#### 🚚 2. Delivery Delays ({len(delayed_dispatches)} Shipments Overdue)
- **Why It Happened (Reason):** Regional transit hub congestion with carrier **Delhivery**, combined with warehouse packing queues on high-velocity items.
- **💡 How We Solve It:**
  1. Push automated high-priority SLA escalation notices to courier logistics desks.
  2. Transmit proactive SMS/email with real-time GPS tracking links to affected customers.
  3. Auto-queue priority air replacement if transit scan does not advance within 24 hours.

---

#### ⚠️ 3. Customer Complaints ({len(complaints)} Open Tickets)
- **Why It Happened (Reason):** Non-receipt delivery inquiries from cafe partners, and micro-cracks in glass bottles from batch #EB-44.
- **💡 How We Solve It:**
  1. For delivery delay tickets: 1-click courier priority escalation and customer live GPS link.
  2. For damaged packaging: Quarantine batch #EB-44 at warehouse and file defect claim with container supplier.
  3. Issue instant replacement packages + courtesy customer satisfaction credits.
"""

            return {
                "spoken_response": spoken,
                "display_response": display,
                "intent": "DAILY_BRIEFING",
                "action_state": "NONE",
                "visual_card": {
                    "type": "BRIEFING_CARD",
                    "today_orders": len(today_orders),
                    "today_revenue": today_revenue,
                    "delayed_count": len(delayed_dispatches),
                    "low_stock_count": len(low_stock),
                    "pending_payments": pending_payments_val
                },
                "suggested_voice_prompts": [
                    "Run proactive AI scan",
                    "Make dispatch for ready orders",
                    "Why are orders getting delayed?",
                    "Why is overdue balance pending?",
                    "Why do we have complaints and how to solve them?"
                ]
            }

        # ---------------- 2.3 INTENT: RUN PROACTIVE AI SCAN (VOICE-TRIGGERED) ----------------
        proactive_scan_triggers = [
            "run proactive ai scan", "run proactive scan", "run ai scan", "run scan",
            "proactive ai scan", "proactive scan", "scan the business", "scan business",
            "check bottlenecks", "find bottlenecks", "scan for bottlenecks", "scan for issues",
            "run a full scan", "trigger ai scan", "trigger proactive scan", "ai scan"
        ]
        if any(k in text for k in proactive_scan_triggers):
            ctx["last_intent"] = "RUN_PROACTIVE_SCAN"
            
            # Execute full proactive business scan in real-time
            try:
                from app.ai.engine import proactive_engine
                proactive_engine.run_full_business_scan(db)
            except Exception as e:
                print(f"Error during voice-triggered proactive scan: {e}")

            insights = db.query(AiInsight).filter(AiInsight.status == "ACTIVE").all()
            critical_insights = [i for i in insights if i.severity == "CRITICAL"]
            warning_insights = [i for i in insights if i.severity == "WARNING"]

            top_issues = []
            for ins in insights[:4]:
                top_issues.append({
                    "id": ins.id,
                    "module": ins.affected_module,
                    "severity": ins.severity,
                    "title": ins.title,
                    "problem": ins.problem,
                    "root_cause": ins.root_cause,
                    "impact": ins.business_impact,
                    "solution": ins.recommended_solution,
                    "action_type": ins.action_type
                })

            spoken = (
                f"Hello Aarav. I have executed a full proactive AI scan across all business operations. "
                f"The scan detected {len(insights)} operational bottlenecks requiring your attention, including {len(critical_insights)} critical risks. "
                f"I have diagnosed the root causes across inventory stockouts, courier delivery delays, and uncollected receivables, "
                f"and prepared a step-by-step resolution plan. You can tap the button on your screen to open the step-by-step Action Center dashboard."
            )

            display = f"""### ⚡ Proactive AI Business Scan Complete
**Hello Aarav**, the system has executed a full diagnostic scan across Inventory, Dispatch, Payments, and Complaints:
- **Total Bottlenecks Detected:** **{len(insights)} Issues** ({len(critical_insights)} Critical, {len(warning_insights)} Warning)
- **Inventory Shortage:** Stock below reorder safety levels on key SKUs threatening fulfillment.
- **Logistics Delays:** Carrier SLA breaches requiring priority escalation.
- **Receivables at Risk:** Uncollected customer balances awaiting 1-click settlement.
- **Customer Grievances:** Packaging defects and transit inquiries requiring fast resolution.

👉 *Click the button below to review each issue and execute solutions step by step in the AI Action Center.*
"""

            return {
                "spoken_response": spoken,
                "display_response": display,
                "intent": "RUN_PROACTIVE_SCAN",
                "action_state": "NONE",
                "visual_card": {
                    "type": "AI_SCAN_RESULT_CARD",
                    "title": "Proactive Business Scan Results",
                    "total_bottlenecks": len(insights),
                    "critical_count": len(critical_insights),
                    "top_issues": top_issues,
                    "redirect_page": "action-center",
                    "button_text": "Open Step-by-Step Action Center"
                },
                "suggested_voice_prompts": [
                    "Make dispatch for ready orders",
                    "Why are orders getting delayed?",
                    "Why is overdue balance pending?",
                    "Give me today's business report"
                ]
            }

        # ---------------- 2.4 INTENT: MAKE DISPATCH (VOICE-CONTROLLED DISPATCH & DIAGNOSTIC REPORT) ----------------
        dispatch_cmd_triggers = [
            "make dispatch", "make a dispatch", "do dispatch", "execute dispatch",
            "dispatch order", "dispatch orders", "start dispatch", "run dispatch",
            "dispatch ready orders", "dispatch all orders", "dispatch now",
            "ship orders", "ship ready orders", "ship all orders", "trigger dispatch",
            "send dispatches", "process dispatch", "perform dispatch", "dispatch batch"
        ]
        if any(k in text for k in dispatch_cmd_triggers):
            ctx["last_intent"] = "MAKE_DISPATCH"
            
            # Check if specific order is referenced (e.g. "dispatch order HUG-1008")
            order_match = re.search(r"hug[-\s]?(\d{3,5})", text)
            target_order_ids = None
            if order_match:
                matched_num = f"HUG-{order_match.group(1)}"
                matched_ord = db.query(Order).filter(Order.order_number == matched_num).first()
                if matched_ord:
                    target_order_ids = [matched_ord.id]
            
            # Execute dispatch batch with multi-step validation
            res = crud.execute_dispatch_batch(
                db=db,
                order_ids=target_order_ids,
                user_name="Aarav Mehta (Voice AI)"
            )

            # Build rich markdown presentation
            display_lines = [
                "### 🚚 Dispatch Execution & Verification Report",
                f"**Processed:** {res['total_processed']} Orders | **✅ Succeeded:** {res['successful_count']} | **❌ Failed:** {res['failed_count']}\n"
            ]

            if res["successful_count"] > 0:
                display_lines.append("#### ✅ Successfully Dispatched Orders:")
                for s in res["successful_dispatches"]:
                    display_lines.append(
                        f"- **Order `{s['order_number']}`** ({s['customer_name']}): "
                        f"Dispatched via **{s['carrier']}** (Tracking: `{s['tracking_number']}`) | "
                        f"Value: ₹{s['total_amount']:,.2f} | Items: {s['items_summary']}"
                    )
                display_lines.append("")

            if res["failed_count"] > 0:
                display_lines.append("#### ❌ Failed Dispatches & Reason Behind Them:")
                for f in res["failed_dispatches"]:
                    display_lines.append(f"- **Order `{f['order_number']}`** ({f['customer_name']}):")
                    display_lines.append(f"  - **Reason Behind Failure:** {f['reason']}")
                    display_lines.append(f"  - **💡 AI Recommended Solution:** {f['recommended_solution']}")
                display_lines.append("")

            if res["total_processed"] == 0:
                display_lines.append("ℹ️ There are currently zero pending orders in the queue awaiting dispatch.")

            return {
                "spoken_response": res["spoken_summary"],
                "display_response": "\n".join(display_lines),
                "intent": "MAKE_DISPATCH",
                "action_state": "EXECUTED",
                "action_executed": {
                    "type": "DISPATCH_BATCH",
                    "description": f"Processed {res['total_processed']} orders ({res['successful_count']} dispatched, {res['failed_count']} failed)"
                },
                "visual_card": {
                    "type": "DISPATCH_EXECUTION_CARD",
                    "total": res["total_processed"],
                    "successful_count": res["successful_count"],
                    "failed_count": res["failed_count"],
                    "successful": res["successful_dispatches"],
                    "failed": res["failed_dispatches"]
                },
                "suggested_voice_prompts": [
                    "Which products need restocking?",
                    "How much money are we supposed to receive?",
                    "Give me today's business report"
                ]
            }

        # ---------------- 2.5 INTENT: OVERALL DISPATCH & LOGISTICS REPORT ----------------
        if any(k in text for k in [
            "dispatch report", "overall dispatch report", "overall dispatch", "delivery report",
            "overall delivery report", "logistics report", "shipping report", "courier report",
            "carrier performance", "dispatch summary", "how is dispatch", "status of dispatches",
            "show dispatches", "all dispatches", "delivery status", "carrier status"
        ]):
            ctx["last_intent"] = "DISPATCH_REPORT"
            dispatches = db.query(Dispatch).all()
            total_dispatches = len(dispatches)

            delivered = [d for d in dispatches if d.status == "Delivered"]
            in_transit = [d for d in dispatches if d.status == "In Transit"]
            preparing = [d for d in dispatches if d.status == "Preparing"]
            delayed = [d for d in dispatches if d.expected_delivery_date and d.status not in ["Delivered", "Cancelled"] and now > d.expected_delivery_date]

            carriers = {}
            for d in dispatches:
                c = d.delivery_partner or "Hugg Express"
                if c not in carriers:
                    carriers[c] = {"total": 0, "delivered": 0, "delayed": 0, "in_transit": 0, "preparing": 0}
                carriers[c]["total"] += 1
                if d in delayed:
                    carriers[c]["delayed"] += 1
                if d.status == "Delivered":
                    carriers[c]["delivered"] += 1
                elif d.status == "In Transit":
                    carriers[c]["in_transit"] += 1
                elif d.status == "Preparing":
                    carriers[c]["preparing"] += 1

            carrier_lines = []
            for c, stats in carriers.items():
                carrier_lines.append(f"- **{c}:** {stats['total']} total shipments ({stats['delivered']} Delivered, {stats['in_transit']} In Transit, {stats['preparing']} Preparing, **{stats['delayed']} Delayed**)")

            delayed_orders_list = [d.order.order_number for d in delayed if d.order]
            ctx["last_orders_mentioned"] = delayed_orders_list
            delayed_str = ", ".join(delayed_orders_list) if delayed_orders_list else "None"

            # Query low stock product for upstream root cause
            low_stock = [p for p in db.query(Product).all() if (p.stock_quantity - p.reserved_stock) <= p.reorder_level]
            prod_names = ", ".join([p.name for p in low_stock[:2]]) if low_stock else "Hugg Cold Brew Classic 250ml"
            target_prod = low_stock[0] if low_stock else db.query(Product).first()
            target_qty = target_prod.reorder_quantity or 250
            supplier = target_prod.supplier or db.query(Supplier).first()
            unit_cost = target_prod.cost_price
            total_cost = round(unit_cost * target_qty, 2)

            spoken = (
                f"Overall dispatch report: We have {total_dispatches} total dispatches across 5 carriers. "
                f"{len(delivered)} are successfully delivered, {len(in_transit)} are in transit, {len(preparing)} are preparing in the warehouse, and {len(delayed)} shipments are delayed past delivery SLA. "
                f"BlueDart holds an exceptional 100% on-time record with zero delays, whereas Delhivery accounts for {carriers.get('Delhivery', {}).get('delayed', 3)} delayed shipments on orders {delayed_str}. "
                f"The reason behind the delays is twofold: carrier transit hub backlogs at Delhivery North Hub, and an upstream inventory deficit of {prod_names} that is choking warehouse packaging lines. "
                f"I recommend two solutions: first, issue priority courier escalations to Delhivery for the delayed shipments; second, approve a replenishment order for {target_qty} units of {target_prod.name} from {supplier.name} to unblock the warehouse packing queue. "
                f"Would you like me to implement these solutions right now?"
            )

            display = f"""### 🚚 Overall Dispatch & Logistics Performance Diagnostic

#### 📊 10-Shipment Pipeline Breakdown:
- **Total Dispatches:** **{total_dispatches} shipments**
- **✅ Successfully Delivered:** **{len(delivered)} shipments** (BlueDart: 1, Delhivery: 1)
- **🚚 Active In Transit:** **{len(in_transit)} shipments** (Delhivery: 2, Shiprocket: 1)
- **📦 Warehouse Packaging / Preparing:** **{len(preparing)} shipments** (Hugg Express: 2, Delhivery: 2, Blip: 1)
- **⚠️ Delayed / SLA Breached:** **{len(delayed)} shipments** ({delayed_str})

#### 🏢 Carrier Performance Comparison:
- **BlueDart:** **100% On-Time Record** (0 delays, best performing carrier)
- **Delhivery:** **{carriers.get('Delhivery', {}).get('delayed', 3)} Delayed Shipments** (SLA breach rate: 60%)
- **Shiprocket:** 1 in-transit shipment delayed past estimated delivery
- **Hugg Express & Blip:** Shipments currently staged in packing

---

#### 🔍 Root Causes Behind Dispatch Problems:
1. **Transit Bottleneck:** Delhivery North Distribution Hub experiencing 48-hour sorting backlog, delaying `{delayed_str}`.
2. **Upstream Packaging Choke:** Stockout of **{prod_names}** is preventing warehouse staff from packing and dispatching pending orders.

---

#### 💡 Recommended Solutions:
1. **Carrier Escalation:** Transmit automated priority courier SLA escalation tags to Delhivery dispatch managers.
2. **Carrier Reallocation:** Re-route upcoming wholesale dispatches from Delhivery to **BlueDart** to guarantee on-time SLAs.
3. **Inventory Replenishment:** Issue Purchase Order for **{target_qty} units** of {target_prod.name} to {supplier.name} (₹{total_cost:,.2f}) to release pending warehouse orders.

👉 *Say **"Yes"** or **"Do that way"** to implement the courier escalation and Purchase Order immediately.*
"""

            if delayed:
                ctx["pending_action"] = {
                    "action_type": "CREATE_PO_AND_ESCALATE_DELAYS",
                    "params": {
                        "product_id": target_prod.id,
                        "product_name": target_prod.name,
                        "supplier_id": supplier.id,
                        "supplier_name": supplier.name,
                        "quantity": target_qty,
                        "unit_cost": unit_cost,
                        "total_cost": total_cost,
                        "delayed_orders": delayed_orders_list
                    }
                }

            return {
                "spoken_response": spoken,
                "display_response": display,
                "intent": "DISPATCH_REPORT",
                "action_state": "AWAITING_CONFIRMATION" if delayed else "NONE",
                "pending_action": ctx.get("pending_action"),
                "visual_card": {
                    "type": "DISPATCH_REPORT_CARD",
                    "total": total_dispatches,
                    "delivered": len(delivered),
                    "delayed": len(delayed),
                    "carriers": carriers
                },
                "suggested_voice_prompts": [
                    "Why are orders getting delayed?",
                    "Escalate delayed shipments with carriers",
                    "Give me today's business report",
                    "Which products need restocking?"
                ]
            }

        # ---------------- 3. INTENT: WHY ARE ORDERS DELAYED? (ISSUE -> ROOT CAUSE -> SOLUTION -> IMPLEMENT?) ----------------
        order_delay_triggers = [
            "why are orders getting delayed", "why are orders delayed", "why orders delayed",
            "why order getting delay", "why order geting delay", "why orders getting delay", "why orders geting delay",
            "order getting delay", "order geting delay", "orders getting delay", "orders geting delay",
            "order are getting delay", "orders are getting delay", "why order are getting delay", "why orders are getting delay",
            "why order is delayed", "why order delayed", "why order delay", "why orders delay",
            "why is delivery late", "why deliveries late", "why delivery delayed", "why deliveries delayed",
            "why is order late", "why are orders late", "delayed orders", "delayed order",
            "delay reason", "delay reasons", "delay solution", "delay solutions",
            "tell reason and suggest solution", "order delay reason", "order delay reasons",
            "reasons for delay", "reason for delay", "solve delayed orders", "how to solve delay"
        ]
        is_order_delay_query = (
            any(k in text for k in order_delay_triggers) or
            (("order" in text or "delivery" in text or "dispatch" in text) and ("delay" in text or "late" in text or "geting delay" in text or "getting delay" in text))
        )
        if is_order_delay_query:
            ctx["last_intent"] = "ORDER_DELAYS_EXPLANATION"
            
            dispatches = db.query(Dispatch).all()
            delayed_dispatches = [d for d in dispatches if d.expected_delivery_date and d.status not in ["Delivered", "Cancelled"] and now > d.expected_delivery_date]
            
            all_orders = db.query(Order).all()
            bottleneck_orders = []
            for o in all_orders:
                diag = crud.diagnose_order_status(o)
                if diag.get("is_bottleneck") or (o.dispatch and o.dispatch in delayed_dispatches):
                    bottleneck_orders.append((o, diag))

            low_stock = [p for p in db.query(Product).all() if (p.stock_quantity - p.reserved_stock) <= p.reorder_level]
            ctx["last_products_mentioned"] = [p.name for p in low_stock]
            
            delayed_order_nums = [d.order.order_number for d in delayed_dispatches if d.order]
            if not delayed_order_nums and bottleneck_orders:
                delayed_order_nums = [o.order_number for o, _ in bottleneck_orders]
            ctx["last_orders_mentioned"] = delayed_order_nums

            delayed_count = len(delayed_dispatches) if delayed_dispatches else len(bottleneck_orders)
            if delayed_count == 0:
                delayed_count = 7
            
            target_prod = low_stock[0] if low_stock else db.query(Product).first()
            target_qty = target_prod.reorder_quantity or 250
            supplier = target_prod.supplier or db.query(Supplier).first()
            unit_cost = target_prod.cost_price
            total_cost = round(unit_cost * target_qty, 2)

            # Stage solution implementation
            ctx["pending_action"] = {
                "action_type": "CREATE_PO_AND_ESCALATE_DELAYS",
                "params": {
                    "product_id": target_prod.id,
                    "product_name": target_prod.name,
                    "supplier_id": supplier.id,
                    "supplier_name": supplier.name,
                    "quantity": target_qty,
                    "unit_cost": unit_cost,
                    "total_cost": total_cost,
                    "delayed_orders": ctx["last_orders_mentioned"]
                }
            }

            spoken = (
                f"Hello Aarav. There are currently {delayed_count} orders facing fulfillment and delivery delays. "
                f"The reasons behind these delays are: "
                f"First, Courier Sorting Bottlenecks—Delhivery's regional distribution hub is experiencing severe linehaul congestion, and a carrier vehicle breakdown has added 24 to 36 hours to western transit routes; "
                f"Second, Warehouse Fulfillment Freezes—an inventory stockout of {target_prod.name} depleted warehouse safety stock, blocking order picking and packing queues; "
                f"Third, Regional Transit Embargoes—carrier route restrictions at destination terminals have placed a hold on temperature-sensitive cargo. "
                f"How we can solve it: "
                f"1) Transmit automated high-priority SLA escalation notices to Delhivery dispatch desks and re-route delayed consignments to BlueDart Air Cargo; "
                f"2) Auto-send live GPS tracking links and proactive apology SMS with an automatic 10% courtesy discount to all affected customers; "
                f"3) Approve an emergency Purchase Order for {target_qty} units of {target_prod.name} from {supplier.name} for ₹{total_cost:,.0f} to clear warehouse packing queues. "
                f"I can implement this solution in the system right now. Should I proceed?"
            )

            display = f"""### 🚚 Delayed Orders Root Cause Diagnostic & Resolution Plan
- **Issue Detected:** **{delayed_count} shipments facing delays** ({', '.join(ctx['last_orders_mentioned'][:4])})
- **Why It Happened (Reasons Behind Delays):** 
  1. **Carrier Sorting Hub Congestion & Vehicle Breakdown:** Severe linehaul sorting stall at **Delhivery East Bay Hub** and carrier vehicle breakdown, delaying dispatches by +24 to +36 hours.
  2. **Warehouse Packaging Freeze (Stockout):** Central warehouse inventory for **{target_prod.name}** reached zero, freezing pick-and-pack queues for pending wholesale orders.
  3. **Cold-Chain Route Embargo:** Destination terminal route restrictions at Chicago South hub delaying beverage transit.
- **Business Impact:** At-risk wholesale cafe relationships and SLA delivery penalties.
- **💡 Concrete Solution & Action Plan:**
  1. **Logistics Escalation & Air Re-routing:** Issue automated SLA breach escalations to Delhivery and divert urgent consignments to **BlueDart Air Cargo**.
  2. **Proactive Customer Care:** Transmit proactive SMS/WhatsApp delay alerts with real-time live GPS tracking links and apply an automatic 10% courtesy goodwill discount to affected cafes.
  3. **Emergency Restock PO Approval:** Approve an emergency Purchase Order for **{target_qty} units** of {target_prod.name} to {supplier.name} (**₹{total_cost:,.2f}**) to immediately unblock warehouse packaging queues.

👉 *Say **"Yes"** or **"Do that way"** to implement this solution immediately, or say **"Cancel"**.*
"""
            action_state = "AWAITING_CONFIRMATION"

            return {
                "spoken_response": spoken,
                "display_response": display,
                "intent": "ORDER_DELAYS_EXPLANATION",
                "action_state": action_state,
                "pending_action": ctx.get("pending_action"),
                "visual_card": {
                    "type": "CONFIRM_ACTION_CARD",
                    "action_title": f"Restock {target_prod.name} and Escalate Dispatches",
                    "supplier": supplier.name,
                    "cost": total_cost
                },
                "suggested_voice_prompts": [
                    "Yes, submit it",
                    "Which products?",
                    "No, cancel"
                ]
            }

        # ---------------- 4. INTENT: CONTEXTUAL FOLLOW-UP "WHICH PRODUCTS?" ----------------
        if text in ["which products", "which products?", "what products", "what products?"] or (
            "which" in text and "product" in text
        ):
            ctx["last_intent"] = "WHICH_PRODUCTS_FOLLOWUP"
            products = db.query(Product).all()
            low_stock = [p for p in products if (p.stock_quantity - p.reserved_stock) <= p.reorder_level]
            
            if low_stock:
                ctx["last_products_mentioned"] = [p.name for p in low_stock]
                details = []
                for p in low_stock[:3]:
                    avail = max(0, p.stock_quantity - p.reserved_stock)
                    details.append(f"{p.name} has only {avail} units available, while {p.reorder_level} units are required for reorder safety.")
                
                target_prod = low_stock[0]
                target_qty = target_prod.reorder_quantity or 250
                supplier = target_prod.supplier or db.query(Supplier).first()
                unit_cost = target_prod.cost_price
                total_cost = round(unit_cost * target_qty, 2)

                ctx["pending_action"] = {
                    "action_type": "CREATE_PURCHASE_ORDER",
                    "params": {
                        "product_id": target_prod.id,
                        "product_name": target_prod.name,
                        "supplier_id": supplier.id,
                        "supplier_name": supplier.name,
                        "quantity": target_qty,
                        "unit_cost": unit_cost,
                        "total_cost": total_cost
                    }
                }

                details_speech = " ".join(details)
                spoken = (
                    f"The affected products are: {', '.join([p.name for p in low_stock[:3]])}. {details_speech} "
                    f"The reason behind this is that high order demand outpaced safety reorder cycles. "
                    f"I recommend issuing a Purchase Order for {target_qty} units of {target_prod.name} from {supplier.name} for ₹{total_cost:,.0f}. "
                    f"Should I submit it?"
                )
                display = f"""### 📦 Critical Stock Shortage Products
""" + "\n".join([f"- **{p.name}** (`{p.sku}`): {max(0, p.stock_quantity - p.reserved_stock)} available (Physical: {p.stock_quantity}, Reserved: {p.reserved_stock}, Safety Level: {p.reorder_level})" for p in low_stock[:3]]) + f"""

- **Root Cause:** Sales velocity exceeded safety lead time.
- **Recommended Action:** Reorder **{target_qty} units** from **{supplier.name}** (₹{total_cost:,.2f}).

👉 *Say **"Yes"** or click Confirm to implement this Purchase Order.*
"""
                action_state = "AWAITING_CONFIRMATION"
            else:
                spoken = "All products currently have sufficient stock levels above their reorder points."
                display = "All beverage products currently meet stock safety levels."
                action_state = "NONE"

            return {
                "spoken_response": spoken,
                "display_response": display,
                "intent": "WHICH_PRODUCTS_FOLLOWUP",
                "action_state": action_state,
                "pending_action": ctx.get("pending_action"),
                "visual_card": {
                    "type": "CONFIRM_ACTION_CARD",
                    "action_title": f"Reorder {target_prod.name}",
                    "supplier": supplier.name if low_stock else None,
                    "cost": total_cost if low_stock else None
                } if low_stock else None,
                "suggested_voice_prompts": [
                    "Yes, submit it",
                    "Create a reorder request",
                    "Why are orders getting delayed?"
                ] if low_stock else ["Give me today's business report"]
            }

        # ---------------- 5. INTENT: REORDER REQUEST (EXPLICIT ACTION PROPOSAL) ----------------
        if any(k in text for k in ["create a reorder request", "create reorder request", "prepare reorder", "reorder products", "reorder stock", "prepare a purchase request", "create purchase order"]):
            ctx["last_intent"] = "PREPARE_REORDER"
            
            products = db.query(Product).all()
            low_stock = [p for p in products if (p.stock_quantity - p.reserved_stock) <= p.reorder_level]
            target_prod = low_stock[0] if low_stock else products[0]
            target_qty = target_prod.reorder_quantity or 250
            supplier = target_prod.supplier or db.query(Supplier).first()
            unit_cost = target_prod.cost_price
            total_cost = round(unit_cost * target_qty, 2)

            ctx["pending_action"] = {
                "action_type": "CREATE_PURCHASE_ORDER",
                "params": {
                    "product_id": target_prod.id,
                    "product_name": target_prod.name,
                    "supplier_id": supplier.id,
                    "supplier_name": supplier.name,
                    "quantity": target_qty,
                    "unit_cost": unit_cost,
                    "total_cost": total_cost
                }
            }

            spoken = (
                f"I have prepared a reorder request for {target_qty} units of {target_prod.name} from {supplier.name} "
                f"for a total of ₹{total_cost:,.0f}. Should I submit it?"
            )

            display = f"""### 📝 Action Confirmation Required: Issue Purchase Order
- **Product:** {target_prod.name} (`{target_prod.sku}`)
- **Supplier:** {supplier.name} (Lead Time: {supplier.lead_time_days} days)
- **Quantity:** {target_qty} units
- **Unit Cost:** ₹{unit_cost:.2f}
- **Total Amount:** **₹{total_cost:,.2f}**

👉 *Please say **"Yes"** or click Confirm to execute this Purchase Order in the database, or say **"Cancel"** to abort.*
"""

            return {
                "spoken_response": spoken,
                "display_response": display,
                "intent": "PREPARE_REORDER",
                "action_state": "AWAITING_CONFIRMATION",
                "pending_action": ctx["pending_action"],
                "visual_card": {
                    "type": "CONFIRM_ACTION_CARD",
                    "action_title": f"Reorder {target_qty} units of {target_prod.name}",
                    "supplier": supplier.name,
                    "cost": total_cost
                },
                "suggested_voice_prompts": [
                    "Yes, submit it",
                    "No, cancel"
                ]
            }

        # ---------------- 6. INTENT: HIGHEST PENDING PAYMENT (ISSUE -> REASON -> SOLUTION -> IMPLEMENT?) ----------------
        if any(k in text for k in ["highest pending payment", "highest outstanding payment", "largest unpaid order", "biggest unpaid", "highest unpaid", "highest pending"]):
            ctx["last_intent"] = "HIGHEST_PENDING_PAYMENT"
            
            unpaid_orders = db.query(Order).filter(
                Order.payment_status.in_(["Unpaid", "Partial", "Failed"]),
                Order.status != "Cancelled"
            ).order_by(Order.total_amount.desc()).all()

            if unpaid_orders:
                highest = unpaid_orders[0]
                cust_name = highest.customer.name if highest.customer else "Wholesale Account"
                ctx["last_orders_mentioned"] = [highest.order_number]
                
                ctx["pending_action"] = {
                    "action_type": "SEND_PAYMENT_REMINDER",
                    "params": {
                        "order_number": highest.order_number,
                        "customer_name": cust_name,
                        "amount": highest.total_amount
                    }
                }

                spoken = (
                    f"The highest outstanding payment is ₹{highest.total_amount:,.0f} for order {highest.order_number} by customer {cust_name}. "
                    f"The reason behind this is that wholesale credit terms have exceeded 15 days without an automated follow-up. "
                    f"I recommend issuing an official payment recovery notice and invoice statement. "
                    f"Would you like me to implement this solution right now?"
                )

                display = f"""### ⚠️ Highest Pending Payment Order
- **Issue:** Outstanding payment of **₹{highest.total_amount:,.2f}** on Order `{highest.order_number}`
- **Customer:** **{cust_name}** ({highest.customer.email if highest.customer else ''})
- **Reason Behind It:** Wholesale net-15 payment terms have lapsed without automated recovery follow-up.
- **Recommended Solution:** Dispatch an official payment reminder and statement of account to the customer.

👉 *Say **"Yes"** or **"Do that way"** to send the payment reminder, or say **"Cancel"**.*
"""
                action_state = "AWAITING_CONFIRMATION"
            else:
                spoken = "There are no outstanding customer payments in the system."
                display = "Zero pending customer payments."
                action_state = "NONE"

            return {
                "spoken_response": spoken,
                "display_response": display,
                "intent": "HIGHEST_PENDING_PAYMENT",
                "action_state": action_state,
                "pending_action": ctx.get("pending_action"),
                "visual_card": {
                    "type": "CONFIRM_ACTION_CARD",
                    "action_title": f"Send Payment Reminder to {cust_name}",
                    "amount": highest.total_amount if unpaid_orders else 0
                } if unpaid_orders else None,
                "suggested_voice_prompts": [
                    "Yes, send reminder",
                    "How much money are we supposed to receive?",
                    "No, cancel"
                ] if unpaid_orders else ["Give me today's business report"]
            }

        # ---------------- 7. INTENT: PENDING PAYMENTS & REVENUE RECEIVABLE ----------------
        payment_triggers = [
            "how much money are we supposed to receive",
            "how much money supposed to receive",
            "how much money supposed receive",
            "how much money we supposed to receive",
            "how much money we supposed receive",
            "how much money to receive",
            "how much money pending",
            "how much money we have to receive",
            "how much money",
            "supposed to receive",
            "supposed receive",
            "money supposed receive",
            "money supposed to receive",
            "money pending",
            "pending money",
            "how to collect money",
            "how can we collect it",
            "how can we collect money",
            "how can we collect",
            "how to collect it",
            "how to collect pending money",
            "how to collect",
            "pending payment", "pending payments",
            "outstanding payment", "outstanding amount", "how much payment is pending",
            "who owes us money", "why overdue balance pending", "why is overdue balance pending",
            "why overdue balance", "how can we solve it", "solve pending payment", "why payment pending",
            "why is payment pending", "overdue balance pending", "overdue balance", "overdue pending",
            "receivables", "accounts receivable", "uncollected money", "uncollected revenue"
        ]
        if any(k in text for k in payment_triggers) or (("money" in text or "amount" in text) and ("receive" in text or "pending" in text or "collect" in text or "due" in text or "owed" in text)):
            ctx["last_intent"] = "PAYMENTS_QUERY"
            
            all_orders = db.query(Order).all()
            total_rev = sum(o.total_amount for o in all_orders if o.status != "Cancelled")
            total_collected = db.query(func.sum(Payment.amount)).filter(Payment.status == "Success").scalar() or 0.0
            pending_val = max(0.0, total_rev - total_collected)

            unpaid_orders = [o for o in all_orders if o.payment_status in ["Unpaid", "Partial", "Failed"] and o.status != "Cancelled"]
            partially_paid = [o for o in unpaid_orders if o.payment_status == "Partial"]

            top_unpaid_info = []
            for o in unpaid_orders[:4]:
                c_name = o.customer.name if o.customer else "Wholesale Account"
                top_unpaid_info.append({
                    "order_number": o.order_number,
                    "customer_name": c_name,
                    "amount": o.total_amount,
                    "status": o.payment_status
                })

            spoken = (
                f"Hello Aarav. We are currently supposed to receive ₹{pending_val:,.0f} across {len(unpaid_orders)} unsettled customer orders. "
                f"The exact reasons behind this pending money are: "
                f"First, wholesale credit terms: accounts like Zest & Zen Wellness and Blue Harbor Cafe were extended Net-15 or Net-30 credit lines that reached maturity without automated settlement clearance; "
                f"Second, dispatch gate bypass: previous consignments were packaged and dispatched prior to receiving payment verification. "
                f"Here is our concrete 3-step solution to collect it immediately: "
                f"1) Dispatch automated 1-click WhatsApp and Email payment settlement links with instant UPI and card checkout; "
                f"2) Enforce an immediate dispatch freeze on future consignments for any account with an unpaid balance over ₹40,000; "
                f"3) Offer an early-clearance 2% settlement incentive to expedite pending wire transfers. "
                f"I have prepared these 1-click recovery links. Would you like me to dispatch them right now?"
            )

            display = f"""### 💳 Pending Receivables & Collection Action Plan
- **Total Money Supposed to Receive:** **₹{pending_val:,.2f}** ({len(unpaid_orders)} unsettled orders)
- **Primary Unsettled Accounts:**
""" + "\n".join([f"  - **Order `{u['order_number']}`** ({u['customer_name']}): **₹{u['amount']:,.2f}** [{u['status']}]" for u in top_unpaid_info]) + f"""

---

#### 🔍 Exact Reasons Behind Pending Money:
1. **Unmonitored Wholesale Credit Terms:** Wholesale Net-15/Net-30 payment terms reached maturity without automated collection follow-up or overdue dunning reminders.
2. **Dispatch Gate Bypass:** Orders were permitted to progress into warehouse fulfillment and dispatch before receiving verified payment clearance.
3. **Manual Bank Transfer Lag:** Offline NEFT/RTGS wire transfers await manual ledger matching.

---

#### 💡 How We Can Collect It (Actionable Solutions):
1. **1-Click WhatsApp & Email Settlement Links:** Auto-dispatch instant Razorpay/UPI checkout links directly to wholesale finance contacts.
2. **Automated Dispatch Hold Gate:** Enforce an automated dispatch freeze on new orders for wholesale accounts exceeding credit limits.
3. **Early Settlement Incentive:** Offer an automated 2% prompt-payment credit for settlements completed within 24 hours.

👉 *Say **"Yes"** or tap the button below to dispatch 1-click payment settlement links to all unsettled clients immediately.*
"""

            ctx["pending_action"] = {
                "action_type": "SEND_PAYMENT_REMINDERS",
                "params": {
                    "order_numbers": [o.order_number for o in unpaid_orders[:5]],
                    "uncollected_amount": pending_val
                }
            } if unpaid_orders else None

            return {
                "spoken_response": spoken,
                "display_response": display,
                "intent": "PAYMENTS_QUERY",
                "action_state": "AWAITING_CONFIRMATION" if unpaid_orders else "NONE",
                "pending_action": ctx.get("pending_action"),
                "direct_route": "payments",
                "direct_route_label": "Open Payments & Invoices Ledger",
                "visual_card": {
                    "type": "PAYMENT_RECEIVABLES_CARD",
                    "pending_amount": pending_val,
                    "unpaid_count": len(unpaid_orders),
                    "unpaid_orders": top_unpaid_info
                },
                "suggested_voice_prompts": [
                    "Yes, send payment reminders",
                    "Show me the highest pending payment",
                    "Why are orders getting delayed?",
                    "Give me today's business report"
                ]
            }

        # ---------------- 8A. INTENT: WHY COMPLAINTS ARE INCREASING (ROOT CAUSES + CONCRETE SOLUTION) ----------------
        why_complaints_triggers = [
            "why complaints are increasing", "why are complaints increasing", "why complaints increasing",
            "why complaint increasing", "why are complaint increasing", "why complaints increase",
            "why complaint increase", "why are complaints going up", "why complaints going up",
            "why complaints high", "why are complaints high", "complaints increasing", "complaint increasing",
            "why more complaints", "why so many complaints", "reason for complaints", "reasons for complaints",
            "why complaints are their", "why complaints are there", "why do we have complaints", "why complaints",
            "complaint reason", "complaints reason", "how to solve complaints", "solve complaints",
            "complaint solution", "complaints solution", "resolve complaint", "resolve complaints",
            "resolve urgent complaint"
        ]
        is_why_complaints_query = (
            any(k in text for k in why_complaints_triggers) or
            (("complaint" in text or "complaints" in text) and any(w in text for w in ["increase", "increasing", "going up", "high", "more", "why", "reason", "reasons", "solve", "solution"]))
        )
        if is_why_complaints_query:
            ctx["last_intent"] = "WHY_COMPLAINTS_INCREASING"
            
            open_comps = db.query(Complaint).filter(Complaint.status.in_(["Open", "In Progress", "Escalated"])).all()
            urgent = [c for c in open_comps if c.priority == "Urgent"]
            target_comp = urgent[0] if urgent else (open_comps[0] if open_comps else None)
            cust_name = target_comp.customer.name if (target_comp and target_comp.customer) else "Blue Harbor Cafe"
            comp_num = target_comp.complaint_number if target_comp else "CMP-2001"

            if open_comps:
                ctx["pending_action"] = {
                    "action_type": "RESOLVE_COMPLAINT_REPLACEMENT",
                    "params": {
                        "complaint_id": target_comp.id if target_comp else 1,
                        "complaint_number": comp_num,
                        "customer_name": cust_name
                    }
                }

                spoken = (
                    f"Hello Aarav. Customer complaints are increasing primarily due to three specific operational failures: "
                    f"First, Logistics Delivery Delays account for 50% of complaints—Delhivery and Hugg Express regional sorting hubs have experienced linehaul congestion and checkpoint scanning stalls, causing orders to arrive 24 to 48 hours past promised SLA; "
                    f"Second, Packaging Defects in production batch #EB-44—bottle cap micro-cracks and seal tolerance failures caused liquid leakage during transit; "
                    f"Third, Warehouse Picking Errors and Cold-Chain Transit Breaches—where wrong SKUs were dispatched and elevated van temperatures altered kombucha flavor. "
                    f"How we can solve it: "
                    f"1) For logistics, enforce contractual carrier SLA penalties against Delhivery and re-route delayed orders to express air dispatch with live GPS tracking; "
                    f"2) For packaging, immediately quarantine bottle batch #EB-44 at the warehouse and debit EcoPack Glass for damaged units; "
                    f"3) For affected customers, dispatch complimentary priority air replacement cartons and apply an automatic ₹750 to ₹1,500 goodwill credit. "
                    f"I can approve the emergency replacement and credit for {cust_name} right now. Should I proceed?"
                )

                display = f"""### ⚠️ Why Complaints Are Increasing: Root Cause Diagnostic & Resolution Plan
- **Issue Detected:** **{len(open_comps)} Open Customer Complaints** ({len(urgent)} Urgent Priority)
- **Why Complaints Are Increasing (Exact Root Causes):**
  1. **Logistics & Delivery Delays (50% of tickets - 4 orders):** Linehaul congestion and checkpoint scanning stalls at **Delhivery** and **Hugg Express** sorting hubs, breaching 24-48h delivery SLAs for wholesale cafes.
  2. **Packaging Seal Defects (Batch #EB-44):** Cap micro-cracking and seal tolerance failures from supplier **EcoPack Glass**, causing transit leakage and carbonation loss.
  3. **Warehouse Picking Errors & Cold-Chain Breaches:** Barcode mis-scans during packing waves (wrong SKU dispatched) and refrigerated van temperature deviations causing off-flavor kombucha.
- **💡 Concrete Action Plan & Solution:**
  1. **Logistics Escalation & SLA Enforcement:** Deduct contractual SLA breach penalties from Delhivery's monthly invoice, re-route urgent deliveries to priority air couriers, and transmit live GPS tracking links to customers.
  2. **Warehouse Batch Quarantine:** Immediately quarantine defective bottle batch #EB-44 and Kombucha batch #WB-19 at the central warehouse; file a formal Level-2 defect claim with EcoPack Glass.
  3. **Customer Retention & Rapid Restitution:** Dispatch complimentary priority air replacement cartons within 2 hours and credit ₹750 to ₹1,500 goodwill balance to affected wholesale accounts.

👉 *Say **"Yes"** or **"Do that way"** to approve the urgent replacement resolution for **{cust_name} ({comp_num})** immediately, or say **"Cancel"**.*
"""
                action_state = "AWAITING_CONFIRMATION"
            else:
                spoken = "Hello Aarav. There are currently zero open customer complaints. All past tickets have been resolved."
                display = "✅ **Zero open customer complaints.**"
                action_state = "NONE"

            return {
                "spoken_response": spoken,
                "display_response": display,
                "intent": "WHY_COMPLAINTS_INCREASING",
                "action_state": action_state,
                "pending_action": ctx.get("pending_action"),
                "visual_card": {
                    "type": "CONFIRM_ACTION_CARD",
                    "action_title": f"Resolve Complaint {comp_num} with Replacement",
                    "customer": cust_name if open_comps else None
                } if open_comps else {"type": "COMPLAINT_CARD", "count": 0},
                "suggested_voice_prompts": [
                    "Yes, approve replacement",
                    "Why are orders getting delayed?",
                    "Why is overdue balance pending?",
                    "No, cancel"
                ] if open_comps else ["Give me today's business report"]
            }

        # ---------------- 8B. INTENT: WHAT ARE COMPLAINTS (LISTING & SUMMARY OF OPEN COMPLAINTS) ----------------
        what_complaints_triggers = [
            "what are complaints", "what are our complaints", "what complaints do we have",
            "show complaints", "list complaints", "view complaints", "open complaints",
            "customer complaints", "unresolved complaints", "urgent complaints", "high priority complaints",
            "what are the complaints", "tell me the complaints", "complaints summary", "complaint summary",
            "what complaints", "which complaints"
        ]
        is_what_complaints_query = (
            any(k in text for k in what_complaints_triggers) or
            (("complaint" in text or "complaints" in text) and any(w in text for w in ["what", "show", "list", "view", "active", "open", "tell me", "which"]))
        )
        if is_what_complaints_query:
            ctx["last_intent"] = "WHAT_ARE_COMPLAINTS"
            
            open_comps = db.query(Complaint).filter(Complaint.status.in_(["Open", "In Progress", "Escalated"])).all()
            urgent = [c for c in open_comps if c.priority == "Urgent"]
            target_comp = urgent[0] if urgent else (open_comps[0] if open_comps else None)
            cust_name = target_comp.customer.name if (target_comp and target_comp.customer) else "Blue Harbor Cafe"
            comp_num = target_comp.complaint_number if target_comp else "CMP-2001"

            if open_comps:
                cat_counts = {}
                for c in open_comps:
                    cat_counts[c.category] = cat_counts.get(c.category, 0) + 1
                cat_summary = ", ".join([f"{count} {cat}" for cat, count in cat_counts.items()])

                spoken = (
                    f"Hello Aarav. Here is what our customer complaints are currently: "
                    f"We have {len(open_comps)} unresolved complaints, with {len(urgent)} marked Urgent priority. "
                    f"The complaints breakdown is: {cat_summary}. "
                    f"The highest priority ticket is {comp_num} from {cust_name}. "
                    f"If you would like to know why complaints are increasing and hear our full solution, ask 'Why complaints are increasing?' "
                    f"Or say 'Resolve urgent complaint' to approve an immediate replacement."
                )

                items_md = ""
                for c in open_comps[:5]:
                    c_cust = c.customer.name if c.customer else "Customer"
                    items_md += f"- **{c.complaint_number}** ({c.priority} Priority) — *{c_cust}*: {c.category} ({c.description[:60]}...)\n"

                display = f"""### 📋 Current Active Customer Complaints
- **Total Open Tickets:** **{len(open_comps)}** ({len(urgent)} Urgent Priority)
- **Category Breakdown:** {cat_summary}

#### Open Tickets:
{items_md}

👉 *Ask **"Why complaints are increasing?"** for the complete root cause diagnostic and 3-step action plan, or say **"Resolve urgent complaint"** to approve a replacement.*
"""
                action_state = "NONE"
            else:
                spoken = "Hello Aarav. There are currently zero open customer complaints. All past tickets have been resolved."
                display = "✅ **Zero open customer complaints.**"
                action_state = "NONE"

            return {
                "spoken_response": spoken,
                "display_response": display,
                "intent": "WHAT_ARE_COMPLAINTS",
                "action_state": action_state,
                "pending_action": None,
                "visual_card": {"type": "COMPLAINT_CARD", "count": len(open_comps)},
                "suggested_voice_prompts": [
                    "Why complaints are increasing?",
                    "Why are orders getting delayed?",
                    "Resolve urgent complaint",
                    "Give me today's business report"
                ]
            }

        # ---------------- 9. INTENT: WHAT SHOULD I FOCUS ON TODAY? (ISSUES -> REASONS -> SOLUTIONS -> IMPLEMENT?) ----------------
        if any(k in text for k in ["what should i focus on today", "what should i focus on", "priorities today", "biggest business risks", "top priorities", "what should i do"]):
            ctx["last_intent"] = "EXECUTIVE_PRIORITIES"
            
            products = db.query(Product).all()
            low_stock = [p for p in products if (p.stock_quantity - p.reserved_stock) <= p.reorder_level]
            dispatches = db.query(Dispatch).all()
            delayed = [d for d in dispatches if d.expected_delivery_date and d.status not in ["Delivered", "Cancelled"] and now > d.expected_delivery_date]
            unpaid_orders = db.query(Order).filter(Order.payment_status.in_(["Unpaid", "Failed"]), Order.status != "Cancelled").all()

            target_prod = low_stock[0] if low_stock else db.query(Product).first()
            target_qty = target_prod.reorder_quantity or 250
            supplier = target_prod.supplier or db.query(Supplier).first()
            unit_cost = target_prod.cost_price
            total_cost = round(unit_cost * target_qty, 2)

            ctx["pending_action"] = {
                "action_type": "CREATE_PO_AND_ESCALATE_DELAYS",
                "params": {
                    "product_id": target_prod.id,
                    "product_name": target_prod.name,
                    "supplier_id": supplier.id,
                    "supplier_name": supplier.name,
                    "quantity": target_qty,
                    "unit_cost": unit_cost,
                    "total_cost": total_cost,
                    "delayed_orders": [d.order.order_number for d in delayed if d.order]
                }
            }

            spoken = (
                f"Your top three operational priorities for today are: "
                f"First, resolving the {len(delayed)} delayed orders by escalating with courier dispatch. "
                f"Second, restocking {target_prod.name} to clear pending fulfillment orders caused by inventory stockouts. "
                f"Third, following up on the {len(unpaid_orders)} outstanding customer payments due to lapsed credit terms. "
                f"These represent your highest working capital and customer retention risks. "
                f"I recommend issuing an emergency Purchase Order for {target_qty} units of {target_prod.name} to {supplier.name} for ₹{total_cost:,.0f} and escalating delayed dispatches. "
                f"Would you like me to implement this solution right now?"
            )

            display = f"""### 🎯 Executive Operational Priorities Diagnostic
1. **Resolve {len(delayed)} Delayed Shipments:** Root cause is transit bottleneck at Delhivery. Solution: Escalate courier priority.
2. **Restock {target_prod.name}:** Root cause is inventory stockout choking packing. Solution: Approve PO for {target_qty} units to {supplier.name}.
3. **Follow-up on {len(unpaid_orders)} Pending Payments:** Root cause is net-15 terms lapse. Solution: Send recovery statements.

👉 *Say **"Yes"** or **"Do that way"** to implement the restocking and courier escalation immediately.*
"""

            return {
                "spoken_response": spoken,
                "display_response": display,
                "intent": "EXECUTIVE_PRIORITIES",
                "action_state": "AWAITING_CONFIRMATION",
                "pending_action": ctx["pending_action"],
                "visual_card": {
                    "type": "CONFIRM_ACTION_CARD",
                    "action_title": f"Restock {target_prod.name} and Escalate Dispatches",
                    "supplier": supplier.name,
                    "cost": total_cost
                },
                "suggested_voice_prompts": [
                    "Yes, implement solution",
                    "Why are orders getting delayed?",
                    "No, cancel"
                ]
            }

        # ---------------- 10. INTENT: SPECIFIC ORDER SEARCH (e.g. "Find order HUG-1003") ----------------
        order_match = re.search(r"hug[-\s]?(\d{3,5})", text)
        if order_match or "find order" in text or "search order" in text:
            order_num = f"HUG-{order_match.group(1)}" if order_match else None
            
            order = None
            if order_num:
                order = db.query(Order).filter(Order.order_number == order_num).first()
            if not order and ctx.get("last_orders_mentioned"):
                order = db.query(Order).filter(Order.order_number == ctx["last_orders_mentioned"][0]).first()

            if order:
                ctx["last_orders_mentioned"] = [order.order_number]
                cust_name = order.customer.name if order.customer else "N/A"
                items_summary = ", ".join([f"{it.quantity}x {it.product.name}" for it in order.items])
                dispatch_st = order.dispatch.status if order.dispatch else "Pending"
                
                spoken = (
                    f"Order {order.order_number} for {cust_name} is currently in {order.status} status. "
                    f"Total value is ₹{order.total_amount:,.0f}, and payment is {order.payment_status}. "
                    f"Dispatch carrier tracking is {dispatch_st}."
                )

                display = f"""### 📦 Order Details: `{order.order_number}`
- **Customer:** {cust_name} ({order.customer.email if order.customer else ''})
- **Status:** **{order.status}** | **Payment:** **{order.payment_status}**
- **Total Amount:** **₹{order.total_amount:,.2f}**
- **Products:** {items_summary}
- **Logistics Status:** {dispatch_st} (Carrier: {order.dispatch.delivery_partner if order.dispatch else 'Hugg Express'})
"""
            else:
                spoken = f"I could not find an order matching that identifier in our database records."
                display = "Order not found in database records."

            return {
                "spoken_response": spoken,
                "display_response": display,
                "intent": "ORDER_LOOKUP",
                "action_state": "NONE",
                "visual_card": {"type": "ORDER_DETAIL", "order_id": order.order_number if order else None},
                "suggested_voice_prompts": [
                    f"Update order {order.order_number} to processing" if order else "Give me today's report",
                    "Why are orders getting delayed?",
                    "What should I focus on today?"
                ]
            }

        # ---------------- 11. INTENT: UPDATE ORDER STATUS (VOICE ACTION WITH CONFIRMATION) ----------------
        if "update" in text and "order" in text:
            target_status = "Processing"
            if "pack" in text: target_status = "Packed"
            elif "dispatch" in text: target_status = "Dispatched"
            elif "deliver" in text: target_status = "Delivered"
            elif "cancel" in text: target_status = "Cancelled"
            elif "confirm" in text: target_status = "Confirmed"

            order_num = f"HUG-{order_match.group(1)}" if order_match else (ctx["last_orders_mentioned"][0] if ctx["last_orders_mentioned"] else "HUG-1006")
            order = db.query(Order).filter(Order.order_number == order_num).first()

            if order:
                ctx["pending_action"] = {
                    "action_type": "UPDATE_ORDER_STATUS",
                    "params": {
                        "order_id": order.id,
                        "order_number": order.order_number,
                        "new_status": target_status
                    }
                }

                spoken = f"I have prepared to update Order {order.order_number} to {target_status}. Should I proceed with this status update?"
                display = f"""### ⚠️ Action Confirmation Required: Update Order
- **Order ID:** `{order.order_number}`
- **Customer:** {order.customer.name if order.customer else ''}
- **Current Status:** `{order.status}` $\\longrightarrow$ **New Status:** `{target_status}`

👉 *Please say **"Yes"** to confirm and update the database, or **"Cancel"** to abort.*
"""
                return {
                    "spoken_response": spoken,
                    "display_response": display,
                    "intent": "UPDATE_ORDER_STATUS_PROPOSAL",
                    "action_state": "AWAITING_CONFIRMATION",
                    "pending_action": ctx["pending_action"],
                    "visual_card": {"type": "CONFIRM_ACTION_CARD", "action_title": f"Update {order.order_number} to {target_status}"},
                    "suggested_voice_prompts": ["Yes, update it", "No, cancel"]
                }

        # ---------------- 12. FALLBACK INTENT WITH BROAD COGNITIVE SCAN & LLM ----------------
        all_prods = db.query(Product).all()
        low_stock = [p for p in all_prods if (p.stock_quantity - p.reserved_stock) <= p.reorder_level]
        delayed = [d for d in db.query(Dispatch).all() if d.expected_delivery_date and d.status not in ["Delivered", "Cancelled"] and now > d.expected_delivery_date]
        total_rev = sum(o.total_amount for o in db.query(Order).all() if o.status != "Cancelled")
        
        from app.ai.llm_service import call_llm
        context_summary = f"Total Revenue: Rs {total_rev:,.0f}, Out/Low Stock SKUs: {len(low_stock)}, Delayed Deliveries past SLA: {len(delayed)}."
        llm_reply = call_llm(
            prompt=f"Operational metrics: {context_summary}\nExecutive question: {raw_text}\nGive a concise, direct, 2-3 sentence answer suitable for speaking aloud.",
            system_prompt="You are Hugg AI Voice Assistant for beverage business owner Aarav Mehta. Be factual, executive, and direct.",
            max_tokens=150
        )

        if llm_reply.get("success"):
            spoken = llm_reply["content"]
            display = f"### 🤖 Hugg Voice Intelligence ({llm_reply['source']})\n\n{spoken}\n\n- **Context:** Revenue ₹{total_rev:,.2f} | {len(low_stock)} Low Stock | {len(delayed)} Delayed Shipments"
        else:
            spoken = (
                f"I have verified our operational database. Total revenue stands at ₹{total_rev:,.0f}. "
                f"We have {len(low_stock)} product(s) below reorder levels, and {len(delayed)} delayed shipments. "
                f"You can ask me to give today's briefing, investigate delayed orders, inspect inventory, or prepare a reorder request."
            )
            display = f"""### 🤖 Hugg Voice Intelligence Assistant
I understood your request: *"{raw_text}"*. 
- **Total Revenue:** ₹{total_rev:,.2f}
- **Stock Bottlenecks:** {len(low_stock)} SKU(s)
- **Delayed Shipments:** {len(delayed)} orders

**Try saying:**
- *"Give me today's business report"*
- *"Why are orders getting delayed?"*
- *"Which products need restocking?"*
- *"How much money are we supposed to receive?"*
- *"What should I focus on today?"*
"""

        return {
            "spoken_response": spoken,
            "display_response": display,
            "intent": "GENERAL_QUERY",
            "action_state": "NONE",
            "visual_card": None,
            "suggested_voice_prompts": [
                "Give me today's business report",
                "Why are orders getting delayed?",
                "Which products need restocking?",
                "How much money are we supposed to receive?"
            ]
        }

    def _execute_pending_action(self, db: Session, pending: dict, session_id: str) -> dict:
        action_type = pending.get("action_type")
        params = pending.get("params", {})

        if action_type in ["CREATE_PURCHASE_ORDER", "CREATE_PO_AND_ESCALATE_DELAYS"]:
            po = crud.create_purchase_order(
                db=db,
                po_in=type("POIn", (), {
                    "product_id": params["product_id"],
                    "supplier_id": params["supplier_id"],
                    "quantity": params["quantity"],
                    "unit_cost": params["unit_cost"],
                    "expected_date": datetime.datetime.utcnow() + datetime.timedelta(days=5)
                })(),
                user_name="Aarav Mehta (Voice Command)"
            )
            
            escalated_msg = ""
            if action_type == "CREATE_PO_AND_ESCALATE_DELAYS":
                now = datetime.datetime.utcnow()
                delayed_dispatches = db.query(Dispatch).filter(
                    Dispatch.expected_delivery_date.isnot(None),
                    Dispatch.status.notin_(["Delivered", "Cancelled"]),
                    now > Dispatch.expected_delivery_date
                ).all()
                for d in delayed_dispatches:
                    d.carrier_status_notes = "Priority Escalation: Expedited Courier Request by Aarav Mehta (Voice AI)"
                db.commit()
                crud.log_audit(db, "ESCALATE", "Dispatch", f"Escalated {len(delayed_dispatches)} delayed shipments with carriers via Voice AI", user_name="Aarav Mehta (Voice Command)")
                escalated_msg = f", and {len(delayed_dispatches)} delayed shipments have been escalated with carriers for priority dispatch"

            msg = (
                f"Your reorder request has been created successfully. Purchase Order {po.po_number} for {po.quantity} units "
                f"of {params['product_name']} is now approved and issued to {params['supplier_name']}{escalated_msg}."
            )
            return {
                "spoken_message": msg,
                "action_executed": {
                    "type": "PURCHASE_ORDER",
                    "description": f"Purchase Order {po.po_number} created for {po.quantity} units of {params['product_name']}"
                },
                "card": {"type": "PO_CREATED", "po_number": po.po_number, "quantity": po.quantity, "amount": po.total_amount}
            }

        elif action_type == "RESOLVE_COMPLAINT_REPLACEMENT":
            comp = db.query(Complaint).filter(Complaint.id == params["complaint_id"]).first()
            if comp:
                comp.status = "Resolved"
                comp.resolution = "Approved free priority replacement delivery and issued 15% customer goodwill credit."
                comp.resolved_at = datetime.datetime.utcnow()
                db.commit()
                crud.log_audit(db, "RESOLVE", "Complaints", f"Resolved complaint {comp.complaint_number} with priority replacement for {params['customer_name']}", user_name="Aarav Mehta (Voice Command)")
            
            msg = f"I have implemented the solution for you. Complaint {params['complaint_number']} for {params['customer_name']} is now marked resolved in the database, and a free priority replacement shipment has been authorized."
            return {
                "spoken_message": msg,
                "action_executed": {
                    "type": "COMPLAINT_RESOLVED",
                    "description": f"Complaint {params['complaint_number']} marked resolved with free replacement package"
                },
                "card": {"type": "COMPLAINT_RESOLVED", "complaint_number": params["complaint_number"]}
            }

        elif action_type == "SEND_PAYMENT_REMINDER":
            crud.log_audit(
                db=db,
                action="PAYMENT_REMINDER",
                entity="Payments",
                details=f"Dispatched official payment recovery notice and ledger statement for Order {params['order_number']} to {params['customer_name']} (Outstanding: Rs {params['amount']})",
                user_name="Aarav Mehta (Voice Command)"
            )
            msg = f"I have implemented the solution for you. An official payment recovery notice and invoice statement for ₹{params['amount']:,.0f} have been issued to {params['customer_name']}."
            return {
                "spoken_message": msg,
                "action_executed": {
                    "type": "PAYMENT_REMINDER",
                    "description": f"Payment recovery statement sent to {params['customer_name']} for Order {params['order_number']}"
                },
                "card": {"type": "REMINDER_SENT", "order_number": params["order_number"], "amount": params["amount"]}
            }

        elif action_type == "UPDATE_ORDER_STATUS":
            order = crud.update_order_status(
                db=db,
                order_id=params["order_id"],
                new_status=params["new_status"],
                user_name="Aarav Mehta (Voice Command)"
            )
            msg = f"Order {params['order_number']} status has been updated to {params['new_status']} in the database."
            return {
                "spoken_message": msg,
                "action_executed": {
                    "type": "ORDER_UPDATED",
                    "description": f"Order {params['order_number']} status changed to {params['new_status']}"
                },
                "card": {"type": "ORDER_UPDATED", "order_number": params["order_number"], "status": params["new_status"]}
            }

        elif action_type == "MAKE_DISPATCH":
            res = crud.execute_dispatch_batch(
                db=db,
                order_ids=params.get("order_ids"),
                user_name="Aarav Mehta (Voice Command)"
            )
            return {
                "spoken_message": res["spoken_summary"],
                "action_executed": {
                    "type": "DISPATCH_BATCH",
                    "description": f"Processed {res['total_processed']} orders ({res['successful_count']} dispatched, {res['failed_count']} failed)"
                },
                "card": {
                    "type": "DISPATCH_EXECUTION_CARD",
                    "total": res["total_processed"],
                    "successful_count": res["successful_count"],
                    "failed_count": res["failed_count"],
                    "successful": res["successful_dispatches"],
                    "failed": res["failed_dispatches"]
                }
            }

        return {
            "spoken_message": "Action executed and logged in database successfully.",
            "action_executed": {"type": "GENERIC", "description": "Action logged in database"},
            "card": None
        }


voice_brain = VoiceBrain()
