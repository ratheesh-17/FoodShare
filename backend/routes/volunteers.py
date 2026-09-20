from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user, require_role
from telegram_bot import notify_route_assigned
import asyncio

router = APIRouter(prefix="/volunteers", tags=["Volunteers"])


@router.get("/my-tasks", response_model=list[schemas.VolunteerTaskOut])
def get_my_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("volunteer"))
):
    tasks = db.query(models.VolunteerTask).filter(
        models.VolunteerTask.volunteer_id == current_user.id
    ).all()

    result = []
    for task in tasks:
        donation = db.query(models.Donation).filter(models.Donation.id == task.donation_id).first()
        ngo = None
        if donation:
            claim = db.query(models.Claim).filter(models.Claim.donation_id == donation.id).first()
            if claim:
                ngo = db.query(models.User).filter(models.User.id == claim.ngo_id).first()

        out = schemas.VolunteerTaskOut.model_validate(task)
        if donation:
            out.donation_food_name = donation.food_name
            out.donation_address   = donation.address
            out.donation_lat       = float(donation.lat)
            out.donation_lng       = float(donation.lng)
        if ngo:
            out.ngo_name    = ngo.name
            out.ngo_address = ngo.address
            out.ngo_lat     = float(ngo.lat) if ngo.lat else None
            out.ngo_lng     = float(ngo.lng) if ngo.lng else None
        result.append(out)

    return result


@router.get("/notifications", response_model=list[schemas.NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).limit(20).all()


# ─── NGO: Send optimized route to volunteer via Telegram ───────────────────────────

@router.post("/send-route")
async def send_route_to_volunteer(
    data: schemas.SendRouteIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("ngo", "admin"))
):
    # Validate volunteer exists
    volunteer = db.query(models.User).filter(
        models.User.id == data.volunteer_id,
        models.User.role == "volunteer"
    ).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    # Validate route has at least one pickup stop
    pickups = [s for s in data.ordered_stops if s.type == "pickup"]
    if not pickups:
        raise HTTPException(status_code=400, detail="Route must have at least one pickup stop")

    # Check Telegram is connected
    if not volunteer.telegram_chat_id:
        raise HTTPException(
            status_code=400,
            detail=f"{volunteer.name} has not connected Telegram. Ask them to connect from their Profile page."
        )

    # Send the route message
    stops_dicts = [s.model_dump() for s in data.ordered_stops]
    await notify_route_assigned(
        volunteer_chat_id = volunteer.telegram_chat_id,
        volunteer_name    = volunteer.name,
        ngo_name          = current_user.name,
        ordered_stops     = stops_dicts,
        total_km          = data.total_km,
    )

    # Also save an in-app notification for the volunteer
    db.add(models.Notification(
        user_id = volunteer.id,
        message = f"{current_user.name} sent you an optimized route with {len(data.ordered_stops)} stops ({data.total_km} km). Check Telegram for details."
    ))
    db.commit()

    return {
        "message": f"Route sent to {volunteer.name} on Telegram",
        "volunteer": volunteer.name,
        "stops": len(data.ordered_stops),
        "total_km": data.total_km,
    }