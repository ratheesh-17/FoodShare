from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from database import engine, Base, SessionLocal
from routes import users, donations, volunteers, admin, upload, ml, telegram, ai
import models
import asyncio
import os
from datetime import datetime, timedelta
from telegram_bot import poll_updates, notify_urgent_expiry
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Food Redistribution API", version="1.0.0")

CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]

# CORS - allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure CORS headers are present even on unhandled 500 errors
@app.middleware("http")
async def cors_on_error(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        origin = request.headers.get("origin", "")
        headers = {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true"} if origin in CORS_ORIGINS else {}
        return JSONResponse(status_code=500, content={"detail": str(exc)}, headers=headers)

# Serve uploaded images as static files at /uploads/<filename>
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Register all routers
app.include_router(users.router)
app.include_router(donations.router)
app.include_router(volunteers.router)
app.include_router(admin.router)
app.include_router(upload.router)
app.include_router(ml.router)
app.include_router(telegram.router)
app.include_router(ai.router)


# ─── Background task: auto-expire + urgency escalation ──────────────────────

async def expire_donations():
    while True:
        db = SessionLocal()
        try:
            now = datetime.now()  # naive local time — matches how DB stores expires_at

            # 1. Expire overdue posted donations
            expired = db.query(models.Donation).filter(
                models.Donation.expires_at < now,
                models.Donation.status == "posted"
            ).all()
            for d in expired:
                d.status = "expired"
                db.add(models.Notification(
                    user_id=d.donor_id,
                    message=f"Your donation '{d.food_name}' expired before being claimed."
                ))
            if expired:
                db.commit()
                print(f"[Auto-Expire] Expired {len(expired)} donations")

            # 2. Urgency escalation — re-notify ALL NGOs for donations expiring in < 2h
            urgent_cutoff = now + timedelta(hours=2)
            urgent = db.query(models.Donation).filter(
                models.Donation.expires_at > now,
                models.Donation.expires_at <= urgent_cutoff,
                models.Donation.status == "posted"
            ).all()
            if urgent:
                ngos = db.query(models.User).filter(models.User.role == "ngo").all()
                for d in urgent:
                    hours_left = round((d.expires_at - now).total_seconds() / 3600, 1)
                    for ngo in ngos:
                        # Avoid duplicate urgent alerts — check last 30 min
                        recent = db.query(models.Notification).filter(
                            models.Notification.user_id == ngo.id,
                            models.Notification.message.like(f"%URGENT%{d.food_name}%"),
                            models.Notification.created_at > now - timedelta(minutes=30)
                        ).first()
                        if not recent:
                            db.add(models.Notification(
                                user_id=ngo.id,
                                message=(
                                    f"URGENT: '{d.food_name}' ({d.quantity_kg}kg, serves {d.serves_people}) "
                                    f"expires in {hours_left}h! Claim now before it's wasted."
                                )
                            ))
                            # Telegram urgent alert
                            asyncio.create_task(notify_urgent_expiry(
                                food_name          = d.food_name,
                                quantity_kg        = float(d.quantity_kg),
                                serves             = d.serves_people,
                                hours_left         = hours_left,
                                address            = d.address,
                                db_session_factory = SessionLocal,
                            ))
                db.commit()
                print(f"[Urgency] Sent alerts for {len(urgent)} expiring donations")

        finally:
            db.close()
        await asyncio.sleep(60)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(expire_donations())
    asyncio.create_task(poll_updates(SessionLocal))
    print("Food Redistribution API started")
    print("Docs: http://localhost:8000/docs")
    print("Telegram bot polling started")


@app.get("/")
def root():
    return {
        "message": "Food Redistribution API",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "ok"}
