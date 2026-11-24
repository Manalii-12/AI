from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas import CustomerCreate, CustomerUpdate, CustomerResponse
import app.crud as crud

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def list_customers(
    segment: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_customers(db=db, segment=segment, search=search)

@router.post("", response_model=CustomerResponse, status_code=201)
def create_customer(c_in: CustomerCreate, db: Session = Depends(get_db)):
    try:
        new_c = crud.create_customer(db=db, c_in=c_in)
        # Fetch with computed stats
        results = crud.get_customers(db=db, search=new_c.email)
        return results[0] if results else new_c
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, c_in: CustomerUpdate, db: Session = Depends(get_db)):
    updated = crud.update_customer(db=db, customer_id=customer_id, c_in=c_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Customer not found")
    results = crud.get_customers(db=db, search=updated.email)
    return results[0] if results else updated
