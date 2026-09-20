from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models, schemas
from auth import require_role, get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/metrics", response_model=schemas.MetricsOut)
def get_metrics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin"))
):
    total = db.query(models.Donation).count()
    completed = db.query(models.Donation).filter(models.Donation.status == "completed").count()
    active_pickups = db.query(models.Donation).filter(models.Donation.status == "assigned").count()

    meals_saved = db.query(func.sum(models.Donation.serves_people)).filter(
        models.Donation.status == "completed"
    ).scalar() or 0

    kg_reduced = db.query(func.sum(models.Donation.quantity_kg)).filter(
        models.Donation.status == "completed"
    ).scalar() or 0

    co2_saved = round(float(kg_reduced) * 2.5, 1)
    active_ngos = db.query(models.User).filter(models.User.role == "ngo").count()

    top_donors_query = db.query(
        models.User.name,
        func.count(models.Donation.id).label("count"),
        func.sum(models.Donation.serves_people).label("meals")
    ).join(models.Donation, models.Donation.donor_id == models.User.id).filter(
        models.Donation.status == "completed"
    ).group_by(models.User.id).order_by(func.count(models.Donation.id).desc()).limit(5).all()

    top_donors = [{"name": r.name, "donations": r.count, "meals": r.meals} for r in top_donors_query]

    return {
        "total_donations": total,
        "completed_donations": completed,
        "meals_saved": int(meals_saved),
        "kg_reduced": float(kg_reduced),
        "co2_saved": co2_saved,
        "active_ngos": active_ngos,
        "active_pickups": active_pickups,
        "top_donors": top_donors
    }


# ─── Public leaderboard — accessible to all logged-in roles ─────────────────────────────────

@router.get("/leaderboard")
def get_leaderboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Rank donors by total donations posted (any status except expired)
    top_donors_query = db.query(
        models.User.id,
        models.User.name,
        models.User.email,
        models.User.role,
        models.User.rating,
        func.count(models.Donation.id).label("donation_count"),
        func.sum(
            func.IF(models.Donation.status == "completed", models.Donation.serves_people, 0)
        ).label("meals_saved"),
        func.sum(
            func.IF(models.Donation.status == "completed", models.Donation.quantity_kg, 0)
        ).label("kg_saved"),
    ).join(models.Donation, models.Donation.donor_id == models.User.id).filter(
        models.Donation.status != "expired"
    ).group_by(models.User.id).order_by(
        func.count(models.Donation.id).desc()
    ).limit(50).all()

    # Platform-wide impact — only completed donations
    total_meals = db.query(func.sum(models.Donation.serves_people)).filter(
        models.Donation.status == "completed"
    ).scalar() or 0

    total_kg = db.query(func.sum(models.Donation.quantity_kg)).filter(
        models.Donation.status == "completed"
    ).scalar() or 0

    total_donations = db.query(models.Donation).filter(
        models.Donation.status == "completed"
    ).count()

    total_users = db.query(models.User).count()

    rankings = [
        {
            "rank":           i + 1,
            "id":             r.id,
            "name":           r.name,
            "email":          r.email,
            "role":           r.role.value if hasattr(r.role, "value") else r.role,
            "rating":         float(r.rating) if r.rating else 5.0,
            "donation_count": r.donation_count,
            "meals_saved":    int(r.meals_saved or 0),
            "kg_saved":       round(float(r.kg_saved or 0), 1),
            "co2_saved":      round(float(r.kg_saved or 0) * 2.5, 1),
        }
        for i, r in enumerate(top_donors_query)
    ]

    my_rank = next((r for r in rankings if r["id"] == current_user.id), None)

    # For non-donor roles, build a participation summary instead
    role = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    my_contribution = None
    if role == "ngo":
        claimed = db.query(func.count(models.Claim.id)).filter(
            models.Claim.ngo_id == current_user.id
        ).scalar() or 0
        completed_claims = db.query(func.count(models.Donation.id)).join(
            models.Claim, models.Claim.donation_id == models.Donation.id
        ).filter(
            models.Claim.ngo_id == current_user.id,
            models.Donation.status == "completed"
        ).scalar() or 0
        meals = db.query(func.sum(models.Donation.serves_people)).join(
            models.Claim, models.Claim.donation_id == models.Donation.id
        ).filter(
            models.Claim.ngo_id == current_user.id,
            models.Donation.status == "completed"
        ).scalar() or 0
        my_contribution = {
            "role": "ngo", "name": current_user.name,
            "claimed": claimed, "completed": completed_claims, "meals_facilitated": int(meals)
        }
    elif role == "volunteer":
        total_tasks = db.query(func.count(models.VolunteerTask.id)).filter(
            models.VolunteerTask.volunteer_id == current_user.id
        ).scalar() or 0
        delivered = db.query(func.count(models.VolunteerTask.id)).filter(
            models.VolunteerTask.volunteer_id == current_user.id,
            models.VolunteerTask.status == "delivered"
        ).scalar() or 0
        meals = db.query(func.sum(models.Donation.serves_people)).join(
            models.VolunteerTask, models.VolunteerTask.donation_id == models.Donation.id
        ).filter(
            models.VolunteerTask.volunteer_id == current_user.id,
            models.VolunteerTask.status == "delivered"
        ).scalar() or 0
        my_contribution = {
            "role": "volunteer", "name": current_user.name,
            "total_tasks": total_tasks, "delivered": delivered,
            "meals_delivered": int(meals), "rating": float(current_user.rating or 5.0)
        }

    return {
        "rankings":        rankings,
        "my_rank":         my_rank,
        "my_contribution": my_contribution,
        "platform_totals": {
            "total_meals":     int(total_meals),
            "total_kg":        round(float(total_kg), 1),
            "total_co2":       round(float(total_kg) * 2.5, 1),
            "total_donations": total_donations,
            "total_users":     total_users,
        },
    }


@router.get("/all-donations", response_model=list[schemas.DonationOut])
def get_all_donations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin"))
):
    return db.query(models.Donation).order_by(models.Donation.created_at.desc()).all()


@router.get("/all-users", response_model=list[schemas.UserOut])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin"))
):
    return db.query(models.User).all()
