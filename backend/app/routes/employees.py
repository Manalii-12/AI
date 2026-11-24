from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, AuditLog
from app.schemas import UserResponse, AuditLogResponse

router = APIRouter(tags=["Employees & System"])

@router.get("/employees", response_model=List[UserResponse])
def list_employees(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_trail(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
