from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import (
    SupplierCreate, SupplierResponse, PurchaseOrderCreate, PurchaseOrderResponse
)
from app.models import PurchaseOrder
import app.crud as crud
from app.ai.engine import proactive_engine

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("", response_model=List[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)):
    return crud.get_suppliers(db=db)

@router.post("", response_model=SupplierResponse, status_code=201)
def add_supplier(s_in: SupplierCreate, db: Session = Depends(get_db)):
    try:
        new_s = crud.create_supplier(db=db, s_in=s_in)
        return crud.get_suppliers(db=db)[-1]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(db: Session = Depends(get_db)):
    pos = db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).all()
    results = []
    for po in pos:
        results.append({
            "id": po.id,
            "po_number": po.po_number,
            "supplier_id": po.supplier_id,
            "supplier_name": po.supplier.name if po.supplier else "N/A",
            "product_id": po.product_id,
            "product_name": po.product.name if po.product else "N/A",
            "product_sku": po.product.sku if po.product else "N/A",
            "quantity": po.quantity,
            "unit_cost": po.unit_cost,
            "total_amount": po.total_amount,
            "status": po.status,
            "created_at": po.created_at,
            "expected_date": po.expected_date
        })
    return results

@router.post("/purchase-orders", response_model=PurchaseOrderResponse, status_code=201)
def create_po(po_in: PurchaseOrderCreate, db: Session = Depends(get_db)):
    try:
        po = crud.create_purchase_order(db=db, po_in=po_in)
        proactive_engine.run_full_business_scan(db)
        return {
            "id": po.id,
            "po_number": po.po_number,
            "supplier_id": po.supplier_id,
            "supplier_name": po.supplier.name if po.supplier else "N/A",
            "product_id": po.product_id,
            "product_name": po.product.name if po.product else "N/A",
            "product_sku": po.product.sku if po.product else "N/A",
            "quantity": po.quantity,
            "unit_cost": po.unit_cost,
            "total_amount": po.total_amount,
            "status": po.status,
            "created_at": po.created_at,
            "expected_date": po.expected_date
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/purchase-orders/{po_id}/receive", response_model=PurchaseOrderResponse)
def receive_po(po_id: int, db: Session = Depends(get_db)):
    po = crud.receive_purchase_order(db=db, po_id=po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    proactive_engine.run_full_business_scan(db)
    return {
        "id": po.id,
        "po_number": po.po_number,
        "supplier_id": po.supplier_id,
        "supplier_name": po.supplier.name if po.supplier else "N/A",
        "product_id": po.product_id,
        "product_name": po.product.name if po.product else "N/A",
        "product_sku": po.product.sku if po.product else "N/A",
        "quantity": po.quantity,
        "unit_cost": po.unit_cost,
        "total_amount": po.total_amount,
        "status": po.status,
        "created_at": po.created_at,
        "expected_date": po.expected_date
    }
