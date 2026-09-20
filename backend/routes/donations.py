from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from datetime import datetime, timezone
import models, schemas
from auth import get_current_user, require_role
from utils import haversine
from ml import expiry_risk, smart_ngo_match
import asyncio, json
from sse_starlette.sse import EventSourceResponse
from telegram_bot import (
    notify_new_donation, notify_donation_claimed,
    notify_volunteer_assigned, notify_delivery_complete,
    notify_urgent_expiry,
)

router = APIRouter(prefix="/donations", tags=["Donations"])


# ─── Debug: decode current token (remove after fixing) ───────────────────────
@router.get("/whoami")
def whoami(current_user: models.User = Depends(get_current_user)):
    return {
        "id":    current_user.id,
        "name":  current_user.name,
        "email": current_user.email,
        "role":  current_user.role.value,
    }

# ─── Donor: Post a donation ───────────────────────────────────────────────────

@router.post("/", response_model=schemas.DonationOut)
async def create_donation(
    data: schemas.DonationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("donor"))
):
    donation = models.Donation(
        donor_id=current_user.id,
        food_name=data.food_name,
        food_type=data.food_type,
        quantity_kg=data.quantity_kg,
        serves_people=data.serves_people,
        photo_url=data.photo_url,
        address=data.address,
        lat=data.lat,
        lng=data.lng,
        prepared_at=data.prepared_at,
        expires_at=data.expires_at,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    risk     = expiry_risk(donation.expires_at, donation.food_type.value)
    risk_tag = f" Expiry risk: {risk['risk']} ({risk['hours_left']}h left)" if risk["risk"] != "low" else ""

    ngos          = db.query(models.User).filter(models.User.role == "ngo").all()
    logs          = db.query(models.DemandLog).all()
    ranked        = smart_ngo_match(data.lat, data.lng, ngos, logs)
    notified_ids  = set()

    for match in ranked:
        ngo_id = match["ngo_id"]
        notified_ids.add(ngo_id)
        db.add(models.Notification(
            user_id=ngo_id,
            message=(
                f"New donation: {data.food_name} ({data.quantity_kg}kg).{risk_tag} "
                f"Match score: {match['match_score']} | {match['distance_km']}km away"
            )
        ))

    for ngo in ngos:
        if ngo.id not in notified_ids:
            db.add(models.Notification(
                user_id=ngo.id,
                message=f"New donation: {data.food_name} ({data.quantity_kg}kg) posted!{risk_tag}"
            ))
    db.commit()

    asyncio.create_task(notify_new_donation(
        food_name          = data.food_name,
        quantity_kg        = float(data.quantity_kg),
        serves             = data.serves_people,
        food_type          = data.food_type.value if hasattr(data.food_type, "value") else data.food_type,
        address            = data.address,
        donor_name         = current_user.name,
        risk               = risk["risk"],
        hours_left         = risk["hours_left"],
        db_session_factory = SessionLocal,
    ))
    return donation


# ─── NGO: Get nearby donations ────────────────────────────────────────────────

@router.get("/nearby", response_model=list[schemas.DonationOut])
def get_nearby_donations(
    lat: float,
    lng: float,
    radius_km: float = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    donations = db.query(models.Donation).filter(
        models.Donation.status == "posted",
        models.Donation.expires_at > datetime.now()
    ).all()

    result = []
    for d in donations:
        dist = haversine(lat, lng, float(d.lat), float(d.lng))
        if dist <= radius_km:
            d_dict = schemas.DonationOut.from_orm(d)
            d_dict.distance_km = dist
            result.append(d_dict)

    result.sort(key=lambda x: x.distance_km)
    return result


# ─── NGO: My claimed donations ────────────────────────────────────────────────

@router.get("/my-claims", response_model=list[schemas.DonationOut])
def get_my_claims(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("ngo"))
):
    """Returns only donations claimed by this NGO."""
    claimed_ids = db.query(models.Claim.donation_id).filter(
        models.Claim.ngo_id == current_user.id
    ).subquery()
    return db.query(models.Donation).filter(
        models.Donation.id.in_(claimed_ids)
    ).order_by(models.Donation.created_at.desc()).all()


# ─── SSE: Real-time notifications ─────────────────────────────────────────────
# NOTE: must be defined BEFORE /{donation_id} to avoid route shadowing

@router.get("/stream/notifications")
async def stream_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    async def generator():
        while True:
            notifications = db.query(models.Notification).filter(
                models.Notification.user_id == current_user.id,
                models.Notification.is_read == False
            ).all()
            if notifications:
                data = [{"id": n.id, "message": n.message} for n in notifications]
                for n in notifications:
                    n.is_read = True
                db.commit()
                yield {"data": json.dumps(data)}
            await asyncio.sleep(5)

    return EventSourceResponse(generator())


# ─── Get all donations ────────────────────────────────────────────────────────

@router.get("/", response_model=list[schemas.DonationOut])
def get_all_donations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("donor"))
):
    return db.query(models.Donation).filter(
        models.Donation.donor_id == current_user.id
    ).order_by(models.Donation.created_at.desc()).all()


# ─── Get single donation ──────────────────────────────────────────────────────
# NOTE: must be defined AFTER all static GET paths (/nearby, /my-claims, /stream/...)

@router.get("/{donation_id}", response_model=schemas.DonationOut)
def get_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    return donation


# ─── NGO: Claim a donation ────────────────────────────────────────────────────

@router.patch("/{donation_id}/claim", response_model=schemas.DonationOut)
async def claim_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("ngo"))
):
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.status != "posted":
        raise HTTPException(status_code=400, detail="Donation is no longer available")

    donation.status = "claimed"
    db.add(models.Claim(donation_id=donation_id, ngo_id=current_user.id))

    if current_user.lat is not None and current_user.lng is not None:
        db.add(models.DemandLog(lat=current_user.lat, lng=current_user.lng, claim_count=1))

    db.add(models.Notification(
        user_id=donation.donor_id,
        message=f"Your donation '{donation.food_name}' has been claimed by {current_user.name}!"
    ))
    db.commit()
    db.refresh(donation)

    asyncio.create_task(notify_donation_claimed(
        food_name          = donation.food_name,
        ngo_name           = current_user.name,
        donor_id           = donation.donor_id,
        db_session_factory = SessionLocal,
    ))
    return donation


# ─── NGO: Self-collect (no volunteer needed) ──────────────────────────────────

@router.patch("/{donation_id}/self-collect", response_model=schemas.DonationOut)
def self_collect(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("ngo"))
):
    """NGO collects the food themselves — skips volunteer assignment entirely."""
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    if donation.status not in ("posted", "claimed"):
        raise HTTPException(status_code=400, detail="Donation is not available for self-collection")

    existing_claim = db.query(models.Claim).filter(
        models.Claim.donation_id == donation_id
    ).first()
    if not existing_claim:
        db.add(models.Claim(donation_id=donation_id, ngo_id=current_user.id))
        if current_user.lat is not None and current_user.lng is not None:
            db.add(models.DemandLog(lat=current_user.lat, lng=current_user.lng, claim_count=1))

    donation.status = "completed"

    db.add(models.Notification(
        user_id=donation.donor_id,
        message=f"Your donation '{donation.food_name}' was collected directly by {current_user.name}!"
    ))
    db.commit()
    db.refresh(donation)
    return donation


# ─── Assign volunteer ─────────────────────────────────────────────────────────

@router.patch("/{donation_id}/assign/{volunteer_id}", response_model=schemas.VolunteerTaskOut)
async def assign_volunteer(
    donation_id: int,
    volunteer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("ngo", "admin"))
):
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.status != "claimed":
        raise HTTPException(status_code=400, detail="Donation must be claimed first")

    volunteer = db.query(models.User).filter(
        models.User.id == volunteer_id,
        models.User.role == "volunteer"
    ).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    donation.status = "assigned"
    task = models.VolunteerTask(donation_id=donation_id, volunteer_id=volunteer_id)
    db.add(task)

    db.add(models.Notification(
        user_id=volunteer_id,
        message=f"You have been assigned to pick up '{donation.food_name}' from {donation.address}"
    ))
    db.commit()
    db.refresh(task)

    asyncio.create_task(notify_volunteer_assigned(
        food_name          = donation.food_name,
        address            = donation.address,
        serves             = donation.serves_people,
        expires_at         = donation.expires_at.strftime("%d %b %Y %H:%M"),
        volunteer_id       = volunteer_id,
        volunteer_name     = volunteer.name,
        db_session_factory = SessionLocal,
    ))
    return task


# ─── Volunteer: Complete delivery ─────────────────────────────────────────────

@router.patch("/{donation_id}/complete")
async def complete_donation(
    donation_id: int,
    pickup_photo_url: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("volunteer"))
):
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    task = db.query(models.VolunteerTask).filter(
        models.VolunteerTask.donation_id == donation_id,
        models.VolunteerTask.volunteer_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=403, detail="Not your task")

    task.status = "delivered"
    task.pickup_photo_url = pickup_photo_url
    donation.status = "completed"

    db.add(models.Notification(
        user_id=donation.donor_id,
        message=f"Your donation '{donation.food_name}' was successfully delivered by {current_user.name}!"
    ))

    claim = db.query(models.Claim).filter(models.Claim.donation_id == donation_id).first()
    if claim:
        db.add(models.Notification(
            user_id=claim.ngo_id,
            message=f"'{donation.food_name}' has been delivered by volunteer {current_user.name}. Delivery complete!"
        ))

    db.commit()

    asyncio.create_task(notify_delivery_complete(
        food_name          = donation.food_name,
        serves             = donation.serves_people,
        volunteer_name     = current_user.name,
        donor_id           = donation.donor_id,
        ngo_id             = claim.ngo_id if claim else None,
        db_session_factory = SessionLocal,
    ))
    return {"message": "Donation completed successfully"}


# ─── Donor/NGO: Rate volunteer ────────────────────────────────────────────────

@router.post("/{donation_id}/rate-volunteer")
def rate_volunteer(
    donation_id: int,
    rating: float,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("donor", "ngo"))
):
    if not (1.0 <= rating <= 5.0):
        raise HTTPException(status_code=400, detail="Rating must be between 1.0 and 5.0")

    if current_user.role.value == "donor":
        donation = db.query(models.Donation).filter(
            models.Donation.id == donation_id,
            models.Donation.donor_id == current_user.id,
            models.Donation.status == "completed"
        ).first()
    else:
        claim = db.query(models.Claim).filter(
            models.Claim.donation_id == donation_id,
            models.Claim.ngo_id == current_user.id
        ).first()
        donation = db.query(models.Donation).filter(
            models.Donation.id == donation_id,
            models.Donation.status == "completed"
        ).first() if claim else None

    if not donation:
        raise HTTPException(status_code=404, detail="Completed donation not found")

    task = db.query(models.VolunteerTask).filter(
        models.VolunteerTask.donation_id == donation_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="No volunteer task found")

    volunteer = db.query(models.User).filter(models.User.id == task.volunteer_id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    old = float(volunteer.rating) if volunteer.rating else 5.0
    volunteer.rating = round((old * 4 + rating) / 5, 1)
    db.commit()
    return {"message": f"Rated {volunteer.name} {rating}/5", "new_rating": volunteer.rating}


# ─── Food Lifecycle Timeline ──────────────────────────────────────────────────

@router.get("/{donation_id}/lifecycle")
def get_lifecycle(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    donor    = db.query(models.User).filter(models.User.id == donation.donor_id).first()
    claim    = db.query(models.Claim).filter(models.Claim.donation_id == donation_id).first()
    task     = db.query(models.VolunteerTask).filter(models.VolunteerTask.donation_id == donation_id).first()
    ngo_user = db.query(models.User).filter(models.User.id == claim.ngo_id).first() if claim else None
    vol_user = db.query(models.User).filter(models.User.id == task.volunteer_id).first() if task else None

    timeline = [
        {"step": "posted",    "label": "Food Posted",            "who": donor.name if donor else "Unknown",   "when": donation.created_at.isoformat() if donation.created_at else None, "detail": f"{donation.food_name} • {donation.quantity_kg}kg • serves {donation.serves_people}", "done": True},
        {"step": "claimed",   "label": "Claimed by NGO",         "who": ngo_user.name if ngo_user else None,  "when": claim.claimed_at.isoformat() if claim else None,                  "detail": f"Claimed by {ngo_user.name}" if ngo_user else "Waiting for NGO",         "done": claim is not None},
        {"step": "assigned",  "label": "Volunteer Assigned",     "who": vol_user.name if vol_user else None,  "when": task.assigned_at.isoformat() if task else None,                   "detail": f"Pickup by {vol_user.name}" if vol_user else "Waiting for volunteer",    "done": task is not None},
        {"step": "completed", "label": "Delivered to Community", "who": vol_user.name if vol_user else None,  "when": None,                                                              "detail": f"Fed {donation.serves_people} people",                                   "done": donation.status == "completed"},
    ]

    return {
        "donation_id":   donation_id,
        "food_name":     donation.food_name,
        "status":        donation.status,
        "serves_people": donation.serves_people,
        "quantity_kg":   float(donation.quantity_kg),
        "co2_saved":     round(float(donation.quantity_kg) * 2.5, 1) if donation.status == "completed" else 0,
        "timeline":      timeline,
    }
