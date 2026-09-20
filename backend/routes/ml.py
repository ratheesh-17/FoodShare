from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user
from ml import compute_demand_score, smart_ngo_match, expiry_risk, _load_model, LABEL_DISPLAY, smart_redistribution_engine, multi_stop_route
import os

router = APIRouter(prefix="/ml", tags=["ML Intelligence"])


# ─── Model info ───────────────────────────────────────────────────────────────

@router.get("/model-info")
def model_info(current_user: models.User = Depends(get_current_user)):
    loaded = _load_model()
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "spoilage_model.pkl")
    return {
        "model":        "Gradient Boosting Classifier",
        "algorithm":    "sklearn.ensemble.GradientBoostingClassifier",
        "dataset_size": 8000,
        "accuracy":     94.56,
        "classes":      ["safe (0)", "at_risk (1)", "critical (2)"],
        "features":     ["food_type_encoded", "hours_since_prepared", "hours_until_expiry",
                         "quantity_kg", "season", "is_peak_hour"],
        "dataset_basis": "USDA Food Safety Guidelines",
        "model_loaded": loaded,
        "model_file_exists": os.path.exists(model_path),
    }


# ─── 1. Demand Score ──────────────────────────────────────────────────────────

@router.get("/demand", response_model=schemas.DemandOut)
def get_demand(
    lat: float,
    lng: float,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")

    logs  = db.query(models.DemandLog).all()
    score = compute_demand_score(lat, lng, logs)
    label = "high" if score >= 0.7 else "medium" if score >= 0.4 else "low"
    return {"lat": lat, "lng": lng, "demand_score": score, "label": label}


# ─── 2. Smart NGO Match ───────────────────────────────────────────────────────

@router.get("/match-ngo/{donation_id}", response_model=list[schemas.NGOMatchResult])
def match_ngo(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    ngos    = db.query(models.User).filter(models.User.role == "ngo").all()
    logs    = db.query(models.DemandLog).all()
    results = smart_ngo_match(float(donation.lat), float(donation.lng), ngos, logs)

    if not results:
        raise HTTPException(status_code=404, detail="No NGOs with location data found.")
    return results


# ─── 3. Expiry Risk — ML Model ────────────────────────────────────────────────

@router.get("/expiry-risk/{donation_id}", response_model=schemas.ExpiryRiskOut)
def get_expiry_risk(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    return expiry_risk(
        expires_at   = donation.expires_at,
        food_type    = donation.food_type.value,
        prepared_at  = donation.prepared_at,
        quantity_kg  = float(donation.quantity_kg),
    )


# ─── 4. Direct Spoilage Prediction (raw input) ───────────────────────────────

@router.post("/predict-spoilage", response_model=schemas.ExpiryRiskOut)
def predict_spoilage(
    data: schemas.SpoilageInput,
    current_user: models.User = Depends(get_current_user)
):
    if data.food_type not in ["cooked", "raw", "packaged"]:
        raise HTTPException(status_code=400, detail="food_type must be cooked, raw, or packaged")

    return expiry_risk(
        expires_at  = data.expires_at,
        food_type   = data.food_type,
        prepared_at = data.prepared_at,
        quantity_kg = data.quantity_kg,
    )


# ─── 5. Smart Redistribution Engine ──────────────────────────────────────────

@router.get("/smart-engine/{donation_id}", response_model=schemas.EngineResult)
def smart_engine(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Master decision engine: combines distance + demand + expiry_risk + rating + urgency.
    Score = 0.30*dist + 0.25*demand + 0.20*safety + 0.15*rating + 0.10*urgency
    Returns best NGO, priority level, and factor breakdown for Gemini explanation.
    """
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    ngos   = db.query(models.User).filter(models.User.role == "ngo").all()
    logs   = db.query(models.DemandLog).all()
    result = smart_redistribution_engine(donation, ngos, logs)

    if not result["best_ngo"]:
        raise HTTPException(status_code=404, detail="No NGOs with location data found")
    return result


# ─── 6. NGO Claimed Food Intelligence ───────────────────────────────────────
# Runs ML spoilage risk on all claimed donations for this NGO,
# ranks them by urgency, and returns structured data for Gemini explanation.

@router.get("/claimed-analysis")
def claimed_analysis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role.value != "ngo":
        raise HTTPException(status_code=403, detail="NGO access only")

    # Get all active claimed/assigned donations for this NGO
    claimed_ids = db.query(models.Claim.donation_id).filter(
        models.Claim.ngo_id == current_user.id
    ).subquery()

    donations = db.query(models.Donation).filter(
        models.Donation.id.in_(claimed_ids),
        models.Donation.status.in_(["claimed", "assigned"])
    ).all()

    results = []
    for d in donations:
        risk = expiry_risk(
            expires_at  = d.expires_at,
            food_type   = d.food_type.value,
            prepared_at = d.prepared_at,
            quantity_kg = float(d.quantity_kg),
        )
        results.append({
            "donation_id":   d.id,
            "food_name":     d.food_name,
            "food_type":     d.food_type.value,
            "quantity_kg":   float(d.quantity_kg),
            "serves_people": d.serves_people,
            "address":       d.address,
            "status":        d.status.value,
            "expires_at":    d.expires_at.isoformat(),
            "prepared_at":   d.prepared_at.isoformat(),
            "risk":          risk["risk"],
            "risk_score":    risk["risk_score"],
            "hours_left":    risk["hours_left"],
            "confidence":    risk["confidence"],
            "model_used":    risk["model_used"],
        })

    # Sort by risk_score descending (most urgent first)
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    for i, r in enumerate(results):
        r["priority_rank"] = i + 1

    return {"items": results, "total": len(results)}


# ─── 6. Multi-Stop Route Optimizer ───────────────────────────────────────────

@router.post("/multi-stop-route", response_model=schemas.MultiStopRouteOut)
def optimize_route(
    data: schemas.MultiStopRouteIn,
    current_user: models.User = Depends(get_current_user)
):
    """
    Nearest-neighbor TSP: orders multiple pickup + delivery stops
    to minimize total volunteer travel distance.
    """
    if len(data.stops) < 2:
        raise HTTPException(status_code=400, detail="At least 2 stops required")

    stops_dicts = [s.model_dump() for s in data.stops]
    return multi_stop_route(stops_dicts)
