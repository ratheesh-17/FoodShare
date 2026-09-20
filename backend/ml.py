"""
ML Engine for Food Redistribution
─────────────────────────────────
1. compute_demand_score(lat, lng, logs)        → demand level 0.0–1.0 for an area
2. smart_ngo_match(lat, lng, ngos, logs)       → NGOs ranked by composite score 0.0–1.0
3. expiry_risk(expires_at, food_type, ...)     → spoilage risk via trained GradientBoosting model
                                                  (94.56% accuracy, USDA-based synthetic dataset)
4. smart_redistribution_engine(donation, ...) → best NGO + priority + full decision explanation
5. multi_stop_route(stops)                    → optimal ordered route via nearest-neighbor TSP
"""

import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from utils import haversine

# ─── Load trained spoilage model ─────────────────────────────────────────────
_MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

_spoilage_model   = None
_spoilage_scaler  = None
_spoilage_features = None

def _load_model():
    global _spoilage_model, _spoilage_scaler, _spoilage_features
    if _spoilage_model is not None:
        return True
    try:
        _spoilage_model    = joblib.load(os.path.join(_MODEL_DIR, "spoilage_model.pkl"))
        _spoilage_scaler   = joblib.load(os.path.join(_MODEL_DIR, "spoilage_scaler.pkl"))
        _spoilage_features = joblib.load(os.path.join(_MODEL_DIR, "spoilage_features.pkl"))
        return True
    except FileNotFoundError:
        return False


# ─── 1. Demand Prediction ─────────────────────────────────────────────────────

def _area_key(lat: float, lng: float) -> str:
    return f"{round(lat, 1)}_{round(lng, 1)}"


def compute_demand_score(lat: float, lng: float, demand_logs: list) -> float:
    if not demand_logs:
        return 0.5

    key = _area_key(lat, lng)
    area_counts = {}
    for log in demand_logs:
        k = _area_key(float(log.lat), float(log.lng))
        area_counts[k] = area_counts.get(k, 0) + log.claim_count

    max_count = max(area_counts.values(), default=0)
    if max_count == 0:
        return 0.5

    score = area_counts.get(key, 0) / max_count
    return round(float(score), 3)


# ─── 2. Smart NGO Matching ────────────────────────────────────────────────────

def smart_ngo_match(donation_lat: float, donation_lng: float,
                    ngos: list, demand_logs: list) -> list:
    results = []
    for ngo in ngos:
        if ngo.lat is None or ngo.lng is None:
            continue

        dist       = haversine(donation_lat, donation_lng, float(ngo.lat), float(ngo.lng))
        dist_score = 1 / (1 + dist)
        demand     = compute_demand_score(float(ngo.lat), float(ngo.lng), demand_logs)
        rating     = float(ngo.rating) / 5.0 if ngo.rating else 0.5
        match_score = (0.4 * dist_score) + (0.35 * demand) + (0.25 * rating)

        results.append({
            "ngo_id":       ngo.id,
            "ngo_name":     ngo.name,
            "distance_km":  round(dist, 2),
            "demand_score": demand,
            "rating":       float(ngo.rating) if ngo.rating else 5.0,
            "match_score":  round(match_score, 4),
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results


# ─── 4. Smart Redistribution Engine ──────────────────────────────────────────
# Combines distance + demand + expiry_risk + NGO rating + urgency into one
# unified decision. Returns best NGO, priority level, and factor breakdown.

def smart_redistribution_engine(donation, ngos: list, demand_logs: list) -> dict:
    """
    Master decision engine.
    Score = 0.30*dist_score + 0.25*demand + 0.20*(1-risk_score) + 0.15*rating + 0.10*urgency
    """
    risk = expiry_risk(
        expires_at  = donation.expires_at,
        food_type   = donation.food_type.value if hasattr(donation.food_type, "value") else donation.food_type,
        prepared_at = donation.prepared_at,
        quantity_kg = float(donation.quantity_kg),
    )

    # Urgency: 1.0 if < 2h left, 0.5 if < 6h, 0.0 otherwise
    hours_left = risk["hours_left"]
    urgency    = 1.0 if hours_left < 2 else 0.5 if hours_left < 6 else 0.0
    priority   = "CRITICAL" if hours_left < 2 else "HIGH" if hours_left < 6 else "NORMAL"

    candidates = []
    for ngo in ngos:
        if ngo.lat is None or ngo.lng is None:
            continue

        dist       = haversine(float(donation.lat), float(donation.lng), float(ngo.lat), float(ngo.lng))
        dist_score = 1 / (1 + dist)
        demand     = compute_demand_score(float(ngo.lat), float(ngo.lng), demand_logs)
        rating     = float(ngo.rating) / 5.0 if ngo.rating else 0.5
        risk_score = risk["risk_score"]

        final_score = (
            0.30 * dist_score +
            0.25 * demand +
            0.20 * (1 - risk_score) +   # lower risk = better window to deliver
            0.15 * rating +
            0.10 * urgency
        )

        candidates.append({
            "ngo_id":       ngo.id,
            "ngo_name":     ngo.name,
            "distance_km":  round(dist, 2),
            "demand_score": round(demand, 3),
            "rating":       float(ngo.rating) if ngo.rating else 5.0,
            "risk_score":   round(risk_score, 3),
            "urgency":      round(urgency, 2),
            "final_score":  round(final_score, 4),
            # factor breakdown for explainability
            "factors": {
                "distance_contribution": round(0.30 * dist_score, 4),
                "demand_contribution":   round(0.25 * demand, 4),
                "safety_contribution":   round(0.20 * (1 - risk_score), 4),
                "rating_contribution":   round(0.15 * rating, 4),
                "urgency_contribution":  round(0.10 * urgency, 4),
            },
        })

    candidates.sort(key=lambda x: x["final_score"], reverse=True)
    best = candidates[0] if candidates else None

    return {
        "best_ngo":       best,
        "all_candidates": candidates[:5],
        "priority":       priority,
        "hours_left":     round(hours_left, 2),
        "risk":           risk["risk"],
        "risk_score":     risk["risk_score"],
        "model_used":     risk["model_used"],
        "food_name":      donation.food_name,
        "food_type":      donation.food_type.value if hasattr(donation.food_type, "value") else donation.food_type,
        "quantity_kg":    float(donation.quantity_kg),
        "serves_people":  donation.serves_people,
        "donation_address": donation.address,
    }


# ─── 5. Multi-Stop Route Optimizer ───────────────────────────────────────────
# Nearest-neighbor TSP heuristic — orders stops to minimize total travel distance.
# Input: list of {id, label, lat, lng, type ("pickup"|"delivery")}
# Output: ordered stops + total_km

def multi_stop_route(stops: list) -> dict:
    """
    Greedy nearest-neighbor TSP for volunteer multi-stop routing.
    Start is always first. Delivery stops are always pinned last.
    TSP only reorders pickup stops in between.
    """
    if not stops:
        return {"ordered_stops": [], "total_km": 0.0, "stop_count": 0}

    start     = dict(stops[0])
    pickups   = [dict(s) for s in stops if s["type"] == "pickup"]
    deliveries = [dict(s) for s in stops if s["type"] == "delivery"]

    # TSP nearest-neighbor on pickups only
    ordered   = [start]
    remaining = pickups[:]
    total_km  = 0.0

    while remaining:
        last    = ordered[-1]
        nearest = min(remaining, key=lambda s: haversine(last["lat"], last["lng"], s["lat"], s["lng"]))
        dist    = haversine(last["lat"], last["lng"], nearest["lat"], nearest["lng"])
        total_km += dist
        nearest["leg_km"] = round(dist, 2)
        ordered.append(nearest)
        remaining.remove(nearest)

    # Always append delivery stop(s) at the end
    for d in deliveries:
        last = ordered[-1]
        dist = haversine(last["lat"], last["lng"], d["lat"], d["lng"])
        total_km += dist
        d["leg_km"] = round(dist, 2)
        ordered.append(d)

    # Tag cumulative distance
    cumulative = 0.0
    for stop in ordered:
        cumulative += stop.get("leg_km", 0.0)
        stop["cumulative_km"] = round(cumulative, 2)

    return {
        "ordered_stops": ordered,
        "total_km":      round(total_km, 2),
        "stop_count":    len(ordered),
    }


# ─── 3. Spoilage Risk — Trained GradientBoosting Model ───────────────────────

FOOD_TYPE_ENCODE = {"cooked": 2, "raw": 1, "packaged": 0, "event": 2}

LABEL_MAP = {0: "safe", 1: "at_risk", 2: "critical"}
LABEL_DISPLAY = {
    "safe":     {"risk": "low",    "color": "#10b981", "icon": "✅"},
    "at_risk":  {"risk": "medium", "color": "#f59e0b", "icon": "⚠️"},
    "critical": {"risk": "high",   "color": "#ef4444", "icon": "🔴"},
}

# Fallback rule-based (used only if model file missing)
_FOOD_TYPE_RISK_FALLBACK = {"cooked": 1.0, "raw": 0.7, "packaged": 0.3}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _get_season() -> int:
    month = _now_utc().month
    if month in [12, 1, 2]:  return 0  # winter
    if month in [3, 4, 5]:   return 1  # spring
    if month in [6, 7, 8]:   return 2  # summer
    return 3                            # autumn


def _is_peak_hour() -> int:
    hour = _now_utc().hour
    return 1 if (12 <= hour <= 15) or (19 <= hour <= 22) else 0


def expiry_risk(expires_at: datetime, food_type: str,
                prepared_at: datetime = None,
                quantity_kg: float = 5.0) -> dict:
    """
    Predicts food spoilage risk using trained GradientBoosting model.
    Falls back to rule-based if model not loaded.

    Returns:
        risk         : "low" / "medium" / "high" / "expired"
        risk_score   : 0.0 – 1.0
        hours_left   : float
        model_label  : "safe" / "at_risk" / "critical"
        confidence   : model confidence % (0–100)
        model_used   : True if ML model was used, False if fallback
    """
    now = _now_utc()
    # Ensure expires_at and prepared_at are timezone-aware
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    hours_left = (expires_at - now).total_seconds() / 3600

    if hours_left <= 0:
        return {
            "risk": "expired", "risk_score": 1.0, "hours_left": 0.0,
            "model_label": "critical", "confidence": 100.0, "model_used": False,
        }

    # Hours since prepared (default: assume prepared 2h ago if not given)
    if prepared_at:
        if prepared_at.tzinfo is None:
            prepared_at = prepared_at.replace(tzinfo=timezone.utc)
        hours_since = max(0.1, (now - prepared_at).total_seconds() / 3600)
    else:
        hours_since = 2.0

    model_loaded = _load_model()

    if model_loaded:
        # Build feature vector matching training columns
        ft_encoded = FOOD_TYPE_ENCODE.get(food_type, 2)
        features = pd.DataFrame([[
            ft_encoded,
            hours_since,
            hours_left,
            float(quantity_kg),
            _get_season(),
            _is_peak_hour(),
        ]], columns=_spoilage_features)

        features_scaled = _spoilage_scaler.transform(features)
        pred_class      = int(_spoilage_model.predict(features_scaled)[0])
        proba           = _spoilage_model.predict_proba(features_scaled)[0]
        confidence      = round(float(proba[pred_class]) * 100, 1)

        model_label = LABEL_MAP[pred_class]
        risk_level  = LABEL_DISPLAY[model_label]["risk"]

        # Map class to 0-1 score: safe=0.15, at_risk=0.55, critical=0.90
        score_map   = {0: 0.15, 1: 0.55, 2: 0.90}
        risk_score  = round(score_map[pred_class] + (1 - proba[pred_class]) * 0.1, 3)

        return {
            "risk":        risk_level,
            "risk_score":  risk_score,
            "hours_left":  round(float(hours_left), 2),
            "model_label": model_label,
            "confidence":  confidence,
            "model_used":  True,
        }

    # ── Fallback: rule-based (model file not found) ──
    type_risk     = _FOOD_TYPE_RISK_FALLBACK.get(food_type, 0.5)
    time_pressure = max(0.0, 1.0 - (hours_left / 6.0))
    risk_score    = round((0.5 * time_pressure) + (0.5 * type_risk), 3)
    level         = "high" if risk_score >= 0.7 else "medium" if risk_score >= 0.4 else "low"

    return {
        "risk":        level,
        "risk_score":  risk_score,
        "hours_left":  round(float(hours_left), 2),
        "model_label": level,
        "confidence":  0.0,
        "model_used":  False,
    }
