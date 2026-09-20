from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import hash_password, verify_password, create_token, get_current_user
import os, random, time
from dotenv import load_dotenv

load_dotenv()

ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL", "ratheesh3921@gmail.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Ratheesh@1703")

# In-memory OTP store: { otp: str, expires_at: float }
_otp_store: dict = {}

router = APIRouter(prefix="/users", tags=["Users"])


# ─── Public: Register ─────────────────────────────────────────────────────────

@router.post("/register", response_model=schemas.TokenOut)
def register(data: schemas.UserRegister, db: Session = Depends(get_db)):
    # Block anyone from registering as admin
    if data.role.value == "admin":
        raise HTTPException(status_code=403, detail="Admin registration is not allowed")

    existing = db.query(models.User).filter(models.User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        whatsapp_number=data.whatsapp_number,
        address=data.address,
        lat=data.lat,
        lng=data.lng,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token({"user_id": user.id, "role": user.role.value})
    return {"access_token": token, "token_type": "bearer", "user": user}


# ─── Public: Login (regular users) ───────────────────────────────────────────

@router.post("/login", response_model=schemas.TokenOut)
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    # Block admin from using regular login
    if data.email.lower() == ADMIN_EMAIL.lower():
        raise HTTPException(status_code=403, detail="Use /users/admin-login for admin access")

    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token({"user_id": user.id, "role": user.role.value})
    return {"access_token": token, "token_type": "bearer", "user": user}


# ─── Admin: Step 1 — Validate credentials, generate OTP ─────────────────────

@router.post("/admin-login")
def admin_login(data: schemas.UserLogin):
    if data.email.lower() != ADMIN_EMAIL.lower() or data.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    # Generate 6-digit OTP, valid for 5 minutes
    otp = str(random.randint(100000, 999999))
    _otp_store["otp"]        = otp
    _otp_store["expires_at"] = time.time() + 300  # 5 min

    # Print to console (as requested)
    print("\n" + "="*50)
    print(f"  🔐 ADMIN OTP: {otp}")
    print(f"  ⏰ Valid for 5 minutes")
    print("="*50 + "\n")

    return {"otp_required": True, "message": "OTP sent to console"}


# ─── Admin: Step 2 — Verify OTP, return JWT ──────────────────────────────────

@router.post("/admin-verify-otp")
def admin_verify_otp(payload: schemas.AdminOTPVerify, db: Session = Depends(get_db)):
    stored_otp  = _otp_store.get("otp")
    expires_at  = _otp_store.get("expires_at", 0)

    if not stored_otp:
        raise HTTPException(status_code=400, detail="No OTP requested. Please login first")

    if time.time() > expires_at:
        _otp_store.clear()
        raise HTTPException(status_code=400, detail="OTP expired. Please login again")

    if payload.otp != stored_otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")

    # OTP correct — clear it (one-time use)
    _otp_store.clear()

    # Get or auto-create admin user in DB
    admin = db.query(models.User).filter(models.User.email == ADMIN_EMAIL).first()
    if not admin:
        admin = models.User(
            name="Admin",
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            role=models.UserRole.admin,
            verified=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    token = create_token({"user_id": admin.id, "role": "admin"})
    return {"access_token": token, "token_type": "bearer", "user": {
        "id": admin.id, "name": admin.name, "email": admin.email,
        "role": "admin", "whatsapp_number": None, "address": None,
        "lat": None, "lng": None, "verified": True,
        "rating": 5.0, "created_at": str(admin.created_at),
    }}


# ─── Authenticated: Profile ───────────────────────────────────────────────────

@router.get("/profile", response_model=schemas.UserOut)
def get_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/connect-telegram")
def connect_telegram(
    data: schemas.ConnectTelegram,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Saves the Telegram chat_id for the logged-in user.
    Called after Telegram Login Widget confirms the user.
    """
    import hashlib, hmac, time

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")

    # Verify Telegram hash to prevent spoofing
    if bot_token and bot_token != "your_bot_token_here":
        check_string = f"id={data.telegram_id}\nfirst_name={data.first_name}"
        if data.username:
            check_string += f"\nusername={data.username}"
        secret = hashlib.sha256(bot_token.encode()).digest()
        expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
        if expected != data.hash:
            raise HTTPException(status_code=401, detail="Invalid Telegram auth data")

    current_user.telegram_chat_id = str(data.telegram_id)
    db.commit()
    db.refresh(current_user)

    return {
        "message": f"Telegram connected successfully! Hi {data.first_name}!",
        "telegram_chat_id": current_user.telegram_chat_id,
    }


@router.delete("/disconnect-telegram")
def disconnect_telegram(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    current_user.telegram_chat_id = None
    db.commit()
    return {"message": "Telegram disconnected"}


@router.get("/volunteers", response_model=list[schemas.UserOut])
def get_volunteers(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.User).filter(models.User.role == "volunteer").all()
