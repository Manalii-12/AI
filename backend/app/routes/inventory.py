from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.schemas import ProductCreate, ProductUpdate, ProductResponse, StockMovementResponse
import app.crud as crud
from app.ai.engine import proactive_engine

router = APIRouter(prefix="/inventory", tags=["Inventory"])

class StockAdjustmentRequest(BaseModel):
    product_id: int
    movement_type: str # IN, OUT, ADJUSTMENT
    quantity: int
    notes: Optional[str] = "Manual stock update"
    user_name: Optional[str] = "Inventory Manager"

@router.get("/products", response_model=List[ProductResponse])
def list_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_products(db=db, category=category, search=search)

@router.post("/products", response_model=ProductResponse, status_code=201)
def create_product(p_in: ProductCreate, db: Session = Depends(get_db)):
    try:
        new_p = crud.create_product(db=db, p_in=p_in)
        proactive_engine.run_full_business_scan(db)
        results = crud.get_products(db=db, search=new_p.sku)
        return results[0] if results else new_p
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, p_in: ProductUpdate, db: Session = Depends(get_db)):
    updated = crud.update_product(db=db, product_id=product_id, p_in=p_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    proactive_engine.run_full_business_scan(db)
    results = crud.get_products(db=db, search=updated.sku)
    return results[0] if results else updated

@router.post("/adjust")
def adjust_stock_level(adj_req: StockAdjustmentRequest, db: Session = Depends(get_db)):
    product = crud.adjust_stock(
        db=db,
        product_id=adj_req.product_id,
        movement_type=adj_req.movement_type,
        quantity=adj_req.quantity,
        notes=adj_req.notes,
        user_name=adj_req.user_name
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Re-scan proactive engine
    proactive_engine.run_full_business_scan(db)
    return {"status": "SUCCESS", "message": f"Updated stock for {product.name}. New quantity: {product.stock_quantity}"}

@router.get("/movements", response_model=List[StockMovementResponse])
def get_movements(product_id: Optional[int] = None, limit: int = 50, db: Session = Depends(get_db)):
    return crud.get_stock_movements(db=db, product_id=product_id, limit=limit)
