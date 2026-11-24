import datetime
from sqlalchemy.orm import Session
from app.models import (
    User, Customer, Supplier, Product, StockMovement, Order, OrderItem,
    Payment, Dispatch, Complaint, PurchaseOrder, AuditLog
)

def seed_database(db: Session):
    # Only seed if database is empty
    if db.query(Product).count() > 0:
        return

    now = datetime.datetime.utcnow()

    # 1. Users / Roles
    users = [
        User(email="owner@hugg.com", password_hash="demo123", full_name="Aarav Mehta (Owner)", role="Owner/Admin"),
        User(email="ops@hugg.com", password_hash="demo123", full_name="Sarah Jenkins", role="Operations Manager"),
        User(email="inventory@hugg.com", password_hash="demo123", full_name="Dev Patel", role="Inventory Manager"),
        User(email="sales@hugg.com", password_hash="demo123", full_name="Maya Lin", role="Sales Employee"),
        User(email="support@hugg.com", password_hash="demo123", full_name="Rohan Verma", role="Customer Support"),
    ]
    db.add_all(users)
    db.flush()

    # 2. Suppliers
    suppliers = [
        Supplier(
            name="Equator Coffee Growers",
            contact_person="Carlos Mendez",
            email="carlos@equatorcoffee.com",
            phone="+1 555-019-2831",
            address="Antioquia, Colombia",
            category="Ingredients",
            lead_time_days=6,
            reliability_rating=4.7,
            status="Active",
            payment_terms="Net 30"
        ),
        Supplier(
            name="EcoPack Glass Solutions",
            contact_person="Priya Sharma",
            email="priya@ecopackglass.com",
            phone="+91 98201-44321",
            address="Industrial Zone, Pune",
            category="Packaging",
            lead_time_days=7,
            reliability_rating=3.8, # Intentional reliability issue
            status="Under Review",
            payment_terms="Net 15"
        ),
        Supplier(
            name="PureHerb Botanicals",
            contact_person="Liam O'Connor",
            email="liam@pureherb.co",
            phone="+44 20 7946 0912",
            address="Bristol, United Kingdom",
            category="Ingredients",
            lead_time_days=4,
            reliability_rating=4.9,
            status="Active",
            payment_terms="Net 45"
        ),
        Supplier(
            name="Apex Aluminum Closures",
            contact_person="David Chen",
            email="sales@apexclosures.com",
            phone="+1 415-555-8822",
            address="Oakland, CA",
            category="Packaging",
            lead_time_days=3,
            reliability_rating=4.6,
            status="Active",
            payment_terms="Net 30"
        )
    ]
    db.add_all(suppliers)
    db.flush()

    # 3. Products
    products = [
        Product(
            sku="HUG-CB-250",
            name="Hugg Cold Brew Classic 250ml",
            category="Cold Brew",
            description="Triple-filtered single-origin Arabica cold brew with caramel finish.",
            unit="Glass Bottle (250ml)",
            cost_price=1.60,
            selling_price=4.20,
            stock_quantity=12, # Intentionally critically low
            reserved_stock=10, # Available is only 2!
            reorder_level=50,
            reorder_quantity=250,
            supplier_id=suppliers[0].id,
            status="Active"
        ),
        Product(
            sku="HUG-CB-VAN",
            name="Hugg Madagascar Vanilla Cold Brew",
            category="Cold Brew",
            description="Smooth cold brew steeped with organic bourbon vanilla beans.",
            unit="Glass Bottle (250ml)",
            cost_price=1.85,
            selling_price=4.80,
            stock_quantity=180,
            reserved_stock=24,
            reorder_level=40,
            reorder_quantity=200,
            supplier_id=suppliers[0].id,
            status="Active"
        ),
        Product(
            sku="HUG-KOM-BER",
            name="Hugg Wild Berry Kombucha",
            category="Kombucha",
            description="Live probiotic sparkling tea with blackberry, raspberry & elderberry.",
            unit="Glass Bottle (330ml)",
            cost_price=1.90,
            selling_price=5.20,
            stock_quantity=45, # Low stock
            reserved_stock=20,
            reorder_level=60,
            reorder_quantity=300,
            supplier_id=suppliers[2].id,
            status="Active"
        ),
        Product(
            sku="HUG-KOM-GIN",
            name="Hugg Fiery Ginger Turmeric Kombucha",
            category="Kombucha",
            description="Cold-pressed organic ginger root with Hawaiian golden turmeric.",
            unit="Glass Bottle (330ml)",
            cost_price=1.95,
            selling_price=5.20,
            stock_quantity=240,
            reserved_stock=15,
            reorder_level=50,
            reorder_quantity=200,
            supplier_id=suppliers[2].id,
            status="Active"
        ),
        Product(
            sku="HUG-TEA-YUZ",
            name="Hugg Sparkling Yuzu Green Tea",
            category="Sparkling Tea",
            description="Ceremonial Japanese Sencha lightly effervescent with Japanese yuzu.",
            unit="Slim Can (330ml)",
            cost_price=1.40,
            selling_price=3.90,
            stock_quantity=320,
            reserved_stock=30,
            reorder_level=75,
            reorder_quantity=400,
            supplier_id=suppliers[2].id,
            status="Active"
        ),
        Product(
            sku="HUG-ELX-MGO",
            name="Hugg Mango Glow Adaptogen Elixir",
            category="Functional Juice",
            description="Alphonso mango puree infused with Ashwagandha & L-Theanine.",
            unit="Glass Bottle (300ml)",
            cost_price=2.20,
            selling_price=5.90,
            stock_quantity=0, # Completely Out of Stock!
            reserved_stock=0,
            reorder_level=45,
            reorder_quantity=200,
            supplier_id=suppliers[2].id,
            status="Active"
        ),
        Product(
            sku="HUG-MAT-LAT",
            name="Hugg Ceremonial Matcha Oat Latte",
            category="Functional Juice",
            description="Uji Matcha micro-milled with house-made creamy oat milk.",
            unit="Glass Bottle (250ml)",
            cost_price=2.30,
            selling_price=5.50,
            stock_quantity=140,
            reserved_stock=12,
            reorder_level=40,
            reorder_quantity=150,
            supplier_id=suppliers[2].id,
            status="Active"
        )
    ]
    db.add_all(products)
    db.flush()

    # 4. Customers
    customers = [
        Customer(name="Blue Harbor Artisan Cafe", email="orders@blueharborcafe.com", phone="+1 415-890-2100", address="1402 Pier View Blvd", city="San Francisco", segment="VIP", credit_limit=8000.0),
        Customer(name="Equinox Fitness Studios", email="procurement@equinoxfit.com", phone="+1 212-702-8800", address="580 Lexington Ave", city="New York", segment="VIP", credit_limit=12000.0),
        Customer(name="Green Sprout Organic Market", email="manager@greensprout.org", phone="+1 510-440-9922", address="920 University Ave", city="Berkeley", segment="Regular", credit_limit=4000.0),
        Customer(name="Urban Roastery & Bakery", email="supplies@urbanroastery.io", phone="+1 312-555-0144", address="310 W Randolph St", city="Chicago", segment="At Risk", credit_limit=3500.0),
        Customer(name="Zest & Zen Wellness Bar", email="hello@zestzen.co", phone="+1 206-882-9901", address="122 Pike St", city="Seattle", segment="Regular", credit_limit=5000.0),
        Customer(name="TechHub Cafe Palo Alto", email="cafeteria@techhubpa.com", phone="+1 650-321-7788", address="420 University Ave", city="Palo Alto", segment="Regular", credit_limit=6000.0),
        Customer(name="Summit Yoga & Lounge", email="admin@summityoga.com", phone="+1 303-991-2300", address="1840 16th St Mall", city="Denver", segment="New", credit_limit=2000.0),
        Customer(name="Liam Davies (D2C Direct)", email="liam.davies92@gmail.com", phone="+1 415-320-1122", address="742 Evergreen Terrace", city="Oakland", segment="Regular", credit_limit=500.0),
        Customer(name="Maya Sterling (D2C Direct)", email="maya.sterling@outlook.com", phone="+1 415-881-3344", address="224 Pine St Apt 4B", city="San Francisco", segment="Regular", credit_limit=500.0),
    ]
    db.add_all(customers)
    db.flush()

    # 5. Realistic Orders & Dispatches
    # Order 1: Delivered smoothly (Blue Harbor Cafe)
    o1 = Order(
        order_number="HUG-1001",
        customer_id=customers[0].id,
        order_date=now - datetime.timedelta(days=12),
        expected_delivery_date=now - datetime.timedelta(days=9),
        status="Delivered",
        subtotal=420.0,
        tax=21.0,
        discount=0.0,
        total_amount=441.0,
        payment_status="Paid",
        priority="Normal",
        notes="Regular weekly wholesale delivery"
    )
    db.add(o1)
    db.flush()
    db.add(OrderItem(order_id=o1.id, product_id=products[0].id, quantity=50, unit_price=4.20, subtotal=210.0))
    db.add(OrderItem(order_id=o1.id, product_id=products[1].id, quantity=40, unit_price=4.80, subtotal=192.0))
    db.add(Payment(order_id=o1.id, customer_id=customers[0].id, amount=441.0, payment_method="Bank Transfer", transaction_ref="TXN-BH-99120", payment_date=now - datetime.timedelta(days=12), status="Success"))
    db.add(Dispatch(order_id=o1.id, delivery_partner="Delhivery", tracking_number="DLV-HUG-1001", dispatch_date=now - datetime.timedelta(days=11), expected_delivery_date=now - datetime.timedelta(days=9), actual_delivery_date=now - datetime.timedelta(days=9), status="Delivered"))

    # Order 2: Delivered smoothly (Equinox)
    o2 = Order(
        order_number="HUG-1002",
        customer_id=customers[1].id,
        order_date=now - datetime.timedelta(days=8),
        expected_delivery_date=now - datetime.timedelta(days=5),
        status="Delivered",
        subtotal=1040.0,
        tax=52.0,
        discount=50.0,
        total_amount=1042.0,
        payment_status="Paid",
        priority="High",
        notes="Studio fridge restock"
    )
    db.add(o2)
    db.flush()
    db.add(OrderItem(order_id=o2.id, product_id=products[2].id, quantity=100, unit_price=5.20, subtotal=520.0))
    db.add(OrderItem(order_id=o2.id, product_id=products[4].id, quantity=100, unit_price=3.90, subtotal=390.0))
    db.add(Payment(order_id=o2.id, customer_id=customers[1].id, amount=1042.0, payment_method="Net Banking", transaction_ref="TXN-EQX-5401", payment_date=now - datetime.timedelta(days=8), status="Success"))
    db.add(Dispatch(order_id=o2.id, delivery_partner="BlueDart", tracking_number="BLD-HUG-1002", dispatch_date=now - datetime.timedelta(days=7), expected_delivery_date=now - datetime.timedelta(days=5), actual_delivery_date=now - datetime.timedelta(days=5), status="Delivered"))

    # Order 3: DELAYED DISPATCH (HUG-1003 for Green Sprout) - Triggering SLA Alert
    o3 = Order(
        order_number="HUG-1003",
        customer_id=customers[2].id,
        order_date=now - datetime.timedelta(days=5),
        expected_delivery_date=now - datetime.timedelta(days=2), # Expected 2 days ago!
        status="Dispatched",
        subtotal=312.0,
        tax=15.60,
        discount=0.0,
        total_amount=327.60,
        payment_status="Paid",
        priority="High",
        notes="Delivery flagged delayed by regional hub"
    )
    db.add(o3)
    db.flush()
    db.add(OrderItem(order_id=o3.id, product_id=products[2].id, quantity=60, unit_price=5.20, subtotal=312.0))
    db.add(Payment(order_id=o3.id, customer_id=customers[2].id, amount=327.60, payment_method="UPI", transaction_ref="UPI-GS-3310", payment_date=now - datetime.timedelta(days=5), status="Success"))
    db.add(Dispatch(order_id=o3.id, delivery_partner="Delhivery", tracking_number="DLV-HUG-1003-DELAY", dispatch_date=now - datetime.timedelta(days=4), expected_delivery_date=now - datetime.timedelta(days=2), actual_delivery_date=None, status="In Transit", carrier_status_notes="Severe linehaul congestion at East Bay Distribution Hub."))

    # Order 4: DELAYED DISPATCH #2 (HUG-1004 for TechHub Cafe)
    o4 = Order(
        order_number="HUG-1004",
        customer_id=customers[5].id,
        order_date=now - datetime.timedelta(days=4),
        expected_delivery_date=now - datetime.timedelta(days=1), # Expected 1 day ago!
        status="Dispatched",
        subtotal=468.0,
        tax=23.40,
        discount=0.0,
        total_amount=491.40,
        payment_status="Paid",
        priority="Normal"
    )
    db.add(o4)
    db.flush()
    db.add(OrderItem(order_id=o4.id, product_id=products[3].id, quantity=90, unit_price=5.20, subtotal=468.0))
    db.add(Payment(order_id=o4.id, customer_id=customers[5].id, amount=491.40, payment_method="Card", transaction_ref="CRD-TH-8812", payment_date=now - datetime.timedelta(days=4), status="Success"))
    db.add(Dispatch(order_id=o4.id, delivery_partner="Delhivery", tracking_number="DLV-HUG-1004-DELAY", dispatch_date=now - datetime.timedelta(days=3), expected_delivery_date=now - datetime.timedelta(days=1), actual_delivery_date=None, status="In Transit", carrier_status_notes="Vehicle breakdown reported by carrier dispatch."))

    # Order 5: FINANCIAL RISK / REVENUE LEAKAGE: Dispatched but Payment FAILED & UNPAID ($1,250)
    o5 = Order(
        order_number="HUG-1005",
        customer_id=customers[3].id, # Urban Roastery (At Risk customer)
        order_date=now - datetime.timedelta(days=6),
        expected_delivery_date=now - datetime.timedelta(days=3),
        status="Dispatched",
        subtotal=1190.0,
        tax=59.50,
        discount=0.0,
        total_amount=1249.50,
        payment_status="Failed",
        priority="High",
        notes="Urgent wholesale order dispatched on good faith"
    )
    db.add(o5)
    db.flush()
    db.add(OrderItem(order_id=o5.id, product_id=products[1].id, quantity=120, unit_price=4.80, subtotal=576.0))
    db.add(OrderItem(order_id=o5.id, product_id=products[4].id, quantity=140, unit_price=3.90, subtotal=546.0))
    db.add(Payment(order_id=o5.id, customer_id=customers[3].id, amount=1249.50, payment_method="Card", transaction_ref="CRD-UR-FAIL-01", payment_date=now - datetime.timedelta(days=6), status="Failed", notes="Card charge declined: Insufficient funds/credit line limit exceeded."))
    db.add(Dispatch(order_id=o5.id, delivery_partner="Shiprocket", tracking_number="SHP-HUG-1005", dispatch_date=now - datetime.timedelta(days=4), expected_delivery_date=now - datetime.timedelta(days=2), actual_delivery_date=None, status="In Transit", carrier_status_notes="Out for final delivery today."))

    # Order 6: BLOCKED BY INVENTORY: Processing order waiting for Hugg Cold Brew Classic (HUG-CB-250)
    o6 = Order(
        order_number="HUG-1006",
        customer_id=customers[0].id, # Blue Harbor
        order_date=now - datetime.timedelta(hours=14),
        expected_delivery_date=now + datetime.timedelta(days=2),
        status="Processing",
        subtotal=210.0,
        tax=10.50,
        discount=0.0,
        total_amount=220.50,
        payment_status="Paid",
        priority="High",
        notes="Awaiting inventory allocation for Hugg Cold Brew Classic"
    )
    db.add(o6)
    db.flush()
    db.add(OrderItem(order_id=o6.id, product_id=products[0].id, quantity=50, unit_price=4.20, subtotal=210.0))
    db.add(Payment(order_id=o6.id, customer_id=customers[0].id, amount=220.50, payment_method="UPI", transaction_ref="UPI-BH-7729", payment_date=now - datetime.timedelta(hours=14), status="Success"))
    db.add(Dispatch(order_id=o6.id, delivery_partner="Hugg Express", tracking_number="TRK-HUG-1006", expected_delivery_date=now + datetime.timedelta(days=2), status="Preparing", carrier_status_notes="Holding in warehouse: Inventory pack queue incomplete."))

    # Order 7: BLOCKED BY INVENTORY #2: Processing order waiting for Hugg Cold Brew Classic (HUG-CB-250)
    o7 = Order(
        order_number="HUG-1007",
        customer_id=customers[4].id, # Zest & Zen
        order_date=now - datetime.timedelta(hours=18),
        expected_delivery_date=now + datetime.timedelta(days=1),
        status="Processing",
        subtotal=168.0,
        tax=8.40,
        discount=0.0,
        total_amount=176.40,
        payment_status="Paid",
        priority="Normal"
    )
    db.add(o7)
    db.flush()
    db.add(OrderItem(order_id=o7.id, product_id=products[0].id, quantity=40, unit_price=4.20, subtotal=168.0))
    db.add(Payment(order_id=o7.id, customer_id=customers[4].id, amount=176.40, payment_method="Card", transaction_ref="CRD-ZZ-1102", payment_date=now - datetime.timedelta(hours=18), status="Success"))
    db.add(Dispatch(order_id=o7.id, delivery_partner="Delhivery", tracking_number="TRK-HUG-1007", expected_delivery_date=now + datetime.timedelta(days=1), status="Preparing", carrier_status_notes="Awaiting picking: SKU HUG-CB-250 stock depleted."))

    # Order 8: TODAY'S NEW ORDER (Direct consumer)
    o8 = Order(
        order_number="HUG-1008",
        customer_id=customers[7].id, # Liam Davies
        order_date=now - datetime.timedelta(hours=3),
        expected_delivery_date=now + datetime.timedelta(days=3),
        status="New",
        subtotal=41.60,
        tax=2.08,
        discount=0.0,
        total_amount=43.68,
        payment_status="Paid",
        priority="Normal"
    )
    db.add(o8)
    db.flush()
    db.add(OrderItem(order_id=o8.id, product_id=products[2].id, quantity=8, unit_price=5.20, subtotal=41.60))
    db.add(Payment(order_id=o8.id, customer_id=customers[7].id, amount=43.68, payment_method="Card", transaction_ref="CRD-D2C-994", payment_date=now - datetime.timedelta(hours=3), status="Success"))
    db.add(Dispatch(order_id=o8.id, delivery_partner="Blip", tracking_number="BLP-HUG-1008", expected_delivery_date=now + datetime.timedelta(days=3), status="Preparing"))

    # Order 9: TODAY'S NEW ORDER #2 (Maya Sterling)
    o9 = Order(
        order_number="HUG-1009",
        customer_id=customers[8].id,
        order_date=now - datetime.timedelta(hours=1),
        expected_delivery_date=now + datetime.timedelta(days=2),
        status="Confirmed",
        subtotal=66.0,
        tax=3.30,
        discount=5.0,
        total_amount=64.30,
        payment_status="Paid",
        priority="Normal"
    )
    db.add(o9)
    db.flush()
    db.add(OrderItem(order_id=o9.id, product_id=products[6].id, quantity=12, unit_price=5.50, subtotal=66.0))
    db.add(Payment(order_id=o9.id, customer_id=customers[8].id, amount=64.30, payment_method="UPI", transaction_ref="UPI-D2C-773", payment_date=now - datetime.timedelta(hours=1), status="Success"))
    db.add(Dispatch(order_id=o9.id, delivery_partner="Delhivery", tracking_number="DLV-HUG-1009", expected_delivery_date=now + datetime.timedelta(days=2), status="Preparing"))

    # Order 10: Cancelled order (Demonstrating stock release)
    o10 = Order(
        order_number="HUG-1010",
        customer_id=customers[6].id,
        order_date=now - datetime.timedelta(days=2),
        expected_delivery_date=now + datetime.timedelta(days=1),
        status="Cancelled",
        subtotal=234.0,
        tax=11.70,
        discount=0.0,
        total_amount=245.70,
        payment_status="Refunded",
        priority="Normal",
        cancellation_reason="Customer ordered incorrect SKU variant (meant to order Matcha Oat Latte instead of Kombucha)."
    )
    db.add(o10)
    db.flush()
    db.add(OrderItem(order_id=o10.id, product_id=products[2].id, quantity=45, unit_price=5.20, subtotal=234.0))

    # 6. Customer Complaints
    complaints = [
        Complaint(
            complaint_number="CMP-2001",
            customer_id=customers[2].id, # Green Sprout
            order_id=o3.id,
            category="Delivery Delay",
            description="Our wholesale shipment is 48 hours overdue. We have run out of Wild Berry Kombucha on our shelves for the weekend crowd.",
            priority="High",
            status="Open",
            ai_sentiment="Frustrated",
            ai_suggested_resolution="Escalate to Delhivery regional coordinator, provide real-time GPS location, and apply $35 shipping credit.",
            assigned_to_id=users[4].id, # Rohan Verma
            created_at=now - datetime.timedelta(hours=26)
        ),
        Complaint(
            complaint_number="CMP-2002",
            customer_id=customers[5].id, # TechHub Cafe
            order_id=o4.id,
            category="Delivery Delay",
            description="Second time this month Delhivery has missed delivery ETA. When will our ginger turmeric cartons arrive?",
            priority="High",
            status="In Progress",
            ai_sentiment="Frustrated",
            ai_suggested_resolution="Assign courier account manager escalation and expedite replacement batch via Blip.",
            assigned_to_id=users[4].id,
            created_at=now - datetime.timedelta(hours=14)
        ),
        Complaint(
            complaint_number="CMP-2003",
            customer_id=customers[0].id, # Blue Harbor Cafe
            order_id=o1.id,
            category="Packaging Damaged",
            description="Two cases from batch #EB-44 had 4 bottles with cracked caps and micro-leakage in the shipping carton.",
            priority="Urgent",
            status="Open",
            ai_sentiment="Critical Risk",
            ai_suggested_resolution="Alert EcoPack Glass Solutions regarding seal tolerance defects, credit customer account for damaged units, and inspect remaining warehouse inventory.",
            assigned_to_id=users[1].id, # Sarah Jenkins
            created_at=now - datetime.timedelta(hours=8)
        )
    ]
    db.add_all(complaints)
    db.flush()

    # 7. Initial Purchase Orders
    po1 = PurchaseOrder(
        po_number="PO-5001",
        supplier_id=suppliers[0].id, # Equator Coffee
        product_id=products[1].id,
        quantity=200,
        unit_cost=1.85,
        total_amount=370.0,
        status="Received",
        created_at=now - datetime.timedelta(days=15),
        expected_date=now - datetime.timedelta(days=9)
    )
    db.add(po1)

    po2 = PurchaseOrder(
        po_number="PO-5002",
        supplier_id=suppliers[1].id, # EcoPack (Delayed!)
        product_id=products[0].id,
        quantity=300,
        unit_cost=1.60,
        total_amount=480.0,
        status="Ordered",
        created_at=now - datetime.timedelta(days=10),
        expected_date=now - datetime.timedelta(days=3) # Past due from EcoPack!
    )
    db.add(po2)
    db.flush()

    # 8. Audit Logs
    audit_entries = [
        AuditLog(user_name="Dev Patel", user_role="Inventory Manager", action="STOCK_CHECK", module="Inventory", details="Identified stock depletion for Hugg Cold Brew Classic (12 units remaining)", timestamp=now - datetime.timedelta(hours=16)),
        AuditLog(user_name="System AI", user_role="System", action="AI_ALERT", module="AI Intelligence", details="Generated proactive risk alert for blocked orders HUG-1006 and HUG-1007", timestamp=now - datetime.timedelta(hours=12)),
        AuditLog(user_name="Sarah Jenkins", user_role="Operations Manager", action="STATUS_CHANGE", module="Orders", details="Updated Order HUG-1003 status to Dispatched via Delhivery", timestamp=now - datetime.timedelta(days=4)),
        AuditLog(user_name="Rohan Verma", user_role="Customer Support", action="ASSIGN_TICKET", module="Complaints", details="Assigned complaint CMP-2001 to courier escalation desk", timestamp=now - datetime.timedelta(hours=22)),
    ]
    db.add_all(audit_entries)

    db.commit()

    # Run AI engine initial scan to generate rich insights from seeded records!
    from app.ai.engine import proactive_engine
    from app.ai.daily_briefing import generate_daily_briefing
    proactive_engine.run_full_business_scan(db)
    generate_daily_briefing(db, force_refresh=True)

    print("Demo data seeded successfully with realistic beverage operations!")
