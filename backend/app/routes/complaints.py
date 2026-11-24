from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas import ComplaintCreate, ComplaintUpdate, ComplaintResponse
import app.crud as crud
from app.ai.engine import proactive_engine

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.get("", response_model=List[ComplaintResponse])
def list_complaints(
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_complaints(db=db, status=status, category=category)

@router.post("", response_model=ComplaintResponse, status_code=201)
def file_complaint(c_in: ComplaintCreate, db: Session = Depends(get_db)):
    try:
        complaint = crud.create_complaint(db=db, comp_in=c_in)
        proactive_engine.run_full_business_scan(db)
        return crud.get_complaints(db=db)[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{complaint_id}", response_model=ComplaintResponse)
def update_complaint_status(complaint_id: int, c_in: ComplaintUpdate, db: Session = Depends(get_db)):
    updated = crud.update_complaint(db=db, complaint_id=complaint_id, c_in=c_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found")
    proactive_engine.run_full_business_scan(db)
    results = crud.get_complaints(db=db)
    matched = [c for c in results if c["id"] == complaint_id]
    return matched[0] if matched else results[0]
