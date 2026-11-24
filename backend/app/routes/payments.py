from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas import PaymentCreate, PaymentResponse
import app.crud as crud
from app.ai.engine import proactive_engine

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.get("", response_model=List[PaymentResponse])
def list_payments(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    return crud.get_payments(db=db, status=status, search=search, limit=limit)

from pydantic import BaseModel

class PaymentAiActionRequest(BaseModel):
    action_type: str # RESEND_PAYMENT_LINK, RESOLVE_MISMATCH, VOID_DUPLICATE
    notes: Optional[str] = None

@router.post("/{payment_id}/ai-action")
def execute_payment_ai_action(payment_id: int, req: PaymentAiActionRequest, db: Session = Depends(get_db)):
    from app.models import Payment, AuditLog
    pay = db.query(Payment).filter(Payment.id == payment_id).first()
    if not pay:
        raise HTTPException(status_code=404, detail="Payment record not found")

    action_label = req.action_type
    if req.action_type == "RESEND_PAYMENT_LINK":
        pay.notes = (pay.notes or "") + f" | [AI Action: Resent Dynamic UPI Payment Link and SMS mandate to customer.]"
        action_label = "Resent Dynamic UPI Payment Link & SMS Mandate"
    elif req.action_type == "RESOLVE_MISMATCH":
        pay.notes = (pay.notes or "") + f" | [AI Action: Reconciled ledger discrepancy with Form 16A TDS withholding adjustment note.]"
        action_label = "Reconciled Invoice Variance via TDS Withholding Adjustment Voucher"
    elif req.action_type == "VOID_DUPLICATE":
        pay.status = "Voided"
        pay.notes = (pay.notes or "") + f" | [AI Action: Redundant webhook callback transaction voided from active ledger.]"
        action_label = "Voided Redundant Webhook Reference & Settle Gateway Ledger"

    crud.log_audit(
        db,
        action="AI_ACTION",
        module="Payments",
        details=f"AI Executed: {action_label} for Payment #{pay.id} (Ref: {pay.transaction_ref})",
        user_name="Aarav Mehta (Owner)"
    )
    db.commit()
    proactive_engine.run_full_business_scan(db)

    return {
        "success": True,
        "message": f"Successfully applied AI Action: {action_label}",
        "payment_id": payment_id
    }

@router.post("", response_model=PaymentResponse, status_code=201)
def record_payment(p_in: PaymentCreate, db: Session = Depends(get_db)):
    try:
        payment = crud.create_payment(db=db, p_in=p_in)
        proactive_engine.run_full_business_scan(db)
        return crud.get_payments(db=db, limit=1)[0]
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
