"""
seed_demo.py — FoodShare Demo Data Seeder
==========================================
Seeds realistic Nagercoil & Kanyakumari district data:
  - 4 Donors  (restaurants, wedding halls, households)
  - 5 NGOs    (real local charity names + coordinates)
  - 3 Volunteers
  - 15 Donations (mix of statuses, food types, locations)
  - Claims, VolunteerTasks, DemandLogs, Notifications

Run:  python seed_demo.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models import (
    User, UserRole, Donation, FoodType, DonationStatus,
    Claim, VolunteerTask, VolunteerTaskStatus,
    Notification, DemandLog
)
from auth import hash_password
from datetime import datetime, timezone, timedelta

Base.metadata.create_all(bind=engine)
db = SessionLocal()

def utc(offset_hours=0):
    return datetime.now(timezone.utc) + timedelta(hours=offset_hours)

def naive(offset_hours=0):
    """MySQL stores naive datetimes — strip tzinfo before inserting."""
    return (datetime.now(timezone.utc) + timedelta(hours=offset_hours)).replace(tzinfo=None)

# ── Clear existing demo data (safe re-run) ────────────────────────────────────
print("Clearing old demo data...")
db.query(Notification).delete()
db.query(VolunteerTask).delete()
db.query(Claim).delete()
db.query(DemandLog).delete()
db.query(Donation).delete()
db.query(User).filter(User.email.like("%@demo.foodshare%")).delete()
db.commit()

# ── 1. Donors ─────────────────────────────────────────────────────────────────
print("Creating donors...")
donors = [
    User(
        name="Hotel Saravana Bhavan",
        email="saravana@demo.foodshare",
        passwoard_hash=hash_password("Demo@1234"),
        role=UserRole.donor,
        whatsapp_number="9876543210",
        address="Nagercoil Main Road, Nagercoil - 629001",
        lat=8.1780, lng=77.4320,
        verified=True, rating=4.8,
    ),
    User(
        name="Sri Murugan Catering",
        email="murugan@demo.foodshare",
        password_hash=hash_password("Demo@1234"),
        role=UserRole.donor,
        whatsapp_number="9876543211",
        address="Kottar, Nagercoil - 629002",
        lat=8.1650, lng=77.4280,
        verified=True, rating=4.6,
    ),
    User(
        name="Kanyakumari Wedding Hall",
        email="wedding@demo.foodshare",
        password_hash=hash_password("Demo@1234"),
        role=UserRole.donor,
        whatsapp_number="9876543212",
        address="Beach Road, Kanyakumari - 629702",
        lat=8.0883, lng=77.5385,
        verified=True, rating=4.9,
    ),
    User(
        name="Padmavathi Mess",
        email="padmavathi@demo.foodshare",
        password_hash=hash_password("Demo@1234"),
        role=UserRole.donor,
        whatsapp_number="9876543213",
        address="Thuckalay, Kanyakumari District - 629175",
        lat=8.2450, lng=77.3120,
        verified=True, rating=4.5,
    ),
]
for d in donors:
    db.add(d)
db.flush()

# ── 2. NGOs ───────────────────────────────────────────────────────────────────
print("Creating NGOs...")
ngos = [
    User(
        name="Sneha Bhavan Trust",
        email="sneha@demo.foodshare",
        password_hash=hash_password("Demo@1234"),
        role=UserRole.ngo,
        whatsapp_number="9876500001",
        address="Nagercoil Town, Kanyakumari District - 629001",
        lat=8.1790, lng=77.4290,
        verified=True, rating=4.9,
    ),
    User(
        name="Kanyakumari Food Bank",
        email="suchindram@demo.foodshare",
        password_hash=hash_password("Demo@1234"),
        role=UserRole.ngo,
        whatsapp_number="9876500002",
        address="Kanyakumari Town - 629702",
        lat=8.0900, lng=77.5400,
        verified=True, rating=4.7,
    ),
    User(
        name="Suchindram Seva Sangam",
        email="suchindram@demo.foodshare",
        password_hash=hash_password("Demo@1234"),
        role=UserRole.ngo,
        whatsapp_number="9876500003",
        address="Suchindram, Kanyakumari District - 629704",
        lat=8.1560, lng=77.4670,
        verified=True, rating=4.8,
    ),
    User(
        name="Marthandam Community Kitchen",
        email="marthandam@demo.foodshare",
        password_hash=hash_password("Demo@1234"),
        role=UserRole.ngo,
        whatsapp_number="9876500004",
        address="Marthandam, Kanyakumari District - 629165",
        lat=8.3080, lng=77.2340,
        verified=True, rating=4.6,
    ),
    User(
        name="Colachel Relief Centre",
        email="colachel@demo.foodshare",
        password_hash=hash_password("Demo@1234"),
        role=UserRole.ngo,
        whatsapp_number="9876500005",
        address="Colachel, Kanyakumari District - 629251",
        lat=8.1740, lng=77.2560,
        verified=True, rating=4.5,
    ),
]
for n in ngos:
    db.add(n)
db.flush()

# ── 3. Volunteers ─────────────────────────────────────────────────────────────
print("Creating volunteers...")
volunteers = [
    User(
        name="Arjun Selvam",
        email="arjun@demo.foodshare",
        password_hash=hash_password("Demo@1234"),
        role=UserRole.volunteer,
        whatsapp_number="9876600001",
        address="Nagercoil - 629001",
        lat=8.1810, lng=77.4310,
        verified=True, rating=4.9,
    ),
    User(
        name="Priya Kumari",
        email="priya@demo.foodshare",
        password_hash=hash_password("Demo@1234"),
        role=UserRole.volunteer,
        whatsapp_number="9876600002",
        address="Kottar, Nagercoil - 629002",
        lat=8.1660, lng=77.4270,
        verified=True, rating=4.7,
    ),
    User(
        name="Rajan Pillai",
        email="rajan@demo.foodshare",
        password_hash=hash_password("Demo@1234"),
        role=UserRole.volunteer,
        whatsapp_number="9876600003",
        address="Kanyakumari - 629702",
        lat=8.0870, lng=77.5370,
        verified=True, rating=4.8,
    ),
]
for v in volunteers:
    db.add(v)
db.flush()

# ── 4. Donations ──────────────────────────────────────────────────────────────
print("Creating donations...")

DONATIONS_DATA = [
    # (donor_idx, food_name, food_type, qty, serves, address, lat, lng, prepared_offset, expires_offset, status)
    (0, "Sambar Rice & Papad",       "cooked",   8.0,  40, "Hotel Saravana Bhavan, Main Road, Nagercoil",       8.1780, 77.4320, -1,  3,  "completed"),
    (0, "Idli & Chutney",            "cooked",   5.0,  30, "Hotel Saravana Bhavan, Main Road, Nagercoil",       8.1780, 77.4320, -2,  2,  "completed"),
    (1, "Biryani (Veg)",             "cooked",  12.0,  60, "Sri Murugan Catering, Kottar, Nagercoil",           8.1650, 77.4280, -1,  4,  "assigned"),
    (1, "Chapati & Dal",             "cooked",   6.0,  35, "Sri Murugan Catering, Kottar, Nagercoil",           8.1650, 77.4280, -3,  1,  "claimed"),
    (2, "Wedding Feast Surplus",     "cooked",  25.0, 120, "Kanyakumari Wedding Hall, Beach Road",              8.0883, 77.5385, -2,  6,  "completed"),
    (2, "Sweets & Snacks",           "packaged", 4.0,  50, "Kanyakumari Wedding Hall, Beach Road",              8.0883, 77.5385, -1,  8,  "posted"),
    (2, "Pongal & Sambar",           "cooked",  10.0,  55, "Kanyakumari Wedding Hall, Beach Road",              8.0883, 77.5385, -1,  5,  "posted"),
    (3, "Rice & Rasam",              "cooked",   7.0,  40, "Padmavathi Mess, Thuckalay",                        8.2450, 77.3120, -2,  3,  "completed"),
    (3, "Fresh Vegetables Bundle",   "raw",      9.0,  45, "Padmavathi Mess, Thuckalay",                        8.2450, 77.3120, -1, 24,  "posted"),
    (0, "Dosa & Coconut Chutney",    "cooked",   6.0,  35, "Hotel Saravana Bhavan, Main Road, Nagercoil",       8.1780, 77.4320, -1,  4,  "posted"),
    (0, "Packaged Biscuits & Juice", "packaged", 3.0,  60, "Hotel Saravana Bhavan, Main Road, Nagercoil",       8.1780, 77.4320, -2, 48,  "posted"),
    (1, "Poori & Kurma",             "cooked",   8.0,  45, "Sri Murugan Catering, Kottar, Nagercoil",           8.1650, 77.4280, -1,  3,  "claimed"),
    (2, "Temple Prasad (Pongal)",    "cooked",  15.0,  80, "Nagaraja Temple, Nagercoil",                        8.1760, 77.4350, -1,  2,  "posted"),
    (3, "Raw Rice & Lentils",        "raw",     20.0, 100, "Padmavathi Mess, Thuckalay",                        8.2450, 77.3120, -3, 72,  "posted"),
    (1, "Curd Rice & Pickle",        "cooked",   5.0,  28, "Sri Murugan Catering, Kottar, Nagercoil",           8.1650, 77.4280, -4, -1,  "expired"),
]

donations = []
for (di, fname, ftype, qty, serves, addr, lat, lng, prep_off, exp_off, status) in DONATIONS_DATA:
    d = Donation(
        donor_id=donors[di].id,
        food_name=fname,
        food_type=FoodType(ftype),
        quantity_kg=qty,
        serves_people=serves,
        address=addr,
        lat=lat, lng=lng,
        prepared_at=naive(prep_off),
        expires_at=naive(exp_off),
        status=DonationStatus(status),
    )
    db.add(d)
    donations.append(d)
db.flush()

# ── 5. Claims ─────────────────────────────────────────────────────────────────
print("Creating claims...")
CLAIM_MAP = [
    (0, 0),   # donation[0] claimed by NGO[0] (Sneha Bhavan)
    (1, 0),   # donation[1] claimed by NGO[0]
    (2, 1),   # donation[2] claimed by NGO[1] (KK Food Bank)
    (3, 2),   # donation[3] claimed by NGO[2] (Suchindram)
    (4, 1),   # donation[4] claimed by NGO[1]
    (7, 3),   # donation[7] claimed by NGO[3] (Marthandam)
    (11, 0),  # donation[11] claimed by NGO[0]
]
claims = []
for (don_idx, ngo_idx) in CLAIM_MAP:
    c = Claim(donation_id=donations[don_idx].id, ngo_id=ngos[ngo_idx].id)
    db.add(c)
    claims.append(c)
db.flush()

# ── 6. Volunteer Tasks ────────────────────────────────────────────────────────
print("Creating volunteer tasks...")
TASK_MAP = [
    (0, 0, "delivered"),   # donation[0] → volunteer[0]
    (1, 1, "delivered"),   # donation[1] → volunteer[1]
    (2, 0, "assigned"),    # donation[2] → volunteer[0]
    (4, 2, "delivered"),   # donation[4] → volunteer[2]
    (7, 1, "delivered"),   # donation[7] → volunteer[1]
]
for (don_idx, vol_idx, vstatus) in TASK_MAP:
    t = VolunteerTask(
        donation_id=donations[don_idx].id,
        volunteer_id=volunteers[vol_idx].id,
        status=VolunteerTaskStatus(vstatus),
        estimated_arrival=naive(1),
    )
    db.add(t)
db.flush()

# ── 7. Demand Logs (for ML heatmap) ──────────────────────────────────────────
print("Creating demand logs...")
DEMAND_POINTS = [
    # (lat, lng, claim_count) — spread across the district
    (8.1790, 77.4290, 8),   # Nagercoil town — high demand
    (8.1650, 77.4280, 6),   # Kottar
    (8.0900, 77.5400, 5),   # Kanyakumari
    (8.1560, 77.4670, 4),   # Suchindram
    (8.3080, 77.2340, 3),   # Marthandam
    (8.1740, 77.2560, 2),   # Colachel
    (8.2450, 77.3120, 3),   # Thuckalay
    (8.1800, 77.4300, 7),   # Nagercoil central
    (8.0870, 77.5370, 4),   # KK beach area
    (8.1760, 77.4350, 5),   # Near Nagaraja Temple
    (8.2100, 77.3800, 2),   # Eraniel
    (8.1500, 77.4800, 3),   # Aralvaimozhi
]
for (lat, lng, count) in DEMAND_POINTS:
    db.add(DemandLog(lat=lat, lng=lng, claim_count=count))
db.flush()

# ── 8. Notifications ──────────────────────────────────────────────────────────
print("Creating notifications...")
notifs = [
    Notification(user_id=ngos[0].id,  message="🍱 New donation: Sambar Rice (8kg) posted by Hotel Saravana Bhavan! Match score: 0.87 | 0.3km away", is_read=False),
    Notification(user_id=ngos[1].id,  message="🍱 New donation: Wedding Feast Surplus (25kg, serves 120) posted! Match score: 0.91 | 1.2km away", is_read=False),
    Notification(user_id=ngos[2].id,  message="⚠️ Expiry risk: HIGH — Chapati & Dal expires in 1h. Claim now!", is_read=False),
    Notification(user_id=donors[0].id, message="✅ Your donation 'Sambar Rice' has been claimed by Sneha Bhavan Trust!", is_read=True),
    Notification(user_id=donors[2].id, message="✅ Your donation 'Wedding Feast Surplus' has been successfully delivered!", is_read=True),
    Notification(user_id=volunteers[0].id, message="🚴 You have been assigned to pick up 'Biryani (Veg)' from Sri Murugan Catering, Kottar", is_read=False),
    Notification(user_id=volunteers[1].id, message="🎉 Delivery of 'Idli & Chutney' completed! Great work!", is_read=True),
    Notification(user_id=ngos[0].id,  message="🍱 New donation: Temple Prasad (Pongal, 15kg) posted near Nagaraja Temple! 0.4km away", is_read=False),
]
for n in notifs:
    db.add(n)

db.commit()
db.close()

print("\n" + "="*60)
print("DEMO SEED COMPLETE -- Nagercoil & Kanyakumari District")
print("="*60)
print("\nDEMO LOGIN CREDENTIALS:")
print("-"*40)
print("DONOR 1   : saravana@demo.foodshare  / Demo@1234")
print("DONOR 2   : murugan@demo.foodshare   / Demo@1234")
print("DONOR 3   : wedding@demo.foodshare   / Demo@1234")
print("NGO 1     : sneha@demo.foodshare     / Demo@1234  (Sneha Bhavan Trust)")
print("NGO 2     : kkfoodbank@demo.foodshare/ Demo@1234  (KK Food Bank)")
print("NGO 3     : suchindram@demo.foodshare/ Demo@1234  (Suchindram Seva Sangam)")
print("VOLUNTEER : arjun@demo.foodshare     / Demo@1234")
print("-"*40)
print("All locations are in Nagercoil / Kanyakumari district")
print("Map center: 8.1833, 77.4119 (Nagercoil)")
print("="*60 + "\n")
