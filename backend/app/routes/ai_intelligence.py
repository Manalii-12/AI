from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import AiInsight
from app.schemas import (
    AiInsightResponse, AiActionApproveRequest, DailyBriefingResponse,
    HealthScoreBreakdown, WhatIfRequest, WhatIfResponse
)
from app.ai.engine import proactive_engine
from app.ai.health_score import calculate_business_health_score
from app.ai.daily_briefing import generate_daily_briefing
from app.ai.forecasting import (
    get_demand_forecast, detect_revenue_leakage,
    get_customer_intelligence, get_supplier_intelligence
)
from app.ai.simulator import run_what_if_simulation

router = APIRouter(prefix="/ai", tags=["AI Intelligence"])

@router.get("/insights", response_model=List[AiInsightResponse])
def get_insights(
    severity: Optional[str] = None,
    status: Optional[str] = "ACTIVE",
    module: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AiInsight)
    if status and status != "ALL":
        query = query.filter(AiInsight.status == status)
    if severity:
        query = query.filter(AiInsight.severity == severity)
    if module:
        query = query.filter(AiInsight.affected_module.ilike(f"%{module}%"))
    
    return query.order_by(AiInsight.created_at.desc()).all()

@router.post("/scan")
def trigger_proactive_scan(db: Session = Depends(get_db)):
    insights = proactive_engine.run_full_business_scan(db)
    generate_daily_briefing(db, force_refresh=True)
    return {
        "status": "COMPLETED",
        "message": f"Proactive AI diagnostics completed successfully. {len(insights)} active intelligence observations indexed.",
        "insights_count": len(insights)
    }

@router.post("/actions/approve")
def approve_ai_action(req: AiActionApproveRequest, db: Session = Depends(get_db)):
    try:
        result = proactive_engine.execute_approved_action(
            db=db,
            insight_id=req.insight_id,
            action_type=req.action_type,
            custom_params=req.custom_params,
            user_name="Aarav Mehta (Owner)"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/insights/{insight_id}/dismiss")
def dismiss_ai_insight(insight_id: int, db: Session = Depends(get_db)):
    insight = db.query(AiInsight).filter(AiInsight.id == insight_id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    insight.status = "REJECTED"
    db.commit()
    return {"status": "DISMISSED", "insight_id": insight_id}

@router.get("/health-score")
def get_health_score(db: Session = Depends(get_db)):
    return calculate_business_health_score(db)

@router.get("/daily-briefing", response_model=DailyBriefingResponse)
def get_daily_briefing(force_refresh: bool = False, db: Session = Depends(get_db)):
    return generate_daily_briefing(db, force_refresh=force_refresh)

@router.get("/forecasting")
def get_forecasting_data(db: Session = Depends(get_db)):
    return get_demand_forecast(db)

@router.get("/revenue-leakage")
def get_leakage_audit(db: Session = Depends(get_db)):
    return detect_revenue_leakage(db)

@router.get("/customer-intelligence")
def get_cust_intel(db: Session = Depends(get_db)):
    return get_customer_intelligence(db)

@router.get("/supplier-intelligence")
def get_supp_intel(db: Session = Depends(get_db)):
    return get_supplier_intelligence(db)

@router.post("/simulate", response_model=WhatIfResponse)
def simulate_scenario(req: WhatIfRequest, db: Session = Depends(get_db)):
    return run_what_if_simulation(
        db=db,
        demand_increase_pct=req.demand_increase_pct,
        supplier_delay_days=req.supplier_delay_days,
        price_change_pct=req.price_change_pct
    )
