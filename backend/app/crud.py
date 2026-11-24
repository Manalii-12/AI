import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from app.models import (
    User, Customer, Supplier, Product, StockMovement, Order, OrderItem,
    Payment, Dispatch, Complaint, PurchaseOrder, AiInsight, AiAction,
    DailyBriefing, AuditLog
)
from app.schemas import (
    OrderCreate, CustomerCreate, CustomerUpdate, ProductCreate, ProductUpdate,
    SupplierCreate, SupplierUpdate, PaymentCreate, DispatchCreate, DispatchUpdate,
    ComplaintCreate, ComplaintUpdate, PurchaseOrderCreate
)

def log_audit(db: Session, action: str, module: str, details: str, user_name: str = "System", user_role: str = "System"):
    entry = AuditLog(
        user_name=user_name,
        user_role=user_role,
        action=action,
        module=module,
        details=details,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    return entry

# ----------------- CUSTOMERS -----------------
def get_customers(db: Session, segment: str = None, search: str = None):
    query = db.query(Customer)
    if segment:
        query = query.filter(Customer.segment == segment)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(or_(Customer.name.ilike(search_fmt), Customer.email.ilike(search_fmt)))
    
    customers = query.order_by(Customer.created_at.desc()).all()
    results = []
    now = datetime.datetime.utcnow()

    for c in customers:
        orders = c.orders
        total_spent = sum(o.total_amount for o in orders if o.status != "Cancelled")
        
        # Calculate outstanding payments: Orders that are not cancelled and not fully paid
        outstanding = sum(
            (o.total_amount - sum(p.amount for p in o.payments if p.status == "Success"))
            for o in orders if o.status != "Cancelled" and o.payment_status != "Paid"
        )
        outstanding = max(0.0, round(outstanding, 2))
        
        last_order = max((o.order_date for o in orders), default=None)
        complaint_count = len(c.complaints)

        # Dynamic RFM segmentation helper
        calculated_segment = c.segment
        if total_spent > 1000.0 or len(orders) >= 5:
            calculated_segment = "VIP"
        elif last_order and (now - last_order).days > 45:
            calculated_segment = "At Risk"
        elif len(orders) == 1 and (now - c.created_at).days <= 30:
            calculated_segment = "New"
        elif not last_order and (now - c.created_at).days > 60:
            calculated_segment = "Inactive"

        results.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "address": c.address,
            "city": c.city,
            "segment": calculated_segment,
            "credit_limit": c.credit_limit,
            "total_orders": len(orders),
            "total_spent": round(total_spent, 2),
            "outstanding_balance": outstanding,
            "complaint_count": complaint_count,
            "last_order_date": last_order,
            "created_at": c.created_at
        })
    return results

def create_customer(db: Session, c_in: CustomerCreate):
    c = Customer(**c_in.dict())
    db.add(c)
    db.commit()
    db.refresh(c)
    log_audit(db, "CREATE", "Customers", f"Created customer {c.name} ({c.email})")
    return c

def update_customer(db: Session, customer_id: int, c_in: CustomerUpdate):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        return None
    for field, val in c_in.dict(exclude_unset=True).items():
        setattr(c, field, val)
    db.commit()
    db.refresh(c)
    log_audit(db, "UPDATE", "Customers", f"Updated customer {c.name}")
    return c

# ----------------- PRODUCTS -----------------
def get_products(db: Session, category: str = None, search: str = None):
    query = db.query(Product)
    if category:
        query = query.filter(Product.category == category)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(or_(Product.name.ilike(search_fmt), Product.sku.ilike(search_fmt)))
    
    products = query.order_by(Product.name).all()
    results = []
    
    # Calculate 30-day velocity from order items
    thirty_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=30)

    for p in products:
        available = max(0, p.stock_quantity - p.reserved_stock)
        
        if p.stock_quantity <= 0:
            stock_status = "Out of Stock"
        elif available <= p.reorder_level:
            stock_status = "Low Stock"
        elif available > p.reorder_level * 5:
            stock_status = "Excess"
        else:
            stock_status = "In Stock"

        # Calculate sales velocity
        velocity = db.query(func.sum(OrderItem.quantity)).join(Order).filter(
            OrderItem.product_id == p.id,
            Order.order_date >= thirty_days_ago,
            Order.status != "Cancelled"
        ).scalar() or 0

        is_anomaly = False
        root_cause = None
        resolution = None

        supplier_title = p.supplier.name if p.supplier else "primary vendor"
        if stock_status == "Out of Stock":
            is_anomaly = True
            root_cause = f"Depleted Inventory: Surging 30-day demand velocity ({int(velocity)} units) exhausted safety buffer stock. Central warehouse has 0 units available."
            resolution = f"Step 1: Auto-generate Emergency Purchase Order for {p.reorder_quantity} units with {supplier_title}. Step 2: Route pending orders to alternate SKU variant. Step 3: Fast-track dock receipt upon shipment arrival."
        elif stock_status == "Low Stock":
            is_anomaly = True
            root_cause = f"Safety Threshold Breached: Available stock ({available} units) dropped below minimum threshold ({p.reorder_level} units). Runway under 48 hours."
            resolution = f"Step 1: Issue replenishment purchase order for {p.reorder_quantity} units with {supplier_title}. Step 2: Confirm vendor lead time. Step 3: Reserve remaining stock for priority wholesale contracts."
        elif stock_status == "Excess":
            is_anomaly = True
            root_cause = f"Overstock Concentration: Current stock ({available} units) exceeds 5x reorder threshold ({p.reorder_level * 5} units). Capital locked in slow-moving inventory."
            resolution = "Step 1: Bundle with top-selling cold brews at 15% promotional discount. Step 2: Pitch exclusive wholesale tasting cases to cafe partners."
        else:
            root_cause = f"Optimal Inventory Health: Available stock ({available} units) comfortably meets projected 30-day run rate."
            resolution = "Step 1: Maintain regular monitoring. Step 2: Trigger standard automated PO when reaching reorder level."

        results.append({
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "category": p.category,
            "description": p.description,
            "unit": p.unit,
            "cost_price": p.cost_price,
            "selling_price": p.selling_price,
            "stock_quantity": p.stock_quantity,
            "reserved_stock": p.reserved_stock,
            "available_stock": available,
            "reorder_level": p.reorder_level,
            "reorder_quantity": p.reorder_quantity,
            "stock_status": stock_status,
            "supplier_id": p.supplier_id,
            "supplier_name": p.supplier.name if p.supplier else "N/A",
            "image_url": p.image_url,
            "status": p.status,
            "sales_velocity_30d": int(velocity),
            "created_at": p.created_at,
            "root_cause": root_cause,
            "ai_suggested_resolution": resolution,
            "is_anomaly": is_anomaly
        })
    return results

def create_product(db: Session, p_in: ProductCreate):
    p = Product(**p_in.dict())
    db.add(p)
    db.commit()
    db.refresh(p)
    # Log initial stock movement if quantity > 0
    if p.stock_quantity > 0:
        sm = StockMovement(
            product_id=p.id,
            movement_type="IN",
            quantity=p.stock_quantity,
            reference_type="INITIAL",
            notes="Initial stock upon creation",
            created_by="Admin"
        )
        db.add(sm)
        db.commit()
    log_audit(db, "CREATE", "Inventory", f"Added product {p.name} (SKU: {p.sku})")
    return p

def update_product(db: Session, product_id: int, p_in: ProductUpdate):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        return None
    for field, val in p_in.dict(exclude_unset=True).items():
        setattr(p, field, val)
    db.commit()
    db.refresh(p)
    log_audit(db, "UPDATE", "Inventory", f"Updated product {p.name}")
    return p

def adjust_stock(db: Session, product_id: int, movement_type: str, quantity: int, notes: str, user_name: str = "Admin"):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        return None
    
    if movement_type in ["IN", "RELEASED"]:
        p.stock_quantity += quantity
    elif movement_type in ["OUT", "RESERVED"]:
        p.stock_quantity = max(0, p.stock_quantity - quantity)
    elif movement_type == "ADJUSTMENT":
        p.stock_quantity = quantity

    sm = StockMovement(
        product_id=p.id,
        movement_type=movement_type,
        quantity=quantity,
        reference_type="MANUAL_ADJUSTMENT",
        notes=notes,
        created_by=user_name,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(sm)
    db.commit()
    db.refresh(p)
    log_audit(db, "ADJUST_STOCK", "Inventory", f"Adjusted stock for {p.name} ({movement_type} {quantity}). Notes: {notes}", user_name=user_name)
    return p

def get_stock_movements(db: Session, product_id: int = None, limit: int = 50):
    query = db.query(StockMovement)
    if product_id:
        query = query.filter(StockMovement.product_id == product_id)
    movements = query.order_by(StockMovement.timestamp.desc()).limit(limit).all()
    results = []
    for sm in movements:
        results.append({
            "id": sm.id,
            "product_id": sm.product_id,
            "product_name": sm.product.name if sm.product else "Unknown",
            "product_sku": sm.product.sku if sm.product else "N/A",
            "movement_type": sm.movement_type,
            "quantity": sm.quantity,
            "reference_type": sm.reference_type,
            "reference_id": sm.reference_id,
            "notes": sm.notes,
            "created_by": sm.created_by,
            "timestamp": sm.timestamp
        })
    return results

# ----------------- ORDERS -----------------
def create_order(db: Session, order_in: OrderCreate, user_name: str = "System"):
    customer = db.query(Customer).filter(Customer.id == order_in.customer_id).first()
    if not customer:
        raise ValueError(f"Customer with ID {order_in.customer_id} does not exist.")

    # Generate order number
    count = db.query(func.count(Order.id)).scalar() or 0
    order_number = f"HUG-{1000 + count + 1}"

    subtotal = 0.0
    items_to_create = []

    for item_data in order_in.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise ValueError(f"Product ID {item_data.product_id} not found.")
        
        unit_price = item_data.unit_price if item_data.unit_price is not None else product.selling_price
        item_subtotal = round(unit_price * item_data.quantity, 2)
        subtotal += item_subtotal

        # Reserve stock
        product.reserved_stock += item_data.quantity
        sm = StockMovement(
            product_id=product.id,
            movement_type="RESERVED",
            quantity=item_data.quantity,
            reference_type="ORDER",
            reference_id=order_number,
            notes=f"Reserved for order {order_number}",
            created_by=user_name
        )
        db.add(sm)

        items_to_create.append({
            "product_id": product.id,
            "quantity": item_data.quantity,
            "unit_price": unit_price,
            "subtotal": item_subtotal
        })

    tax = round(subtotal * 0.05, 2) # 5% beverage tax
    discount = order_in.discount or 0.0
    total_amount = max(0.0, round(subtotal + tax - discount, 2))

    expected_delivery = order_in.expected_delivery_date or (datetime.datetime.utcnow() + datetime.timedelta(days=3))

    order = Order(
        order_number=order_number,
        customer_id=customer.id,
        order_date=datetime.datetime.utcnow(),
        expected_delivery_date=expected_delivery,
        status="New",
        subtotal=round(subtotal, 2),
        tax=tax,
        discount=discount,
        total_amount=total_amount,
        payment_status="Unpaid",
        priority=order_in.priority or "Normal",
        notes=order_in.notes
    )
    db.add(order)
    db.flush()

    for it in items_to_create:
        db_item = OrderItem(
            order_id=order.id,
            product_id=it["product_id"],
            quantity=it["quantity"],
            unit_price=it["unit_price"],
            subtotal=it["subtotal"]
        )
        db.add(db_item)

    # Automatically initialize Dispatch record in Preparing status
    dispatch = Dispatch(
        order_id=order.id,
        delivery_partner="Hugg Express",
        tracking_number=f"TRK-{order_number}",
        expected_delivery_date=expected_delivery,
        status="Preparing"
    )
    db.add(dispatch)

    db.commit()
    db.refresh(order)
    log_audit(db, "CREATE", "Orders", f"Created order {order.order_number} for {customer.name} (Total: ${order.total_amount})", user_name=user_name)
    return order

def update_order_status(db: Session, order_id: int, new_status: str, notes: str = None, cancellation_reason: str = None, user_name: str = "Admin"):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return None

    old_status = order.status
    order.status = new_status
    if notes:
        order.notes = (order.notes or "") + f"\n[{datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {notes}"
    if cancellation_reason:
        order.cancellation_reason = cancellation_reason

    # Inventory progression rules
    if new_status == "Cancelled" and old_status != "Cancelled":
        # Release reserved stock back
        for item in order.items:
            product = item.product
            product.reserved_stock = max(0, product.reserved_stock - item.quantity)
            sm = StockMovement(
                product_id=product.id,
                movement_type="RELEASED",
                quantity=item.quantity,
                reference_type="ORDER_CANCELLED",
                reference_id=order.order_number,
                notes=f"Released reserved stock upon cancellation: {cancellation_reason or 'No reason provided'}",
                created_by=user_name
            )
            db.add(sm)
        if order.dispatch:
            order.dispatch.status = "Failed"
            order.dispatch.carrier_status_notes = f"Order Cancelled: {cancellation_reason or ''}"

    elif new_status == "Dispatched" and old_status not in ["Dispatched", "Delivered"]:
        # Order dispatched: Deduct available stock quantity and release reserved stock
        for item in order.items:
            product = item.product
            product.stock_quantity = max(0, product.stock_quantity - item.quantity)
            product.reserved_stock = max(0, product.reserved_stock - item.quantity)
            sm = StockMovement(
                product_id=product.id,
                movement_type="OUT",
                quantity=item.quantity,
                reference_type="DISPATCH",
                reference_id=order.order_number,
                notes=f"Dispatched order {order.order_number}",
                created_by=user_name
            )
            db.add(sm)

        if order.dispatch:
            order.dispatch.status = "In Transit"
            order.dispatch.dispatch_date = datetime.datetime.utcnow()

    elif new_status == "Delivered":
        if order.dispatch:
            order.dispatch.status = "Delivered"
            order.dispatch.actual_delivery_date = datetime.datetime.utcnow()

    db.commit()
    db.refresh(order)
    log_audit(db, "STATUS_CHANGE", "Orders", f"Order {order.order_number} status changed from {old_status} to {new_status}", user_name=user_name)
    return order

def diagnose_order_status(o):
    notes = (o.notes or "").lower()
    cancellation = (o.cancellation_reason or "").lower()
    
    # Check for SKU stockout in order items
    has_stockout = False
    stockout_sku = None
    for it in o.items:
        if it.product and it.product.stock_quantity <= 0:
            has_stockout = True
            stockout_sku = f"{it.product.name} ({it.product.sku})"
            break

    # 1. Processing blocked by stockout
    if o.status == "Processing" and (has_stockout or "stockout" in notes or "restock" in notes):
        return {
            "is_bottleneck": True,
            "root_cause": f"Fulfillment Blocked: Central warehouse has 0 available units of {stockout_sku or 'beverage SKU'}. Safety buffer breached.",
            "ai_suggested_resolution": "Step 1: Auto-generate Emergency Purchase Order with primary supplier BeanCraft. Step 2: Notify customer with ETA update. Step 3: Fast-track dock-to-pack receipt upon arrival."
        }
    
    # 2. Processing with unpaid net-30 terms / credit review
    if o.status == "Processing" and (o.payment_status in ["Unpaid", "Failed"] or "unpaid" in notes or "credit review" in notes):
        cust_name = o.customer.name if o.customer else "Customer"
        return {
            "is_bottleneck": True,
            "root_cause": f"Fulfillment on Hold: Net-30 commercial credit review pending for {cust_name} (Invoice Exposure: ₹{o.total_amount:,.2f}). Physical dispatch held until credit approval.",
            "ai_suggested_resolution": "Step 1: Check customer payment history & D&B risk score. Step 2: Request 40% advance settlement via dynamic UPI mandate link. Step 3: Auto-clear for packing upon receipt confirmation."
        }
        
    # 3. Processing with carrier route hold
    if o.status == "Processing" and ("carrier route hold" in notes or "transit freeze" in notes):
        return {
            "is_bottleneck": True,
            "root_cause": "Carrier Route Hold: Destination terminal reporting transit freeze / cold chain capacity crunch. Shipment staged at packing dock to avoid beverage spoilage.",
            "ai_suggested_resolution": "Step 1: Re-assign consignment to Bluedart Air Cargo corridor. Step 2: Generate priority airway bill with temperature logging. Step 3: Release packing run."
        }

    # 4. Dispatched but flagged delayed
    now_utc = datetime.datetime.utcnow()
    is_delayed = False
    if o.dispatch and (o.dispatch.status == "Delayed" or (o.dispatch.expected_delivery_date and now_utc > o.dispatch.expected_delivery_date and o.dispatch.status not in ["Delivered", "Cancelled"])):
        is_delayed = True
    elif "delayed" in notes or (o.expected_delivery_date and o.expected_delivery_date < now_utc and o.status not in ["Delivered", "Cancelled"]):
        is_delayed = True

    if o.status == "Dispatched" and is_delayed:
        carrier = o.dispatch.delivery_partner if o.dispatch else "Logistics Carrier"
        return {
            "is_bottleneck": True,
            "root_cause": f"Delivery SLA Breached: In-transit sorting stall at {carrier} regional sorting hub. Projected delay: +24 to +36 hours.",
            "ai_suggested_resolution": "Step 1: Transmit high-priority SLA escalation ping to carrier dispatch desk. Step 2: Send live GPS vehicle tracking link & delay alert SMS to customer. Step 3: Offer 10% goodwill courtesy discount."
        }

    # 5. Dispatched with unpaid risk / failed payment
    if o.status == "Dispatched" and o.payment_status in ["Failed", "Unpaid"]:
        return {
            "is_bottleneck": True,
            "root_cause": f"High Revenue Risk: Shipment dispatched on good faith, but payment gateway recorded Failed/Unpaid transaction (₹{o.total_amount:,.2f}).",
            "ai_suggested_resolution": "Step 1: Issue high-urgency UPI collection link to customer finance contact. Step 2: Request courier delivery OTP hold (handover only after payment confirmation). Step 3: Reconcile ledger."
        }

    # 6. Cancelled
    if o.status == "Cancelled":
        return {
            "is_bottleneck": False,
            "root_cause": f"Order Terminated: {o.cancellation_reason or 'Customer initiated cancellation prior to packaging.'}",
            "ai_suggested_resolution": "Step 1: Verify reserved warehouse inventory released to active ledger. Step 2: Confirm refund transaction posted or credit voucher issued to customer."
        }

    # 7. Normal healthy orders
    if o.status == "Delivered":
        return {
            "is_bottleneck": False,
            "root_cause": "Delivery Successfully Completed: Proof of delivery verified; zero logistics exceptions logged.",
            "ai_suggested_resolution": "Step 1: Request post-delivery customer satisfaction rating. Step 2: Trigger automated replenishment reminder in 7 days."
        }

    if o.status == "Packed":
        return {
            "is_bottleneck": False,
            "root_cause": "Packaging Complete: Quality inspection passed, temperature-controlled carton sealed, awaiting carrier pickup.",
            "ai_suggested_resolution": "Step 1: Hand over manifest to courier partner at 17:00 IST dock window. Step 2: Transition dispatch status to In Transit."
        }

    return {
        "is_bottleneck": False,
        "root_cause": f"Order Status: {o.status}. Inventory reserved in central warehouse. Scheduled for standard fulfillment batch.",
        "ai_suggested_resolution": "Step 1: Verify order items against warehouse picking wave. Step 2: Advance to Processing once picking list is confirmed."
    }

def get_orders(db: Session, status: str = None, payment_status: str = None, search: str = None, limit: int = 100):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    if payment_status:
        query = query.filter(Order.payment_status == payment_status)
    if search:
        search_fmt = f"%{search}%"
        query = query.join(Customer).filter(or_(Order.order_number.ilike(search_fmt), Customer.name.ilike(search_fmt)))

    orders = query.order_by(Order.order_date.desc()).limit(limit).all()
    results = []
    for o in orders:
        items_out = []
        for it in o.items:
            items_out.append({
                "id": it.id,
                "product_id": it.product_id,
                "product_name": it.product.name if it.product else "Unknown",
                "product_sku": it.product.sku if it.product else "N/A",
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "subtotal": it.subtotal
            })
        
        diag = diagnose_order_status(o)

        results.append({
            "id": o.id,
            "order_number": o.order_number,
            "customer_id": o.customer_id,
            "customer_name": o.customer.name if o.customer else "Unknown",
            "customer_email": o.customer.email if o.customer else "N/A",
            "order_date": o.order_date,
            "expected_delivery_date": o.expected_delivery_date,
            "status": o.status,
            "subtotal": o.subtotal,
            "tax": o.tax,
            "discount": o.discount,
            "total_amount": o.total_amount,
            "payment_status": o.payment_status,
            "priority": o.priority,
            "notes": o.notes,
            "cancellation_reason": o.cancellation_reason,
            "items": items_out,
            "has_dispatch": o.dispatch is not None,
            "dispatch_status": o.dispatch.status if o.dispatch else None,
            "tracking_number": o.dispatch.tracking_number if o.dispatch else None,
            "created_at": o.created_at,
            "root_cause": diag["root_cause"],
            "ai_suggested_resolution": diag["ai_suggested_resolution"],
            "is_bottleneck": diag["is_bottleneck"]
        })
    return results

def get_order_by_id(db: Session, order_id: int):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        return None
    items_out = []
    for it in o.items:
        items_out.append({
            "id": it.id,
            "product_id": it.product_id,
            "product_name": it.product.name if it.product else "Unknown",
            "product_sku": it.product.sku if it.product else "N/A",
            "quantity": it.quantity,
            "unit_price": it.unit_price,
            "subtotal": it.subtotal
        })
    diag = diagnose_order_status(o)
    return {
        "id": o.id,
        "order_number": o.order_number,
        "customer_id": o.customer_id,
        "customer_name": o.customer.name if o.customer else "Unknown",
        "customer_email": o.customer.email if o.customer else "N/A",
        "order_date": o.order_date,
        "expected_delivery_date": o.expected_delivery_date,
        "status": o.status,
        "subtotal": o.subtotal,
        "tax": o.tax,
        "discount": o.discount,
        "total_amount": o.total_amount,
        "payment_status": o.payment_status,
        "priority": o.priority,
        "notes": o.notes,
        "cancellation_reason": o.cancellation_reason,
        "items": items_out,
        "has_dispatch": o.dispatch is not None,
        "dispatch_status": o.dispatch.status if o.dispatch else None,
        "tracking_number": o.dispatch.tracking_number if o.dispatch else None,
        "created_at": o.created_at,
        "root_cause": diag["root_cause"],
        "ai_suggested_resolution": diag["ai_suggested_resolution"],
        "is_bottleneck": diag["is_bottleneck"]
    }

# ----------------- PAYMENTS -----------------
def create_payment(db: Session, p_in: PaymentCreate, user_name: str = "System"):
    order = db.query(Order).filter(Order.id == p_in.order_id).first()
    if not order:
        raise ValueError(f"Order {p_in.order_id} not found.")

    payment = Payment(
        order_id=order.id,
        customer_id=order.customer_id,
        amount=p_in.amount,
        payment_method=p_in.payment_method,
        transaction_ref=p_in.transaction_ref,
        payment_date=datetime.datetime.utcnow(),
        status=p_in.status,
        notes=p_in.notes
    )
    db.add(payment)
    db.flush()

    # Recalculate order payment status based on all successful payments
    total_paid = db.query(func.sum(Payment.amount)).filter(
        Payment.order_id == order.id,
        Payment.status == "Success"
    ).scalar() or 0.0

    if p_in.status == "Success":
        if total_paid >= order.total_amount:
            order.payment_status = "Paid"
        elif total_paid > 0:
            order.payment_status = "Partial"
    elif p_in.status == "Failed":
        if total_paid == 0:
            order.payment_status = "Failed"

    db.commit()
    db.refresh(payment)
    log_audit(db, "CREATE", "Payments", f"Recorded payment ${payment.amount} for Order {order.order_number} ({payment.status})", user_name=user_name)
    return payment

def get_payments(db: Session, status: str = None, search: str = None, limit: int = 100):
    query = db.query(Payment)
    if status:
        query = query.filter(Payment.status == status)
    payments = query.order_by(Payment.payment_date.desc()).limit(limit).all()
    results = []
    
    # Check for duplicate transaction refs
    ref_counts = {}
    for p in payments:
        if p.transaction_ref:
            ref_counts[p.transaction_ref] = ref_counts.get(p.transaction_ref, 0) + 1

    for p in payments:
        is_mismatch = False
        if p.order and p.status == "Success" and abs(p.amount - p.order.total_amount) > 1.0:
            is_mismatch = True

        pay_status = "Duplicate" if p.transaction_ref and ref_counts.get(p.transaction_ref, 0) > 1 else p.status
        root_cause = None
        resolution = None

        cust_name = p.customer.name if p.customer else "Customer"
        ord_num = p.order.order_number if p.order else "Order"
        ord_tot = f"₹{p.order.total_amount:,.2f}" if p.order else "₹0.00"
        paid_str = f"₹{p.amount:,.2f}"

        if pay_status == "Failed":
            root_cause = f"Gateway Authorization Failure: Payment attempt for {ord_num} ({cust_name}) was declined by the card/bank network. Reason: {p.notes or 'Card issuer declined: Insufficient funds or credit line limit reached'}."
            resolution = (
                f"Step 1: Automated Payment Mandate - Dispatch real-time UPI Dynamic QR payment link to {cust_name}. "
                f"Step 2: Logistics Transit Hold - Place immediate warehouse dispatch freeze on {ord_num} until settlement confirms. "
                f"Step 3: Account Recovery - Queue automated WhatsApp and email reminder with 24h grace window."
            )
        elif is_mismatch:
            diff = abs(p.amount - (p.order.total_amount if p.order else 0.0))
            root_cause = f"Invoice Ledger Mismatch: Remittance of {paid_str} differs from invoice total {ord_tot} by ₹{diff:,.2f}. Root Cause: Customer withheld 10% TDS without submitting Form 16A withholding certificate or made partial milestone payment."
            resolution = (
                f"Step 1: Ledger Reconciliation - Issue split credit adjustment voucher for ₹{diff:,.2f} pending TDS certification. "
                f"Step 2: Automated Form 16A Request - Transmit automated TDS deduction compliance request to {cust_name}. "
                f"Step 3: Milestone Reschedule - Align remaining balance with delivery milestone schedule."
            )
        elif pay_status == "Duplicate":
            root_cause = f"Webhook Idempotency Re-execution: Payment gateway dispatched duplicate callback events for transaction reference {p.transaction_ref}, resulting in dual ledger entries for {ord_num}."
            resolution = (
                f"Step 1: Void Duplicate Ledger Entry - Deactivate redundant transaction {p.transaction_ref} and log audit adjustment. "
                f"Step 2: Gateway Settlement Audit - Verify single capture status on merchant gateway dashboard. "
                f"Step 3: Customer Statement Verification - Ensure customer account reflects zero duplicate debit."
            )

        results.append({
            "id": p.id,
            "order_id": p.order_id,
            "order_number": p.order.order_number if p.order else "Unknown",
            "customer_id": p.customer_id,
            "customer_name": p.customer.name if p.customer else "Unknown",
            "amount": p.amount,
            "payment_method": p.payment_method,
            "transaction_ref": p.transaction_ref,
            "payment_date": p.payment_date,
            "status": pay_status,
            "notes": p.notes,
            "order_total": p.order.total_amount if p.order else 0.0,
            "is_mismatch": is_mismatch,
            "root_cause": root_cause,
            "ai_suggested_resolution": resolution
        })
    return results

# ----------------- DISPATCH -----------------
def diagnose_dispatch(d, is_delayed, delay_hours):
    notes = (d.carrier_status_notes or "").lower()
    carrier = d.delivery_partner or "Logistics Partner"
    trk = d.tracking_number or "N/A"
    ord_num = d.order.order_number if d.order else "Order"
    cust_name = d.order.customer.name if (d.order and d.order.customer) else "Customer"
    city = d.order.customer.city if (d.order and d.order.customer) else "Destination"

    # Delivered or cancelled with no issue
    if d.status in ["Delivered", "Cancelled"] and not is_delayed:
        return {
            "has_issue": False,
            "root_cause": "Consignment successfully delivered within verified SLA window.",
            "ai_suggested_resolution": "Proof of delivery confirmed by customer signature and optical scan.",
            "action_type": None,
            "action_label": None
        }

    # 1. Linehaul sorting hub congestion (e.g. DLV-HUG-1003-DELAY)
    if "congestion" in notes or "hub" in notes or "sorting" in notes:
        return {
            "has_issue": True,
            "root_cause": f"Logistics Sorting Bottleneck: {carrier} regional distribution center reported severe linehaul sorting congestion, stalling consignment {trk} by +{delay_hours}h past promised delivery SLA.",
            "ai_suggested_resolution": f"Step 1: Priority SLA Escalation - Issue automated high-priority SLA breach ticket to {carrier} dispatch desk. Step 2: Proactive Notification - Send real-time GPS tracking link and delay apology SMS to {cust_name}. Step 3: Compensation - Auto-credit 10% courtesy discount.",
            "action_type": "ESCALATE_COURIER_SLA",
            "action_label": f"Escalate {carrier} SLA & Send GPS Link"
        }

    # 2. Vehicle breakdown (e.g. DLV-HUG-1004-DELAY)
    if "breakdown" in notes or "vehicle" in notes or "mechanical" in notes:
        return {
            "has_issue": True,
            "root_cause": f"Logistics In-Transit Breakdown: Mechanical breakdown reported on {carrier} linehaul vehicle on western transit route #W-4, halting physical consignment movement for #{ord_num}.",
            "ai_suggested_resolution": f"Step 1: Air Cargo Corridor Re-route - Intercept parcel at intermediate depot and re-assign to BlueDart Express Air Courier for priority delivery within 4 hours. Step 2: Customer Update - Transmit new air waybill tracking to {cust_name}.",
            "action_type": "RE_ROUTE_AIR",
            "action_label": "Re-Route to BlueDart Air Courier"
        }

    # 3. Regional transit embargo / route restriction (e.g. DLV-EMBARGO-CHI)
    if "embargo" in notes or "route restriction" in notes or "transit freeze" in notes:
        return {
            "has_issue": True,
            "root_cause": f"Regional Route Embargo: Destination terminal cold-chain route restriction and transit embargo at Chicago South hub blocking road freight for #{ord_num}.",
            "ai_suggested_resolution": "Step 1: Corridor Diversion - Divert consignment through alternative northern air cargo flight corridor with temperature-monitored freight. Step 2: Release Packaging - Clear dock staging hold.",
            "action_type": "DIVERT_CORRIDOR",
            "action_label": "Divert Route via Northern Air Freight"
        }

    # 4. Warehouse packaging freeze / inventory stockout (e.g. TRK-HUG-1007, TRK-HUG-1006)
    if "stock depleted" in notes or "pack queue" in notes or "depleted" in notes or "holding in warehouse" in notes or (d.status == "Preparing" and is_delayed):
        return {
            "has_issue": True,
            "root_cause": f"Warehouse Fulfillment Freeze: Order #{ord_num} is staged at outbound packaging bay because central warehouse stock for beverage SKU is depleted below safety threshold.",
            "ai_suggested_resolution": "Step 1: Emergency Restock PO - Auto-approve emergency Purchase Order for 250 units with primary supplier. Step 2: Fast-Track Receipt - Prioritize dock-to-pack receipt upon arrival to release packaging hold.",
            "action_type": "APPROVE_EMERGENCY_PO",
            "action_label": "Approve Emergency Restock PO (250 units)"
        }

    # 5. Out for final delivery route delay (e.g. SHP-HUG-1005)
    if "out for final delivery" in notes or "final delivery" in notes:
        return {
            "has_issue": True if is_delayed else False,
            "root_cause": f"Last-Mile Dwell Time: Parcel {trk} reached {city} but localized route traffic delayed final handover past estimated delivery window (+{delay_hours}h).",
            "ai_suggested_resolution": f"Step 1: Direct Driver Ping - Transmit direct driver contact number and delivery OTP confirmation SMS to {cust_name}. Step 2: SLA Verification - Verify handover scan before end-of-day.",
            "action_type": "SEND_GPS_SMS",
            "action_label": "Send Driver Contact & Live OTP SMS"
        }

    # 6. Any other delayed consignment past SLA
    if is_delayed or d.status in ["Delayed", "Failed"]:
        return {
            "has_issue": True,
            "root_cause": f"Courier SLA Breached: Consignment {trk} with {carrier} has exceeded promised delivery target (+{delay_hours}h overdue) without final handover scan.",
            "ai_suggested_resolution": f"Step 1: API Status Ping - Trigger automated courier API tracking refresh. Step 2: Priority Desk Ping - Send automated escalation notice to {carrier} logistics coordinator. Step 3: Customer Satisfaction - Apply ₹100 courtesy credit.",
            "action_type": "ESCALATE_COURIER_SLA",
            "action_label": f"Ping {carrier} API & Escalate"
        }

    # Healthy in-transit
    return {
        "has_issue": False,
        "root_cause": f"Consignment {trk} is in normal transit with {carrier}. ETA on schedule.",
        "ai_suggested_resolution": "Continue monitoring automated carrier tracking pings.",
        "action_type": None,
        "action_label": None
    }

def get_dispatches(db: Session, status: str = None, delayed_only: bool = False):
    query = db.query(Dispatch)
    if status:
        query = query.filter(Dispatch.status == status)
    
    dispatches = query.order_by(Dispatch.created_at.desc()).all()
    now = datetime.datetime.utcnow()
    results = []

    for d in dispatches:
        is_delayed = False
        delay_hours = 0
        if d.expected_delivery_date and d.status not in ["Delivered", "Cancelled"]:
            if now > d.expected_delivery_date:
                is_delayed = True
                delay_hours = int((now - d.expected_delivery_date).total_seconds() / 3600)

        diag = diagnose_dispatch(d, is_delayed, delay_hours)

        if delayed_only and not is_delayed and not diag["has_issue"]:
            continue

        results.append({
            "id": d.id,
            "order_id": d.order_id,
            "order_number": d.order.order_number if d.order else "Unknown",
            "customer_name": d.order.customer.name if d.order and d.order.customer else "Unknown",
            "customer_city": d.order.customer.city if d.order and d.order.customer else "N/A",
            "delivery_partner": d.delivery_partner,
            "tracking_number": d.tracking_number,
            "dispatch_date": d.dispatch_date,
            "expected_delivery_date": d.expected_delivery_date,
            "actual_delivery_date": d.actual_delivery_date,
            "status": "Delayed" if is_delayed else d.status,
            "is_delayed": is_delayed,
            "delay_hours": delay_hours,
            "carrier_status_notes": d.carrier_status_notes,
            "created_at": d.created_at,
            "has_issue": diag["has_issue"],
            "root_cause": diag["root_cause"],
            "ai_suggested_resolution": diag["ai_suggested_resolution"],
            "action_type": diag["action_type"],
            "action_label": diag["action_label"]
        })
    return results

def update_dispatch(db: Session, dispatch_id: int, d_in: DispatchUpdate, user_name: str = "Admin"):
    d = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not d:
        return None
    for field, val in d_in.dict(exclude_unset=True).items():
        setattr(d, field, val)
    
    # If dispatch is marked Delivered, sync order status
    if d.status == "Delivered" and d.order:
        d.order.status = "Delivered"
        d.actual_delivery_date = datetime.datetime.utcnow()

    db.commit()
    db.refresh(d)
    log_audit(db, "UPDATE", "Dispatch", f"Updated dispatch tracking {d.tracking_number} (Status: {d.status})", user_name=user_name)
    return d

# ----------------- COMPLAINTS -----------------
def create_complaint(db: Session, comp_in: ComplaintCreate, user_name: str = "System"):
    count = db.query(func.count(Complaint.id)).scalar() or 0
    complaint_number = f"CMP-{2000 + count + 1}"

    # Fetch linked customer, order and dispatch if present
    customer = db.query(Customer).filter(Customer.id == comp_in.customer_id).first()
    linked_order = None
    linked_dispatch = None
    if comp_in.order_id:
        linked_order = db.query(Order).filter(Order.id == comp_in.order_id).first()
        if linked_order:
            linked_dispatch = db.query(Dispatch).filter(Dispatch.order_id == linked_order.id).first()

    from app.ai.complaint_analyst import classify_and_diagnose_complaint
    analysis = classify_and_diagnose_complaint(
        description=comp_in.description,
        category_hint=comp_in.category,
        order=linked_order,
        customer=customer,
        dispatch=linked_dispatch
    )

    complaint = Complaint(
        complaint_number=complaint_number,
        customer_id=comp_in.customer_id,
        order_id=comp_in.order_id,
        category=analysis["category"],
        description=comp_in.description,
        priority=analysis["priority"],
        status="Open",
        ai_sentiment=analysis["sentiment"],
        root_cause=analysis["root_cause"],
        ai_suggested_resolution=analysis["action_plan"]
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    log_audit(db, "CREATE", "Complaints", f"Filed complaint {complaint.complaint_number} ({complaint.category}, Priority: {complaint.priority})", user_name=user_name)
    return complaint

def get_complaints(db: Session, status: str = None, category: str = None):
    query = db.query(Complaint)
    if status:
        query = query.filter(Complaint.status == status)
    if category:
        query = query.filter(Complaint.category == category)
    
    complaints = query.order_by(Complaint.created_at.desc()).all()
    from app.ai.complaint_analyst import classify_and_diagnose_complaint

    results = []
    for c in complaints:
        order_total = c.order.total_amount if c.order else None
        disp = c.order.dispatch if (c.order and c.order.dispatch) else None
        
        # Verify if existing root_cause or resolution is missing, generic, or mismatched with description
        desc_lower = (c.description or "").lower()
        has_generic_res = not c.ai_suggested_resolution or "Customer Support Diagnostic:" in (c.ai_suggested_resolution or "") or "Review customer purchase history" in (c.ai_suggested_resolution or "")
        has_mismatched_cause = not c.root_cause or ("temperature variation" in (c.root_cause or "").lower() and any(k in desc_lower for k in ["time", "slow", "delay", "late", "order", "delivery", "wait"]))
        has_mismatched_cat = (any(k in desc_lower for k in ["leak", "crack", "cap", "broken"]) and c.category != "Packaging Damaged") or (any(k in desc_lower for k in ["time", "too long", "slow", "delay"]) and c.category != "Delivery Delay")

        if has_generic_res or has_mismatched_cause or has_mismatched_cat:
            diag = classify_and_diagnose_complaint(
                description=c.description,
                category_hint=c.category,
                order=c.order,
                customer=c.customer,
                dispatch=disp
            )
            c.category = diag["category"]
            c.root_cause = diag["root_cause"]
            c.ai_suggested_resolution = diag["action_plan"]
            c.ai_sentiment = diag["sentiment"]
            if diag.get("priority"):
                c.priority = diag["priority"]
            try:
                db.commit()
            except Exception:
                db.rollback()

        results.append({
            "id": c.id,
            "complaint_number": c.complaint_number,
            "customer_id": c.customer_id,
            "customer_name": c.customer.name if c.customer else "Unknown",
            "customer_email": c.customer.email if c.customer else "N/A",
            "order_id": c.order_id,
            "order_number": c.order.order_number if c.order else "N/A",
            "order_total": order_total,
            "category": c.category,
            "description": c.description,
            "priority": c.priority,
            "status": c.status,
            "ai_sentiment": c.ai_sentiment,
            "root_cause": c.root_cause,
            "ai_suggested_resolution": c.ai_suggested_resolution,
            "resolution": c.resolution,
            "assigned_to_id": c.assigned_to_id,
            "assigned_to_name": c.assigned_to.full_name if c.assigned_to else "Unassigned",
            "created_at": c.created_at,
            "resolved_at": c.resolved_at,
            "dispatch_status": disp.status if disp else None,
            "carrier": disp.delivery_partner if disp else None,
            "tracking_number": disp.tracking_number if disp else None
        })
    return results

def update_complaint(db: Session, complaint_id: int, c_in: ComplaintUpdate, user_name: str = "Admin"):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        return None
    for field, val in c_in.dict(exclude_unset=True).items():
        setattr(c, field, val)
    if c_in.status == "Resolved" and not c.resolved_at:
        c.resolved_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(c)
    action_label = "RESOLVE" if c.status == "Resolved" else "UPDATE"
    log_detail = f"Resolved complaint {c.complaint_number} (AI Action: {c.resolution})" if c.status == "Resolved" else f"Updated complaint {c.complaint_number} (Status: {c.status})"
    log_audit(db, action_label, "Complaints", log_detail, user_name=user_name)
    return c

# ----------------- SUPPLIERS & PURCHASE ORDERS -----------------
def get_suppliers(db: Session):
    suppliers = db.query(Supplier).all()
    results = []
    for s in suppliers:
        results.append({
            "id": s.id,
            "name": s.name,
            "contact_person": s.contact_person,
            "email": s.email,
            "phone": s.phone,
            "address": s.address,
            "category": s.category,
            "lead_time_days": s.lead_time_days,
            "reliability_rating": s.reliability_rating,
            "status": s.status,
            "payment_terms": s.payment_terms,
            "supplied_products_count": len(s.products),
            "on_time_delivery_rate": round(min(100.0, s.reliability_rating * 20.0), 1),
            "created_at": s.created_at
        })
    return results

def create_supplier(db: Session, s_in: SupplierCreate):
    s = Supplier(**s_in.dict())
    db.add(s)
    db.commit()
    db.refresh(s)
    log_audit(db, "CREATE", "Suppliers", f"Added supplier {s.name}")
    return s

def create_purchase_order(db: Session, po_in: PurchaseOrderCreate, user_name: str = "Admin"):
    product = db.query(Product).filter(Product.id == po_in.product_id).first()
    supplier = db.query(Supplier).filter(Supplier.id == po_in.supplier_id).first()
    if not product or not supplier:
        raise ValueError("Product or Supplier not found.")

    unit_cost = po_in.unit_cost if po_in.unit_cost is not None else product.cost_price
    total_amount = round(unit_cost * po_in.quantity, 2)
    count = db.query(func.count(PurchaseOrder.id)).scalar() or 0
    po_number = f"PO-{5000 + count + 1}"

    expected_date = po_in.expected_date or (datetime.datetime.utcnow() + datetime.timedelta(days=supplier.lead_time_days or 5))

    po = PurchaseOrder(
        po_number=po_number,
        supplier_id=supplier.id,
        product_id=product.id,
        quantity=po_in.quantity,
        unit_cost=unit_cost,
        total_amount=total_amount,
        status="Approved",
        expected_date=expected_date
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    log_audit(db, "CREATE_PO", "Procurement", f"Created Purchase Order {po.po_number} for {product.name} ({po.quantity} units, Total: ${po.total_amount})", user_name=user_name)
    return po

def receive_purchase_order(db: Session, po_id: int, user_name: str = "Admin"):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po or po.status == "Received":
        return po
    
    po.status = "Received"
    product = po.product
    product.stock_quantity += po.quantity
    
    sm = StockMovement(
        product_id=product.id,
        movement_type="IN",
        quantity=po.quantity,
        reference_type="PURCHASE_ORDER",
        reference_id=po.po_number,
        notes=f"Stock replenishment received from PO {po.po_number}",
        created_by=user_name
    )
    db.add(sm)
    db.commit()
    db.refresh(po)
    log_audit(db, "RECEIVE_PO", "Procurement", f"Received PO {po.po_number}: Added {po.quantity} units to {product.name}", user_name=user_name)
    return po

def execute_dispatch_batch(db: Session, order_ids: list = None, user_name: str = "Aarav Mehta (Company Owner)"):
    """
    Executes dispatches for eligible or specified orders.
    Performs comprehensive pre-dispatch verification:
    1. Physical stock availability verification
    2. Payment and credit authorization verification
    3. Carrier assignment and tracking confirmation
    
    Returns structured results distinguishing successful vs. failed dispatches,
    including the root-cause reason behind each failure and AI-recommended solutions.
    """
    query = db.query(Order)
    if order_ids and len(order_ids) > 0:
        query = query.filter(Order.id.in_(order_ids))
    else:
        # Actionable orders awaiting dispatch
        query = query.filter(Order.status.in_(["New", "Confirmed", "Processing", "Packed"]))

    orders = query.all()
    if not orders:
        return {
            "total_processed": 0,
            "successful_count": 0,
            "failed_count": 0,
            "successful_dispatches": [],
            "failed_dispatches": [],
            "spoken_summary": "There are currently no orders in the queue awaiting dispatch.",
            "message": "No pending orders found for dispatch."
        }

    successful = []
    failed = []

    for order in orders:
        cust_name = order.customer.name if order.customer else "Wholesale Customer"
        order_num = order.order_number
        
        # Check 1: Order Cancellation
        if order.status == "Cancelled":
            failed.append({
                "order_id": order.id,
                "order_number": order_num,
                "customer_name": cust_name,
                "reason": f"Order {order_num} has been cancelled ({order.cancellation_reason or 'No reason specified'}).",
                "failure_category": "ORDER_CANCELLED",
                "recommended_solution": "Reinstate or create a new order if customer requests reactivation.",
                "solution_action": None
            })
            continue

        # Check 2: Physical Inventory Sufficiency
        stock_deficit = None
        for item in order.items:
            product = item.product
            if product.stock_quantity < item.quantity:
                deficit = item.quantity - product.stock_quantity
                supplier_name = product.supplier.name if product.supplier else "EcoPack Direct"
                supplier_id = product.supplier_id if product.supplier_id else 1
                reorder_qty = max(product.reorder_quantity or 200, deficit + 100)
                stock_deficit = {
                    "product_id": product.id,
                    "product_name": product.name,
                    "required": item.quantity,
                    "available": product.stock_quantity,
                    "deficit": deficit,
                    "supplier_name": supplier_name,
                    "supplier_id": supplier_id,
                    "reorder_qty": reorder_qty
                }
                break

        if stock_deficit:
            failed.append({
                "order_id": order.id,
                "order_number": order_num,
                "customer_name": cust_name,
                "reason": (
                    f"Physical stock deficit on '{stock_deficit['product_name']}': "
                    f"Order requires {stock_deficit['required']} units, but warehouse has only "
                    f"{stock_deficit['available']} units in physical stock (deficit of {stock_deficit['deficit']} units)."
                ),
                "failure_category": "INVENTORY_DEFICIT",
                "recommended_solution": (
                    f"Issue emergency Purchase Order to {stock_deficit['supplier_name']} for {stock_deficit['reorder_qty']} units "
                    f"of {stock_deficit['product_name']} with expedited courier freight to unblock dispatch."
                ),
                "solution_action": {
                    "action_type": "CREATE_PURCHASE_ORDER",
                    "product_id": stock_deficit["product_id"],
                    "product_name": stock_deficit["product_name"],
                    "supplier_id": stock_deficit["supplier_id"],
                    "supplier_name": stock_deficit["supplier_name"],
                    "quantity": stock_deficit["reorder_qty"]
                }
            })
            continue

        # Check 3: Payment Status & Credit Authorization
        if order.payment_status in ["Unpaid", "Failed"] and order.total_amount > 500:
            failed.append({
                "order_id": order.id,
                "order_number": order_num,
                "customer_name": cust_name,
                "reason": (
                    f"Wholesale credit gate hold: Order payment status is '{order.payment_status}' with an outstanding balance of ${order.total_amount:,.2f} "
                    f"exceeding authorized credit limits without an approved Cash on Delivery (COD) waiver."
                ),
                "failure_category": "PAYMENT_UNPAID",
                "recommended_solution": (
                    f"Dispatch an automated 1-click payment settlement link to {cust_name} via Email/WhatsApp, "
                    f"or authorize an executive COD dispatch waiver."
                ),
                "solution_action": {
                    "action_type": "SEND_PAYMENT_REMINDER",
                    "order_id": order.id,
                    "order_number": order_num,
                    "customer_name": cust_name,
                    "amount": order.total_amount
                }
            })
            continue

        # Check 4: Carrier Serviceability & Routing Restrictions
        carrier_hold = None
        if order.dispatch and order.dispatch.carrier_status_notes and any(k in order.dispatch.carrier_status_notes.lower() for k in ["embargo", "restricted", "hold", "undeliverable", "pincode"]):
            carrier_hold = order.dispatch.carrier_status_notes
        elif order.notes and any(k in order.notes.lower() for k in ["embargo", "restricted", "pincode hold", "route hold", "transit freeze"]):
            carrier_hold = order.notes

        if carrier_hold:
            failed.append({
                "order_id": order.id,
                "order_number": order_num,
                "customer_name": cust_name,
                "reason": f"Carrier transit embargo / route hold: '{carrier_hold}'. Primary courier has temporarily restricted freight through this destination corridor.",
                "failure_category": "CARRIER_RESTRICTION",
                "recommended_solution": "Re-route consignment to Hugg Express priority air courier with alternate routing hub to bypass destination regional bottleneck.",
                "solution_action": {
                    "action_type": "REROUTE_CARRIER",
                    "order_id": order.id,
                    "order_number": order_num,
                    "customer_name": cust_name,
                    "new_carrier": "Hugg Express"
                }
            })
            continue

        # If all checks pass: Dispatch the order!
        update_order_status(db=db, order_id=order.id, new_status="Dispatched", user_name=user_name)
        
        # Deduct physical stock
        for item in order.items:
            if item.product:
                item.product.stock_quantity = max(0, item.product.stock_quantity - item.quantity)
                item.product.reserved_stock = max(0, item.product.reserved_stock - item.quantity)

        # Update or create dispatch tracking
        carrier_name = "Hugg Express" if order.id % 2 == 0 else "Delhivery"
        tracking_num = f"TRK-{order_num}"
        if not order.dispatch:
            disp = Dispatch(
                order_id=order.id,
                delivery_partner=carrier_name,
                tracking_number=tracking_num,
                dispatch_date=datetime.datetime.utcnow(),
                expected_delivery_date=datetime.datetime.utcnow() + datetime.timedelta(days=2),
                status="In Transit"
            )
            db.add(disp)
        else:
            order.dispatch.status = "In Transit"
            order.dispatch.dispatch_date = datetime.datetime.utcnow()
            if not order.dispatch.tracking_number:
                order.dispatch.tracking_number = tracking_num
            carrier_name = order.dispatch.delivery_partner
            tracking_num = order.dispatch.tracking_number

        db.commit()

        items_desc = ", ".join([f"{it.quantity}x {it.product.name}" for it in order.items])

        successful.append({
            "order_id": order.id,
            "order_number": order_num,
            "customer_name": cust_name,
            "carrier": carrier_name,
            "tracking_number": tracking_num,
            "items_summary": items_desc,
            "total_amount": order.total_amount
        })

    # Trigger proactive engine scan in background
    try:
        from app.ai.engine import proactive_engine
        proactive_engine.run_full_business_scan(db)
    except Exception as e:
        print(f"Warning: Proactive scan error after dispatch batch: {e}")

    # Build natural spoken summary
    succ_count = len(successful)
    fail_count = len(failed)

    succ_text = ""
    if succ_count > 0:
        succ_orders = ", ".join([f"{s['order_number']} via {s['carrier']} ({s['tracking_number']})" for s in successful])
        succ_text = f"Successfully dispatched {succ_count} order(s): {succ_orders}."
    else:
        succ_text = "No orders could be dispatched."

    fail_text = ""
    if fail_count > 0:
        reasons_list = []
        solutions_list = []
        for f in failed:
            if f["failure_category"] == "INVENTORY_DEFICIT":
                reasons_list.append(f"order {f['order_number']} due to physical stock deficit")
                solutions_list.append(f"approving an emergency restock PO for {f['order_number']}")
            elif f["failure_category"] == "PAYMENT_UNPAID":
                reasons_list.append(f"order {f['order_number']} due to wholesale credit policy hold")
                solutions_list.append(f"sending a 1-click payment recovery link for {f['order_number']}")
            elif f["failure_category"] == "CARRIER_RESTRICTION":
                reasons_list.append(f"order {f['order_number']} due to carrier route embargo")
                solutions_list.append(f"re-routing {f['order_number']} via Hugg Express priority air")
            else:
                reasons_list.append(f"order {f['order_number']} due to policy hold")
                solutions_list.append(f"reviewing compliance for {f['order_number']}")

        fail_text = f" {fail_count} order(s) failed dispatch due to distinct operational gates: {', '.join(reasons_list)}."
        if solutions_list:
            fail_text += f" I recommend {', and '.join(solutions_list)}."

    spoken_summary = f"Hello Aarav. Dispatch execution completed. {succ_text}{fail_text}"

    log_audit(
        db,
        "DISPATCH_BATCH",
        "Dispatch",
        f"Executed batch dispatch: {succ_count} succeeded, {fail_count} failed",
        user_name=user_name
    )

    return {
        "total_processed": len(orders),
        "successful_count": succ_count,
        "failed_count": fail_count,
        "successful_dispatches": successful,
        "failed_dispatches": failed,
        "spoken_summary": spoken_summary,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

