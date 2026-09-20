from fastapi import APIRouter, Depends, HTTPException
import httpx
import models
from auth import get_current_user
from database import get_db
from sqlalchemy.orm import Session
from ml import expiry_risk
import os

router = APIRouter(prefix="/ai", tags=["AI & Chat"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

SYSTEM_PROMPT = """You are FoodShare Assistant — an AI advisor for a food redistribution NGO.
You receive ML-analyzed food donation data and produce clear, actionable field guidance.
Be direct, practical, and prioritize food safety. Use bullet points. Max 300 words total."""


async def _call_gemini(message: str) -> str:
    payload = {
        "contents": [{"parts": [{"text": message}], "role": "user"}],
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
    }
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(f"{GEMINI_API_URL}?key={GEMINI_API_KEY}", json=payload)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="AI service error")
    return (
        resp.json()
        .get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )


@router.post("/chat")
async def chat(
    request: dict,
    current_user: models.User = Depends(get_current_user),
):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=501, detail="AI service not configured")
    message = request.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    try:
        ai_message = await _call_gemini(message)
        if not ai_message:
            raise HTTPException(status_code=502, detail="No response from AI")
        role_val = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
        return {"response": ai_message, "user_role": role_val}
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")


@router.get("/claimed-analysis")
async def claimed_analysis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    1. Fetches all claimed/assigned donations for this NGO.
    2. Runs ML spoilage risk on each.
    3. Calls Gemini once with the full picture → returns per-item advice + overall action plan.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=501, detail="AI service not configured")

    role_val = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    if role_val != "ngo":
        raise HTTPException(status_code=403, detail="NGO access only")

    # ── Fetch claimed/assigned donations ──────────────────────────────────────
    claimed_ids = (
        db.query(models.Claim.donation_id)
        .filter(models.Claim.ngo_id == current_user.id)
        .subquery()
    )
    donations = (
        db.query(models.Donation)
        .filter(
            models.Donation.id.in_(claimed_ids),
            models.Donation.status.in_(["claimed", "assigned"]),
        )
        .all()
    )

    if not donations:
        return {"items": [], "gemini_plan": None, "total": 0}

    # ── Run ML risk on each ───────────────────────────────────────────────────
    items = []
    for d in donations:
        risk = expiry_risk(
            expires_at  = d.expires_at,
            food_type   = d.food_type.value,
            prepared_at = d.prepared_at,
            quantity_kg = float(d.quantity_kg),
        )
        items.append({
            "donation_id":   d.id,
            "food_name":     d.food_name,
            "food_type":     d.food_type.value,
            "quantity_kg":   float(d.quantity_kg),
            "serves_people": d.serves_people,
            "address":       d.address,
            "status":        d.status.value,
            "risk":          risk["risk"],
            "risk_score":    risk["risk_score"],
            "hours_left":    risk["hours_left"],
            "confidence":    risk["confidence"],
            "model_used":    risk["model_used"],
        })

    items.sort(key=lambda x: x["risk_score"], reverse=True)
    for i, item in enumerate(items):
        item["priority_rank"] = i + 1

    # ── Build Gemini prompt with all ML data ──────────────────────────────────
    lines = [f"NGO '{current_user.name}' has {len(items)} active claimed donation(s). ML analysis:\n"]
    for it in items:
        lines.append(
            f"#{it['priority_rank']} {it['food_name']} | {it['food_type']} | "
            f"{it['quantity_kg']}kg | serves {it['serves_people']} | "
            f"status: {it['status']} | ML risk: {it['risk'].upper()} "
            f"(score {it['risk_score']}, {it['confidence']}% confidence) | "
            f"{it['hours_left']}h left | {it['address']}"
        )

    lines.append(
        "\nFor each item give: one-line action (dispatch now / schedule / safe to hold). "
        "Then write a 3-5 bullet overall action plan for the NGO coordinator."
    )

    try:
        gemini_plan = await _call_gemini("\n".join(lines))
    except Exception:
        gemini_plan = None

    return {"items": items, "gemini_plan": gemini_plan, "total": len(items)}
