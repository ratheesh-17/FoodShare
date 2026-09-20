from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    donor = "donor"
    ngo = "ngo"
    volunteer = "volunteer"
    admin = "admin"


class FoodType(str, Enum):
    cooked = "cooked"
    raw = "raw"
    packaged = "packaged"
    event = "event"


class DonationStatus(str, Enum):
    posted = "posted"
    claimed = "claimed"
    assigned = "assigned"
    completed = "completed"
    expired = "expired"


class VolunteerTaskStatus(str, Enum):
    assigned = "assigned"
    picked_up = "picked_up"
    delivered = "delivered"


# ─── User Schemas ──────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole
    whatsapp_number: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class AdminOTPVerify(BaseModel):
    otp: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    whatsapp_number: Optional[str]
    address: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    verified: bool
    rating: Optional[float]
    telegram_chat_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class ConnectTelegram(BaseModel):
    telegram_id: str
    first_name: str
    username: Optional[str] = None
    hash: str


# ─── Donation Schemas ──────────────────────────────────────────────────────────

class DonationCreate(BaseModel):
    food_name: str
    food_type: FoodType
    quantity_kg: float
    serves_people: int
    address: str
    lat: float
    lng: float
    prepared_at: datetime
    expires_at: datetime
    photo_url: Optional[str] = None


class DonationOut(BaseModel):
    id: int
    donor_id: int
    food_name: str
    food_type: FoodType
    quantity_kg: float
    serves_people: int
    photo_url: Optional[str]
    address: str
    lat: float
    lng: float
    prepared_at: datetime
    expires_at: datetime
    status: DonationStatus
    created_at: datetime
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True


# ─── Volunteer Task Schemas ────────────────────────────────────────────────────

class VolunteerTaskOut(BaseModel):
    id: int
    donation_id: int
    volunteer_id: int
    status: VolunteerTaskStatus
    estimated_arrival: Optional[datetime]
    pickup_photo_url: Optional[str]
    assigned_at: datetime
    # donation details for navigation
    donation_food_name: Optional[str] = None
    donation_address: Optional[str] = None
    donation_lat: Optional[float] = None
    donation_lng: Optional[float] = None
    ngo_name: Optional[str] = None
    ngo_address: Optional[str] = None
    ngo_lat: Optional[float] = None
    ngo_lng: Optional[float] = None

    class Config:
        from_attributes = True


# ─── Notification Schemas ──────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    user_id: int
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Admin Metrics Schema ──────────────────────────────────────────────────────

class MetricsOut(BaseModel):
    total_donations: int
    completed_donations: int
    meals_saved: int
    kg_reduced: float
    co2_saved: float
    active_ngos: int
    active_pickups: int
    top_donors: list


# ─── ML Schemas ───────────────────────────────────────────────────────────────

class NGOMatchResult(BaseModel):
    ngo_id: int
    ngo_name: str
    distance_km: float
    demand_score: float
    rating: float
    match_score: float


class ExpiryRiskOut(BaseModel):
    risk: str
    risk_score: float
    hours_left: float
    model_label: str
    confidence: float
    model_used: bool


class SpoilageInput(BaseModel):
    food_type: str          # cooked / raw / packaged
    prepared_at: datetime
    expires_at: datetime
    quantity_kg: float = 5.0


class DemandOut(BaseModel):
    lat: float
    lng: float
    demand_score: float
    label: str  # low / medium / high


# ─── Smart Redistribution Engine Schemas ──────────────────────────────────────────

class FactorBreakdown(BaseModel):
    distance_contribution: float
    demand_contribution:   float
    safety_contribution:   float
    rating_contribution:   float
    urgency_contribution:  float


class EngineCandidate(BaseModel):
    ngo_id:       int
    ngo_name:     str
    distance_km:  float
    demand_score: float
    rating:       float
    risk_score:   float
    urgency:      float
    final_score:  float
    factors:      FactorBreakdown


class EngineResult(BaseModel):
    best_ngo:         Optional[EngineCandidate]
    all_candidates:   list[EngineCandidate]
    priority:         str   # NORMAL / HIGH / CRITICAL
    hours_left:       float
    risk:             str
    risk_score:       float
    model_used:       bool
    food_name:        str
    food_type:        str
    quantity_kg:      float
    serves_people:    int
    donation_address: str


# ─── Multi-Stop Route Schemas ────────────────────────────────────────────────────

class RouteStop(BaseModel):
    id:             str
    label:          str
    lat:            float
    lng:            float
    type:           str   # "pickup" | "delivery" | "start"
    address:        Optional[str] = None
    leg_km:         Optional[float] = 0.0
    cumulative_km:  Optional[float] = 0.0


class MultiStopRouteIn(BaseModel):
    stops: list[RouteStop]


class MultiStopRouteOut(BaseModel):
    ordered_stops: list[RouteStop]
    total_km:      float
    stop_count:    int


# ─── Send Route to Volunteer Schema ──────────────────────────────────────────

class SendRouteIn(BaseModel):
    volunteer_id:   int
    ordered_stops:  list[RouteStop]
    total_km:       float
