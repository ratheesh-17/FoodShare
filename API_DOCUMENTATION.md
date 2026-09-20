# FoodShare API — Complete Endpoint Documentation

> **Base URL:** `http://localhost:8000`  
> **Interactive Docs:** `http://localhost:8000/docs`  
> **Project:** PS3 Food Redistribution — Nagercoil & Kanyakumari District  
> **Stack:** FastAPI + MySQL + JWT Auth

---

## Table of Contents

1. [Authentication & How It Works](#1-authentication--how-it-works)
2. [Role Overview](#2-role-overview)
3. [Public Endpoints — No Auth Required](#3-public-endpoints--no-auth-required)
4. [Donor Endpoints](#4-donor-endpoints)
5. [NGO Endpoints](#5-ngo-endpoints)
6. [Volunteer Endpoints](#6-volunteer-endpoints)
7. [Admin Endpoints](#7-admin-endpoints)
8. [ML Intelligence Endpoints](#8-ml-intelligence-endpoints)
9. [Shared Endpoints — All Roles](#9-shared-endpoints--all-roles)
10. [Upload Endpoint](#10-upload-endpoint)
11. [Full Integration Flow — Step by Step](#11-full-integration-flow--step-by-step)
12. [Donation Status Lifecycle](#12-donation-status-lifecycle)
13. [Background Tasks](#13-background-tasks)

---

## 1. Authentication & How It Works

All protected endpoints require a **JWT Bearer token** in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

**How tokens are issued:**
- Regular users (donor, ngo, volunteer) get a token on `/users/register` or `/users/login`
- Admin gets a token after completing the 2-step OTP flow

**Token payload contains:**
```json
{ "user_id": 1, "role": "donor", "exp": 1234567890 }
```

**Role enforcement** is done via `require_role("donor")` or `require_role("ngo", "admin")` dependency on each endpoint. Passing the wrong role returns `403 Forbidden`.

---

## 2. Role Overview

| Role | What They Do |
|---|---|
| `donor` | Post food donations, view their history, rate volunteers |
| `ngo` | Find nearby donations, claim them, assign volunteers |
| `volunteer` | Pick up and deliver claimed donations |
| `admin` | View platform metrics, all users, all donations |

---

## 3. Public Endpoints — No Auth Required

### `POST /users/register`
Register a new user (donor, ngo, or volunteer). Admin registration is blocked.

**Request body:**
```json
{
  "name": "Hotel Saravana Bhavan",
  "email": "saravana@example.com",
  "password": "Pass@1234",
  "role": "donor",
  "address": "Main Road, Nagercoil",
  "lat": 8.1780,
  "lng": 77.4320,
  "whatsapp_number": "9876543210"
}
```

**Response:** `{ access_token, token_type, user }`  
**Auto-login:** Returns a JWT token immediately — no separate login needed after registration.

---

### `POST /users/login`
Login for donor, ngo, and volunteer roles.

**Request body:**
```json
{ "email": "saravana@example.com", "password": "Pass@1234" }
```

**Response:** `{ access_token, token_type, user }`  
**Note:** Admin email is blocked here — redirects to `/users/admin-login`.

---

### `POST /users/admin-login`
**Step 1** of admin 2-factor login. Validates credentials and generates a 6-digit OTP.

**Request body:**
```json
{ "email": "ratheesh3921@gmail.com", "password": "Ratheesh@1703" }
```

**Response:** `{ otp_required: true, message: "OTP sent to console" }`  
**OTP:** Printed to the backend console. Valid for **5 minutes**.

---

### `POST /users/admin-verify-otp`
**Step 2** of admin login. Verifies the OTP and returns a JWT token.

**Request body:**
```json
{ "otp": "123456" }
```

**Response:** `{ access_token, token_type, user }`  
**Note:** OTP is single-use — cleared immediately after verification.

---

## 4. Donor Endpoints

> All require `Authorization: Bearer <token>` with role = `donor`

---

### `POST /donations/`
Post a new food donation. Triggers the Smart Engine automatically.

**Request body:**
```json
{
  "food_name": "Biryani",
  "food_type": "cooked",
  "quantity_kg": 10.0,
  "serves_people": 50,
  "address": "Hotel Saravana Bhavan, Main Road, Nagercoil",
  "lat": 8.1780,
  "lng": 77.4320,
  "prepared_at": "2024-01-15T18:00:00",
  "expires_at": "2024-01-15T22:00:00",
  "photo_url": "http://localhost:8000/uploads/abc123.jpg"
}
```

**What happens internally:**
1. Donation saved to DB with status `posted`
2. ML `expiry_risk()` calculates spoilage risk (GradientBoosting, 94.56% accuracy)
3. ML `smart_ngo_match()` ranks all NGOs by distance + demand + rating
4. Notifications sent to all NGOs — ranked NGOs get match score in message
5. Returns the created donation

**Food types:** `cooked` | `raw` | `packaged` | `event`

---

### `GET /donations/`
Get donations. **Role-aware:**
- Donor → returns only their own donations
- NGO / Admin → returns all donations

**Response:** Array of donation objects with status, location, expiry, etc.

---

### `GET /donations/{donation_id}`
Get a single donation by ID.  
**Auth:** Any logged-in role.

---

### `POST /donations/{donation_id}/rate-volunteer`
Rate the volunteer who delivered a completed donation (1.0 to 5.0 stars).

**Query param:** `?rating=4.5`

**Rules:**
- Only the donor of that specific donation can rate
- Donation must be in `completed` status
- Rating uses rolling average: `new = (old × 4 + rating) / 5`

**Response:** `{ message, new_rating }`

---

### `GET /donations/{donation_id}/lifecycle`
Get the full food journey timeline for a donation — who did each step and when.

**Response:**
```json
{
  "donation_id": 1,
  "food_name": "Biryani",
  "status": "completed",
  "serves_people": 50,
  "quantity_kg": 10.0,
  "co2_saved": 25.0,
  "timeline": [
    { "step": "posted",    "label": "Food Posted",          "who": "Hotel Saravana Bhavan", "when": "2024-01-15T18:00:00", "done": true },
    { "step": "claimed",   "label": "Claimed by NGO",       "who": "Sneha Bhavan Trust",    "when": "2024-01-15T18:15:00", "done": true },
    { "step": "assigned",  "label": "Volunteer Assigned",   "who": "Arjun Selvam",          "when": "2024-01-15T18:30:00", "done": true },
    { "step": "completed", "label": "Delivered to Community","who": "Arjun Selvam",          "when": null,                  "done": true }
  ]
}
```

**CO₂ formula:** `quantity_kg × 2.5` (WRAP UK standard: 1 kg food = 2.5 kg CO₂ avoided)

---

## 5. NGO Endpoints

> All require `Authorization: Bearer <token>` with role = `ngo`

---

### `GET /donations/nearby`
Get all active (posted, not expired) donations within a radius, sorted by distance.

**Query params:**
- `lat` — NGO's latitude (required)
- `lng` — NGO's longitude (required)
- `radius_km` — search radius, default `20`

**Example:** `GET /donations/nearby?lat=8.1790&lng=77.4290&radius_km=20`

**Response:** Array of donations with `distance_km` field added, sorted nearest first.  
**Default center:** Nagercoil `[8.1833, 77.4119]`

---

### `PATCH /donations/{donation_id}/claim`
Claim a donation. Changes status from `posted` → `claimed`.

**What happens internally:**
1. Donation status updated to `claimed`
2. Claim record created linking this NGO to the donation
3. NGO's location logged as a demand signal for ML heatmap
4. Donor notified: "Your donation has been claimed by [NGO name]"

**Error:** Returns `400` if donation is not in `posted` status.

---

### `PATCH /donations/{donation_id}/assign/{volunteer_id}`
Assign a volunteer to pick up a claimed donation. Changes status `claimed` → `assigned`.

**Path params:** `donation_id`, `volunteer_id`  
**Auth:** NGO or Admin

**What happens internally:**
1. Donation status updated to `assigned`
2. VolunteerTask record created
3. Volunteer notified: "You have been assigned to pick up [food] from [address]"

**Error:** Returns `400` if donation is not in `claimed` status.

---

### `GET /users/volunteers`
Get list of all registered volunteers (for the assign modal).

**Auth:** Any logged-in role.  
**Response:** Array of volunteer user objects with name, address, rating.

---

## 6. Volunteer Endpoints

> All require `Authorization: Bearer <token>` with role = `volunteer`

---

### `GET /volunteers/my-tasks`
Get all tasks assigned to the current volunteer.

**Response:** Array of VolunteerTask objects:
```json
[
  {
    "id": 1,
    "donation_id": 5,
    "volunteer_id": 3,
    "status": "assigned",
    "estimated_arrival": null,
    "pickup_photo_url": null,
    "assigned_at": "2024-01-15T18:30:00"
  }
]
```

**Task statuses:** `assigned` | `picked_up` | `delivered`

---

### `PATCH /donations/{donation_id}/complete`
Mark a delivery as complete. Changes donation status `assigned` → `completed`.

**Query param:** `?pickup_photo_url=http://...`  
**Auth:** Volunteer only — must be the assigned volunteer for that task.

**What happens internally:**
1. VolunteerTask status updated to `delivered`
2. Pickup photo URL saved to task
3. Donation status updated to `completed`
4. Donor notified: "Your donation was successfully delivered by [volunteer name]"

**Error:** Returns `403` if the volunteer is not assigned to this task.

---

### `GET /volunteers/notifications`
Get the last 20 notifications for the current user (works for all roles).

**Response:** Array of notification objects with message, is_read, created_at.

---

## 7. Admin Endpoints

> All require `Authorization: Bearer <token>` with role = `admin`  
> Exception: `/admin/leaderboard` is accessible to all roles.

---

### `GET /admin/metrics`
Get platform-wide statistics dashboard.

**Response:**
```json
{
  "total_donations": 150,
  "completed_donations": 98,
  "meals_saved": 4200,
  "kg_reduced": 840.5,
  "co2_saved": 2101.25,
  "active_ngos": 12,
  "active_pickups": 5,
  "top_donors": [
    { "name": "Hotel Saravana Bhavan", "donations": 15, "meals": 750 }
  ]
}
```

---

### `GET /admin/leaderboard`
Get full donor rankings. **Accessible to all logged-in roles.**

**Response:**
```json
{
  "rankings": [
    {
      "rank": 1,
      "id": 1,
      "name": "Hotel Saravana Bhavan",
      "email": "saravana@demo.foodshare",
      "role": "donor",
      "rating": 4.8,
      "donation_count": 15,
      "meals_saved": 750,
      "kg_saved": 150.0,
      "co2_saved": 375.0
    }
  ],
  "my_rank": { "rank": 3, "donation_count": 8, ... },
  "platform_totals": {
    "total_meals": 4200,
    "total_kg": 840.5,
    "total_co2": 2101.25,
    "total_donations": 98,
    "total_users": 25
  }
}
```

---

### `GET /admin/all-donations`
Get all donations across the platform, newest first.

**Response:** Array of all DonationOut objects.

---

### `GET /admin/all-users`
Get all registered users across all roles.

**Response:** Array of all UserOut objects.

---

## 8. ML Intelligence Endpoints

> All require `Authorization: Bearer <token>` (any role)

---

### `GET /ml/model-info`
Get information about the loaded ML model.

**Response:**
```json
{
  "model": "Gradient Boosting Classifier",
  "accuracy": 94.56,
  "dataset_size": 8000,
  "features": ["food_type_encoded", "hours_since_prepared", "hours_until_expiry", "quantity_kg", "season", "is_peak_hour"],
  "model_loaded": true
}
```

---

### `GET /ml/demand`
Get the food demand score for a geographic area based on historical claim density.

**Query params:** `lat`, `lng`

**Response:**
```json
{ "lat": 8.179, "lng": 77.429, "demand_score": 0.85, "label": "high" }
```

**Labels:** `low` (< 0.4) | `medium` (0.4–0.7) | `high` (≥ 0.7)

---

### `GET /ml/expiry-risk/{donation_id}`
Predict spoilage risk for a specific donation using the trained GradientBoosting model.

**Response:**
```json
{
  "risk": "medium",
  "risk_score": 0.55,
  "hours_left": 3.5,
  "model_label": "at_risk",
  "confidence": 87.3,
  "model_used": true
}
```

**Risk levels:** `low` | `medium` | `high` | `expired`  
**Fallback:** If `.pkl` files are missing, uses rule-based scoring (`model_used: false`)

---

### `POST /ml/predict-spoilage`
Direct spoilage prediction without needing a donation in the DB. Useful for pre-checking before posting.

**Request body:**
```json
{
  "food_type": "cooked",
  "prepared_at": "2024-01-15T18:00:00",
  "expires_at": "2024-01-15T22:00:00",
  "quantity_kg": 10.0
}
```

**Response:** Same as `/ml/expiry-risk/{id}`

---

### `GET /ml/match-ngo/{donation_id}`
Rank all NGOs for a donation using distance + demand + rating scoring.

**Response:** Array of NGO matches sorted by match_score descending:
```json
[
  {
    "ngo_id": 2,
    "ngo_name": "Sneha Bhavan Trust",
    "distance_km": 0.3,
    "demand_score": 0.85,
    "rating": 4.9,
    "match_score": 0.8712
  }
]
```

**Formula:** `0.4 × distance_score + 0.35 × demand + 0.25 × rating`

---

### `GET /ml/smart-engine/{donation_id}`
**Master decision engine.** Combines all factors into one unified score with full explainability.

**Response:**
```json
{
  "best_ngo": {
    "ngo_id": 2,
    "ngo_name": "Sneha Bhavan Trust",
    "distance_km": 0.3,
    "demand_score": 0.85,
    "rating": 4.9,
    "risk_score": 0.55,
    "urgency": 0.5,
    "final_score": 0.7845,
    "factors": {
      "distance_contribution": 0.2941,
      "demand_contribution": 0.2125,
      "safety_contribution": 0.09,
      "rating_contribution": 0.1470,
      "urgency_contribution": 0.05
    }
  },
  "all_candidates": [...],
  "priority": "HIGH",
  "hours_left": 3.5,
  "risk": "medium",
  "risk_score": 0.55,
  "model_used": true,
  "food_name": "Biryani",
  "food_type": "cooked",
  "quantity_kg": 10.0,
  "serves_people": 50,
  "donation_address": "Hotel Saravana Bhavan, Nagercoil"
}
```

**Score formula:** `0.30 × distance + 0.25 × demand + 0.20 × safety + 0.15 × rating + 0.10 × urgency`  
**Priority levels:** `NORMAL` (> 6h left) | `HIGH` (2–6h) | `CRITICAL` (< 2h)

---

### `POST /ml/multi-stop-route`
Optimize a volunteer's multi-stop pickup and delivery route using the Nearest-Neighbor TSP algorithm.

**Request body:**
```json
{
  "stops": [
    { "id": "start", "label": "My Location", "lat": 8.181, "lng": 77.431, "type": "start" },
    { "id": "p1",    "label": "Hotel Saravana Bhavan", "lat": 8.178, "lng": 77.432, "type": "pickup" },
    { "id": "d1",    "label": "Sneha Bhavan Trust", "lat": 8.179, "lng": 77.429, "type": "delivery" }
  ]
}
```

**Response:**
```json
{
  "ordered_stops": [
    { "id": "start", "label": "My Location", "lat": 8.181, "lng": 77.431, "type": "start", "leg_km": 0.0, "cumulative_km": 0.0 },
    { "id": "p1",    "label": "Hotel Saravana Bhavan", "leg_km": 0.4, "cumulative_km": 0.4 },
    { "id": "d1",    "label": "Sneha Bhavan Trust",    "leg_km": 0.3, "cumulative_km": 0.7 }
  ],
  "total_km": 0.7,
  "stop_count": 3
}
```

**Algorithm:** Greedy nearest-neighbor — always picks the closest unvisited stop next.

---

## 9. Shared Endpoints — All Roles

These endpoints work for any authenticated user regardless of role.

| Endpoint | Description |
|---|---|
| `GET /users/profile` | Get current user's profile |
| `GET /users/volunteers` | List all volunteers |
| `GET /donations/{id}` | Get single donation |
| `GET /donations/` | Get donations (role-filtered) |
| `GET /donations/{id}/lifecycle` | Food journey timeline |
| `GET /donations/stream/notifications` | SSE real-time notification stream |
| `GET /volunteers/notifications` | Last 20 notifications |
| `GET /admin/leaderboard` | Public donor rankings |
| `GET /ml/model-info` | ML model status |
| `GET /ml/demand` | Area demand score |
| `GET /ml/expiry-risk/{id}` | Spoilage prediction |
| `GET /ml/match-ngo/{id}` | NGO ranking for donation |
| `GET /ml/smart-engine/{id}` | Full decision engine |
| `POST /ml/multi-stop-route` | Route optimizer |

---

## 10. Upload Endpoint

### `POST /upload/photo`
Upload a food photo. No auth required (called before donation is created).

**Request:** `multipart/form-data` with field `file`  
**Allowed types:** JPEG, PNG, WEBP, GIF  
**Response:** `{ "url": "http://localhost:8000/uploads/abc123.jpg" }`

Uploaded files are served as static files at `/uploads/<filename>`.

---

## 11. Full Integration Flow — Step by Step

This is the complete end-to-end journey of a food donation from post to delivery.

```
STEP 1 — DONOR posts food
─────────────────────────
POST /donations/
  │
  ├─ Donation saved (status: "posted")
  ├─ ML: expiry_risk() → calculates spoilage risk
  ├─ ML: smart_ngo_match() → ranks NGOs by distance + demand + rating
  └─ Notifications sent to all NGOs with match scores


STEP 2 — NGO finds and claims food
────────────────────────────────────
GET /donations/nearby?lat=8.179&lng=77.429&radius_km=20
  └─ Returns nearby posted donations sorted by distance

PATCH /donations/{id}/claim
  ├─ Status: "posted" → "claimed"
  ├─ Claim record created (links NGO to donation)
  ├─ NGO location logged as demand signal for ML heatmap
  └─ Donor notified: "Your donation was claimed"


STEP 3 — NGO assigns a volunteer
──────────────────────────────────
GET /users/volunteers
  └─ Returns list of available volunteers with ratings

PATCH /donations/{id}/assign/{volunteer_id}
  ├─ Status: "claimed" → "assigned"
  ├─ VolunteerTask record created
  └─ Volunteer notified: "You are assigned to pick up [food] from [address]"


STEP 4 — VOLUNTEER delivers food
──────────────────────────────────
GET /volunteers/my-tasks
  └─ Returns all tasks assigned to this volunteer

PATCH /donations/{id}/complete?pickup_photo_url=...
  ├─ Task status: "assigned" → "delivered"
  ├─ Donation status: "assigned" → "completed"
  └─ Donor notified: "Your donation was delivered by [volunteer]"


STEP 5 — DONOR rates the volunteer
────────────────────────────────────
POST /donations/{id}/rate-volunteer?rating=4.5
  └─ Volunteer rating updated (rolling average)


STEP 6 — View the full journey
────────────────────────────────
GET /donations/{id}/lifecycle
  └─ Returns timeline: Posted → Claimed → Assigned → Delivered
     with who, when, and CO₂ saved
```

---

## 12. Donation Status Lifecycle

```
posted ──► claimed ──► assigned ──► completed
   │
   └──► expired  (auto by background task if expires_at passes)
```

| Status | Meaning | Who Changes It |
|---|---|---|
| `posted` | Donation is live, waiting for NGO | Created by donor |
| `claimed` | NGO has reserved it | NGO via `/claim` |
| `assigned` | Volunteer assigned for pickup | NGO via `/assign` |
| `completed` | Food delivered to community | Volunteer via `/complete` |
| `expired` | Expired before being claimed | Background task (every 60s) |

---

## 13. Background Tasks

Two background tasks run every **60 seconds** automatically when the server starts:

### Task 1 — Auto-Expire
Finds all `posted` donations where `expires_at < now` and sets them to `expired`. Notifies the donor.

### Task 2 — Urgency Escalation
Finds all `posted` donations expiring within **2 hours**. Sends an URGENT alert to all NGOs (with 30-minute dedup to avoid spam).

```
[Auto-Expire]  Expired 3 donations
[Urgency]      Sent alerts for 2 expiring donations
```

---

## Quick Reference — Endpoint by Role

### Donor
```
POST   /users/register              Register
POST   /users/login                 Login
POST   /donations/                  Post a donation
GET    /donations/                  My donations
GET    /donations/{id}/lifecycle    Food journey + CO₂
POST   /donations/{id}/rate-volunteer  Rate volunteer
POST   /upload/photo                Upload food photo
```

### NGO
```
POST   /users/register              Register
POST   /users/login                 Login
GET    /donations/nearby            Find nearby food
PATCH  /donations/{id}/claim        Claim a donation
PATCH  /donations/{id}/assign/{vid} Assign volunteer
GET    /users/volunteers            List volunteers
GET    /ml/smart-engine/{id}        AI decision engine
GET    /ml/expiry-risk/{id}         Spoilage prediction
POST   /ml/multi-stop-route         Optimize route
```

### Volunteer
```
POST   /users/register              Register
POST   /users/login                 Login
GET    /volunteers/my-tasks         My assigned tasks
PATCH  /donations/{id}/complete     Mark delivered
GET    /volunteers/notifications    My notifications
```

### Admin
```
POST   /users/admin-login           Step 1: credentials
POST   /users/admin-verify-otp      Step 2: OTP
GET    /admin/metrics               Platform dashboard
GET    /admin/all-donations         All donations
GET    /admin/all-users             All users
```

### All Roles (Shared)
```
GET    /admin/leaderboard           Donor rankings
GET    /donations/stream/notifications  Real-time SSE
GET    /ml/demand                   Area demand score
GET    /ml/model-info               ML model status
```

---

*Generated for FoodShare — Nagercoil & Kanyakumari District Food Redistribution Platform*  
*Backend: FastAPI + MySQL | ML: GradientBoosting (94.56% accuracy) | Auth: JWT + bcrypt*
