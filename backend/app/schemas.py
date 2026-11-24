import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, EmailStr

# User & Auth
class UserBase(BaseModel):
    email: str
    full_name: str
    role: str
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Customer
class CustomerBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    segment: Optional[str] = "Regular"
    credit_limit: Optional[float] = 5000.0

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    segment: Optional[str] = None
    credit_limit: Optional[float] = None

class CustomerResponse(CustomerBase):
    id: int
    total_orders: int = 0
    total_spent: float = 0.0
    outstanding_balance: float = 0.0
    complaint_count: int = 0
    last_order_date: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Supplier
class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    category: Optional[str] = "Raw Materials"
    lead_time_days: Optional[int] = 5
    reliability_rating: Optional[float] = 4.5
    status: Optional[str] = "Active"
    payment_terms: Optional[str] = "Net 30"

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    category: Optional[str] = None
    lead_time_days: Optional[int] = None
    reliability_rating: Optional[float] = None
    status: Optional[str] = None
    payment_terms: Optional[str] = None

class SupplierResponse(SupplierBase):
    id: int
    supplied_products_count: int = 0
    on_time_delivery_rate: float = 94.0
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Product
class ProductBase(BaseModel):
    sku: str
    name: str
    category: str
    description: Optional[str] = None
    unit: Optional[str] = "Bottle (330ml)"
    cost_price: float
    selling_price: float
    stock_quantity: int = 0
    reserved_stock: int = 0
    reorder_level: int = 50
    reorder_quantity: int = 200
    supplier_id: Optional[int] = None
    image_url: Optional[str] = None
    status: Optional[str] = "Active"

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    reserved_stock: Optional[int] = None
    reorder_level: Optional[int] = None
    reorder_quantity: Optional[int] = None
    supplier_id: Optional[int] = None
    image_url: Optional[str] = None
    status: Optional[str] = None

class ProductResponse(ProductBase):
    id: int
    available_stock: int = 0
    stock_status: str = "In Stock" # In Stock, Low Stock, Out of Stock, Excess
    supplier_name: Optional[str] = None
    sales_velocity_30d: int = 0
    created_at: datetime.datetime
    root_cause: Optional[str] = None
    ai_suggested_resolution: Optional[str] = None
    is_anomaly: bool = False

    class Config:
        from_attributes = True

# Stock Movement
class StockMovementCreate(BaseModel):
    product_id: int
    movement_type: str # IN, OUT, RESERVED, RELEASED, ADJUSTMENT
    quantity: int
    reference_type: Optional[str] = "MANUAL"
    reference_id: Optional[str] = None
    notes: Optional[str] = None

class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    movement_type: str
    quantity: int
    reference_type: Optional[str]
    reference_id: Optional[str]
    notes: Optional[str]
    created_by: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# Order Items
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: Optional[float] = None

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    quantity: int
    unit_price: float
    subtotal: float

    class Config:
        from_attributes = True

# Order
class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate]
    expected_delivery_date: Optional[datetime.datetime] = None
    priority: Optional[str] = "Normal"
    notes: Optional[str] = None
    discount: Optional[float] = 0.0

class OrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None

class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    order_date: datetime.datetime
    expected_delivery_date: Optional[datetime.datetime] = None
    status: str
    subtotal: float
    tax: float
    discount: float
    total_amount: float
    payment_status: str
    priority: Optional[str] = "Normal"
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None
    items: List[OrderItemResponse] = []
    has_dispatch: bool = False
    dispatch_status: Optional[str] = None
    tracking_number: Optional[str] = None
    created_at: datetime.datetime
    root_cause: Optional[str] = None
    ai_suggested_resolution: Optional[str] = None
    is_bottleneck: bool = False

    class Config:
        from_attributes = True

# Payment
class PaymentCreate(BaseModel):
    order_id: int
    amount: float
    payment_method: str = "UPI"
    transaction_ref: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "Success"

class PaymentResponse(BaseModel):
    id: int
    order_id: int
    order_number: Optional[str] = None
    customer_id: int
    customer_name: Optional[str] = None
    amount: float
    payment_method: str
    transaction_ref: Optional[str] = None
    payment_date: datetime.datetime
    status: str
    notes: Optional[str] = None
    order_total: Optional[float] = None
    is_mismatch: bool = False
    root_cause: Optional[str] = None
    ai_suggested_resolution: Optional[str] = None

    class Config:
        from_attributes = True

# Dispatch
class DispatchCreate(BaseModel):
    order_id: int
    delivery_partner: str = "Delhivery"
    tracking_number: Optional[str] = None
    expected_delivery_date: Optional[datetime.datetime] = None
    carrier_status_notes: Optional[str] = None

class DispatchUpdate(BaseModel):
    delivery_partner: Optional[str] = None
    tracking_number: Optional[str] = None
    dispatch_date: Optional[datetime.datetime] = None
    expected_delivery_date: Optional[datetime.datetime] = None
    actual_delivery_date: Optional[datetime.datetime] = None
    status: Optional[str] = None
    carrier_status_notes: Optional[str] = None

class DispatchResponse(BaseModel):
    id: int
    order_id: int
    order_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_city: Optional[str] = None
    delivery_partner: str
    tracking_number: Optional[str] = None
    dispatch_date: Optional[datetime.datetime] = None
    expected_delivery_date: Optional[datetime.datetime] = None
    actual_delivery_date: Optional[datetime.datetime] = None
    status: str
    is_delayed: bool = False
    delay_hours: Optional[int] = 0
    carrier_status_notes: Optional[str] = None
    created_at: datetime.datetime
    has_issue: bool = False
    root_cause: Optional[str] = None
    ai_suggested_resolution: Optional[str] = None
    action_type: Optional[str] = None
    action_label: Optional[str] = None

    class Config:
        from_attributes = True

# Complaint
class ComplaintCreate(BaseModel):
    customer_id: int
    order_id: Optional[int] = None
    category: str
    description: str
    priority: Optional[str] = "Medium"

class ComplaintUpdate(BaseModel):
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    resolution: Optional[str] = None
    assigned_to_id: Optional[int] = None

class ComplaintResponse(BaseModel):
    id: int
    complaint_number: str
    customer_id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    order_id: Optional[int] = None
    order_number: Optional[str] = None
    order_total: Optional[float] = None
    category: str
    description: str
    priority: str
    status: str
    ai_sentiment: Optional[str] = "Negative"
    root_cause: Optional[str] = None
    ai_suggested_resolution: Optional[str] = None
    resolution: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None
    dispatch_status: Optional[str] = None
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None

    class Config:
        from_attributes = True

# Purchase Order
class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    product_id: int
    quantity: int
    unit_cost: Optional[float] = None
    expected_date: Optional[datetime.datetime] = None

class PurchaseOrderResponse(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    supplier_name: Optional[str] = None
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    quantity: int
    unit_cost: float
    total_amount: float
    status: str
    created_at: datetime.datetime
    expected_date: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

# AI Insights & Action Center
class AiInsightResponse(BaseModel):
    id: int
    insight_type: str
    severity: str # CRITICAL, WARNING, INFO
    title: str
    problem: str
    root_cause: str
    business_impact: str
    recommended_solution: str
    affected_module: str
    affected_records: Optional[Any] = None
    metrics: Optional[Dict[str, Any]] = None
    action_type: Optional[str] = None
    action_payload: Optional[Dict[str, Any]] = None
    status: str # ACTIVE, APPROVED, REJECTED, RESOLVED
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class AiActionApproveRequest(BaseModel):
    insight_id: int
    action_type: str
    custom_params: Optional[Dict[str, Any]] = None

class DailyBriefingResponse(BaseModel):
    id: int
    briefing_date: str
    summary_text: str
    metrics_snapshot: Dict[str, Any]
    highlights: Optional[List[str]] = []
    risks: Optional[List[str]] = []
    action_items: Optional[List[str]] = []
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Health Score
class HealthScoreBreakdown(BaseModel):
    overall_score: int
    status: str # Excellent, Healthy, Needs Attention, Critical
    category_scores: Dict[str, float]
    deduction_reasons: List[str]
    positive_factors: List[str]

# Simulator
class WhatIfRequest(BaseModel):
    demand_increase_pct: float = 0.0 # e.g. 30.0 for +30%
    supplier_delay_days: int = 0 # e.g. 5 days
    price_change_pct: float = 0.0 # e.g. +5% or -10%

class WhatIfResponse(BaseModel):
    scenario: str
    projected_revenue: float
    revenue_delta: float
    projected_margin: float
    stockout_risk_products: List[Dict[str, Any]]
    orders_delayed_count: int
    cash_flow_impact: float
    assumptions_applied: List[str]
    strategic_recommendations: List[str]

# Audit Log
class AuditLogResponse(BaseModel):
    id: int
    user_name: str
    user_role: str
    action: str
    module: str
    details: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True
