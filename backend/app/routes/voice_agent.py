import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.database import get_db
from app.ai.voice_brain import voice_brain
from app.models import Product, Order, Dispatch, Complaint

router = APIRouter(prefix="/voice", tags=["Voice AI Assistant"])

class VoiceChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default_owner"
    voice_mode: Optional[bool] = True

class VoiceConfirmRequest(BaseModel):
    session_id: Optional[str] = "default_owner"
    confirm: bool = True

@router.post("/chat")
def handle_voice_chat(req: VoiceChatRequest, db: Session = Depends(get_db)):
    try:
        result = voice_brain.process_voice_turn(
            db=db,
            user_transcript=req.message,
            session_id=req.session_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/confirm")
def handle_voice_confirm(req: VoiceConfirmRequest, db: Session = Depends(get_db)):
    affirmative = "yes" if req.confirm else "cancel"
    result = voice_brain.process_voice_turn(
        db=db,
        user_transcript=affirmative,
        session_id=req.session_id
    )
    return result

@router.get("/proactive-greeting")
def get_proactive_voice_greeting(db: Session = Depends(get_db)):
    """
    Returns an immediate spoken briefing for the Voice AI when the assistant is opened.
    """
    now = datetime.datetime.utcnow()
    start_of_day = datetime.datetime(now.year, now.month, now.day)
    
    today_orders = db.query(Order).filter(Order.order_date >= start_of_day).count()
    low_stock = db.query(Product).filter((Product.stock_quantity - Product.reserved_stock) <= Product.reorder_level).all()
    delayed = db.query(Dispatch).filter(
        Dispatch.status.in_(["In Transit", "Preparing"]),
        Dispatch.expected_delivery_date < now
    ).count()

    greeting = (
        f"Hello Aarav. I am your Hugg AI Business Copilot. Today you have {today_orders} new orders. "
        f"I have detected {len(low_stock)} product(s) below reorder levels and {delayed} delayed shipment(s). "
        f"How can I assist you with operations right now?"
    )

    return {
        "spoken_greeting": greeting,
        "suggested_prompts": [
            "Run proactive AI scan",
            "Make dispatch for ready orders",
            "Why is overdue balance pending?",
            "Why are orders getting delayed?",
            "Why do we have complaints and how to solve them?",
            "Give me today's business report",
            "Which products need restocking?",
            "What should I focus on today?"
        ]
    }

from fastapi import UploadFile, File
import requests

@router.post("/transcribe")
async def transcribe_audio_file(file: UploadFile = File(...)):
    """
    Transcribes voice audio using Groq Whisper model.
    """
    from app.config import settings
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=400, detail="GROQ_API_KEY is required for Whisper speech-to-text.")

    try:
        content = await file.read()
        res = requests.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            files={"file": (file.filename or "recording.wav", content, file.content_type or "audio/wav")},
            data={"model": "whisper-large-v3-turbo"},
            timeout=25
        )
        if res.status_code == 200:
            return {"transcript": res.json().get("text", "").strip()}
        else:
            raise HTTPException(status_code=res.status_code, detail=res.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

