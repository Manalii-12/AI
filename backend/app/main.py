import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed_data import seed_database
from app.ai.engine import proactive_engine
from app.ai.daily_briefing import generate_daily_briefing

# Import routers
from app.routes.dashboard import router as dashboard_router
from app.routes.orders import router as orders_router
from app.routes.customers import router as customers_router
from app.routes.inventory import router as inventory_router
from app.routes.payments import router as payments_router
from app.routes.dispatch import router as dispatch_router
from app.routes.complaints import router as complaints_router
from app.routes.suppliers import router as suppliers_router
from app.routes.ai_intelligence import router as ai_router
from app.routes.employees import router as employees_router
from app.routes.voice_agent import router as voice_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hugg_ai")

# Scheduler setup
scheduler = BackgroundScheduler()

def scheduled_ai_monitor_job():
    """Periodic proactive AI scanner running in the background"""
    logger.info("Executing scheduled proactive AI business monitoring scan...")
    db = SessionLocal()
    try:
        proactive_engine.run_full_business_scan(db)
        generate_daily_briefing(db)
        logger.info("Scheduled proactive scan finished successfully.")
    except Exception as e:
        logger.error(f"Error during scheduled proactive scan: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Seed realistic demo dataset
    db = SessionLocal()
    try:
        seed_database(db)
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()

    # Start APScheduler background monitor
    scheduler.add_job(scheduled_ai_monitor_job, "interval", minutes=settings.AI_SCAN_INTERVAL_MINUTES)
    scheduler.start()
    logger.info(f"APScheduler started: Proactive AI scanning scheduled every {settings.AI_SCAN_INTERVAL_MINUTES} minutes.")

    yield

    # Shutdown
    scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped.")

app = FastAPI(
    title="Hugg AI - Business Operations & Decision Intelligence Platform",
    description="Proactive AI Intelligence, Multi-Module Management & Autonomous Root Cause Diagnostic Engine for Hugg Beverages.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes under /api
app.include_router(dashboard_router, prefix=settings.API_PREFIX)
app.include_router(orders_router, prefix=settings.API_PREFIX)
app.include_router(customers_router, prefix=settings.API_PREFIX)
app.include_router(inventory_router, prefix=settings.API_PREFIX)
app.include_router(payments_router, prefix=settings.API_PREFIX)
app.include_router(dispatch_router, prefix=settings.API_PREFIX)
app.include_router(complaints_router, prefix=settings.API_PREFIX)
app.include_router(suppliers_router, prefix=settings.API_PREFIX)
app.include_router(ai_router, prefix=settings.API_PREFIX)
app.include_router(employees_router, prefix=settings.API_PREFIX)
app.include_router(voice_router, prefix=settings.API_PREFIX)

@app.get("/api/health")
def healthcheck():
    return {
        "status": "healthy",
        "service": "Hugg AI Business Platform",
        "version": settings.VERSION,
        "scheduler_active": scheduler.running
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to Hugg AI Business Operations & Decision Intelligence Platform API",
        "docs": "/docs",
        "health": "/api/health"
    }
