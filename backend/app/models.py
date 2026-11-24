import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Owner/Admin") # Owner/Admin, Operations Manager, Inventory Manager, Sales Employee, Customer Support
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    complaints_assigned = relationship("Complaint", back_populates="assigned_to")

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    segment = Column(String(50), default="Regular") # VIP, Regular, New, At Risk, Inactive
    credit_limit = Column(Float, default=5000.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="customer")
    payments = relationship("Payment", back_populates="customer")

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    category = Column(String(100), default="Raw Materials") # Ingredients, Packaging, Bottling, Logistics
    lead_time_days = Column(Integer, default=5)
    reliability_rating = Column(Float, default=4.5) # Scale 1 to 5
    status = Column(String(50), default="Active") # Active, Under Review, Inactive
    payment_terms = Column(String(100), default="Net 30")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    products = relationship("Product", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), index=True, nullable=False)
    category = Column(String(100), default="Cold Brew") # Cold Brew, Kombucha, Sparkling Tea, Functional Juice, Energy Elixir
    description = Column(Text, nullable=True)
    unit = Column(String(50), default="Bottle (330ml)")
    cost_price = Column(Float, nullable=False, default=0.0)
    selling_price = Column(Float, nullable=False, default=0.0)
    stock_quantity = Column(Integer, default=0)
    reserved_stock = Column(Integer, default=0)
    reorder_level = Column(Integer, default=50)
    reorder_quantity = Column(Integer, default=200)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    image_url = Column(String(500), nullable=True)
    status = Column(String(50), default="Active") # Active, Discontinued
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    supplier = relationship("Supplier", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    stock_movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="product")

class StockMovement(Base):
    __tablename__ = "stock_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    movement_type = Column(String(50), nullable=False) # IN, OUT, RESERVED, RELEASED, ADJUSTMENT
    quantity = Column(Integer, nullable=False)
    reference_type = Column(String(50), nullable=True) # ORDER, PURCHASE_ORDER, MANUAL, RETURN
    reference_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(100), default="System")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    product = relationship("Product", back_populates="stock_movements")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    order_date = Column(DateTime, default=datetime.datetime.utcnow)
    expected_delivery_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="New", index=True) # New, Confirmed, Processing, Packed, Dispatched, Delivered, Cancelled
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    payment_status = Column(String(50), default="Unpaid", index=True) # Unpaid, Partial, Paid, Failed, Refunded
    priority = Column(String(50), default="Normal") # Normal, High, Urgent
    notes = Column(Text, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order")
    dispatch = relationship("Dispatch", back_populates="order", uselist=False, cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, default=0.0)
    subtotal = Column(Float, nullable=False, default=0.0)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    payment_method = Column(String(50), default="UPI") # Card, UPI, Bank Transfer, Net Banking, Cash
    transaction_ref = Column(String(100), index=True, nullable=True)
    payment_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(50), default="Pending", index=True) # Success, Pending, Failed, Mismatch, Duplicate
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    order = relationship("Order", back_populates="payments")
    customer = relationship("Customer", back_populates="payments")

class Dispatch(Base):
    __tablename__ = "dispatches"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    delivery_partner = Column(String(100), default="Delhivery") # Delhivery, BlueDart, Blip, Shiprocket, Hugg Express
    tracking_number = Column(String(100), unique=True, nullable=True)
    dispatch_date = Column(DateTime, nullable=True)
    expected_delivery_date = Column(DateTime, nullable=True)
    actual_delivery_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="Preparing", index=True) # Preparing, In Transit, Out for Delivery, Delivered, Delayed, Failed
    carrier_status_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    order = relationship("Order", back_populates="dispatch")

class Complaint(Base):
    __tablename__ = "complaints"
    
    id = Column(Integer, primary_key=True, index=True)
    complaint_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    category = Column(String(100), nullable=False) # Product Quality, Delivery Delay, Wrong Item, Packaging Damaged, Billing Issue, Taste Issue
    description = Column(Text, nullable=False)
    priority = Column(String(50), default="Medium") # Low, Medium, High, Urgent
    status = Column(String(50), default="Open", index=True) # Open, In Progress, Resolved, Escalated
    ai_sentiment = Column(String(50), default="Negative") # Negative, Frustrated, Neutral
    root_cause = Column(Text, nullable=True)
    ai_suggested_resolution = Column(Text, nullable=True)
    resolution = Column(Text, nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    customer = relationship("Customer", back_populates="complaints")
    order = relationship("Order", back_populates="complaints")
    assigned_to = relationship("User", back_populates="complaints_assigned")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=100)
    unit_cost = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    status = Column(String(50), default="Draft") # Draft, Approved, Ordered, Received, Cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expected_date = Column(DateTime, nullable=True)

    supplier = relationship("Supplier", back_populates="purchase_orders")
    product = relationship("Product", back_populates="purchase_orders")

class AiInsight(Base):
    __tablename__ = "ai_insights"
    
    id = Column(Integer, primary_key=True, index=True)
    insight_type = Column(String(50), index=True) # RISK, BOTTLENECK, FINANCIAL, INVENTORY, CROSS_MODULE, OPPORTUNITY
    severity = Column(String(50), index=True) # CRITICAL, WARNING, INFO
    title = Column(String(255), nullable=False)
    problem = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=False)
    business_impact = Column(Text, nullable=False)
    recommended_solution = Column(Text, nullable=False)
    affected_module = Column(String(100), default="Cross-Module") # Orders, Inventory, Payments, Dispatch, Complaints, Cross-Module
    affected_records = Column(JSON, nullable=True) # JSON list or dict with order_ids, product_skus, customer_ids
    metrics = Column(JSON, nullable=True) # e.g. {"revenue_at_risk": 4200.0, "affected_orders": 6}
    action_type = Column(String(100), nullable=True) # CREATE_PURCHASE_ORDER, NOTIFY_CARRIER, ESCALATE_COMPLAINT, SEND_PAYMENT_REMINDER
    action_payload = Column(JSON, nullable=True) # parameters to execute the action
    status = Column(String(50), default="ACTIVE") # ACTIVE, APPROVED, REJECTED, RESOLVED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AiAction(Base):
    __tablename__ = "ai_actions"
    
    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(Integer, ForeignKey("ai_insights.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action_type = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False) # Order, Product, PurchaseOrder, Complaint, Payment
    entity_id = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING") # PENDING, APPROVED, REJECTED, EXECUTED
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DailyBriefing(Base):
    __tablename__ = "daily_briefings"
    
    id = Column(Integer, primary_key=True, index=True)
    briefing_date = Column(String(50), unique=True, index=True) # YYYY-MM-DD
    summary_text = Column(Text, nullable=False)
    metrics_snapshot = Column(JSON, nullable=False)
    highlights = Column(JSON, nullable=True)
    risks = Column(JSON, nullable=True)
    action_items = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_name = Column(String(255), default="System")
    user_role = Column(String(50), default="System")
    action = Column(String(100), nullable=False) # CREATE, UPDATE, DELETE, AI_APPROVAL, STATUS_CHANGE
    module = Column(String(100), nullable=False) # Orders, Inventory, AI, Payments, etc.
    details = Column(Text, nullable=False)
    ip_address = Column(String(50), default="127.0.0.1")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
