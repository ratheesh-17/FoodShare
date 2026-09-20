# FoodShare — Frontend Pages Documentation

> **Project:** PS3 Food Redistribution — Nagercoil & Kanyakumari District  
> **Framework:** React.js  
> **Base URL:** `http://localhost:3000`

---

## Table of Contents

1. [Route Map — All Pages at a Glance](#1-route-map--all-pages-at-a-glance)
2. [Login Page — `/`](#2-login-page--)
3. [Admin Login Page — `/admin-login`](#3-admin-login-page--admin-login)
4. [Donor Pages — `/donor/*`](#4-donor-pages--donor)
   - [Post Donation — `/donor`](#41-post-donation--donor)
   - [My Map — `/donor/map`](#42-my-map--donormap)
   - [History — `/donor/history`](#43-history--donorhistory)
5. [NGO Pages — `/ngo/*`](#5-ngo-pages--ngo)
   - [Nearby Food — `/ngo`](#51-nearby-food--ngo)
   - [Claimed Donations — `/ngo/claimed`](#52-claimed-donations--ngoclaimed)
   - [Smart Engine — `/ngo/ai`](#53-smart-engine--ngoai)
   - [Route Planner — `/ngo/route`](#54-route-planner--ngoroute)
   - [Live Map — `/ngo/map`](#55-live-map--ngomap)
6. [Volunteer Pages — `/volunteer/*`](#6-volunteer-pages--volunteer)
   - [My Tasks — `/volunteer`](#61-my-tasks--volunteer)
   - [Route Map — `/volunteer/map`](#62-route-map--volunteermap)
7. [Admin Dashboard — `/dashboard/*`](#7-admin-dashboard--dashboard)
   - [Overview — `/dashboard`](#71-overview--dashboard)
   - [All Users — `/dashboard/users`](#72-all-users--dashboardusers)
   - [All Donations — `/dashboard/food`](#73-all-donations--dashboardfood)
   - [Heatmap — `/dashboard/map`](#74-heatmap--dashboardmap)
8. [Leaderboard — `/leaderboard`](#8-leaderboard--leaderboard)
9. [Global Components — Always Visible](#9-global-components--always-visible)
10. [How All Pages Connect — The Full User Journey](#10-how-all-pages-connect--the-full-user-journey)

---

## 1. Route Map — All Pages at a Glance

```
/                        → Login / Register (public)
/admin-login             → Admin 2-step OTP login (public)
/leaderboard             → Donor rankings (all logged-in roles)

/donor                   → Post Donation        [DONOR only]
/donor/map               → My Donations Map     [DONOR only]
/donor/history           → Donation History     [DONOR only]

/ngo                     → Nearby Food          [NGO only]
/ngo/claimed             → Claimed Donations    [NGO only]
/ngo/ai                  → Smart Engine         [NGO only]
/ngo/route               → Route Planner        [NGO only]
/ngo/map                 → Live Map             [NGO only]

/volunteer               → My Tasks             [VOLUNTEER only]
/volunteer/map           → Route Map            [VOLUNTEER only]

/dashboard               → Overview             [ADMIN only]
/dashboard/users         → All Users            [ADMIN only]
/dashboard/food          → All Donations        [ADMIN only]
/dashboard/map           → Demand Heatmap       [ADMIN only]
```

**Access control:** Every role-specific route is protected. If you are not logged in or have the wrong role, you are automatically redirected to `/`.

---

## 2. Login Page — `/`

**File:** `LoginPageNew.js`  
**Who uses it:** Everyone — first page any user sees  
**Access:** Public (no login required)

### What it does

This is the entry point of the entire application. It serves two purposes in one page — **Sign In** and **Create Account** — toggled by a tab switcher.

### Sign In mode

- User selects their role (Donor / NGO / Volunteer) using the 3-button role selector
- Enters email and password
- On submit, calls `POST /users/login`
- On success, stores the JWT token and user data in `localStorage`, then redirects:
  - Donor → `/donor`
  - NGO → `/ngo`
  - Volunteer → `/volunteer`
  - Admin email → automatically redirected to `/admin-login`

### Create Account mode

- User fills: Full Name, Role, Address (optional), WhatsApp (optional)
- GPS auto-detects location on page load — shows "✓ GPS location detected"
- If GPS is denied, defaults to Nagercoil coordinates `[8.1833, 77.4119]`
- "Pick Location on Map" opens an interactive Leaflet map centered on **Nagercoil** at zoom 12 — user clicks to pin their location
- Password + Confirm Password with match validation
- On submit, calls `POST /users/register`
- Auto-logs in after registration — no separate login step needed

### Left panel (branding)

Shows platform stats (12K+ meals, 340+ NGOs, 800+ volunteers, 98% success rate) and a list of ML features to explain what the platform does.

### Validation rules

- Sign In: only `email` and `password` are validated
- Register: `name`, `email`, `password`, `confirmPassword` are required; `address` and `whatsapp` are optional
- Admin email is blocked from regular login — redirected to `/admin-login`

---

## 3. Admin Login Page — `/admin-login`

**File:** `AdminLoginPageNew.js`  
**Who uses it:** Admin only  
**Access:** Public (but only works with admin credentials)

### What it does

Two-step secure login for the admin account. Regular users cannot use this page.

### Step 1 — Credentials

- Admin enters email and password
- Calls `POST /users/admin-login`
- If credentials are correct, a 6-digit OTP is generated and **printed to the backend console**
- Page automatically moves to Step 2

### Step 2 — OTP Verification

- Admin enters the 6-digit OTP from the backend console
- Calls `POST /users/admin-verify-otp`
- OTP is valid for **5 minutes** and is single-use (cleared after verification)
- On success, stores JWT token and redirects to `/dashboard`

### Why 2-step?

Admin has access to all user data, all donations, and platform metrics. The OTP step prevents unauthorized access even if the password is compromised.

---

## 4. Donor Pages — `/donor/*`

**File:** `DonorPage.js`  
**Who uses it:** Donors only (restaurants, households, wedding halls, temples)  
**Access:** Protected — requires `role = donor`

The Donor section has 3 sub-pages accessible from the sidebar.

---

### 4.1 Post Donation — `/donor`

**Purpose:** The main action page for donors — post surplus food for NGOs to claim.

#### Impact stats bar (top)

Shows 5 live stats calculated from the donor's own donation history:
- Total Posted, Completed, Active Now, Meals Saved, CO₂ Saved (kg)
- CO₂ formula: `completed_kg × 2.5` (WRAP UK standard)

#### Donation form

The form collects all required information:

| Field | Purpose |
|---|---|
| Food Name | What food is being donated (e.g. "Biryani") |
| Food Type | 4 visual card buttons: Cooked 🍳 / Raw 🥦 / Packaged 📦 / Event/Temple 💛 |
| Quantity (kg) | Weight of food |
| Serves (people) | How many people it can feed |
| Pickup Address | Text address for volunteers to find |
| Pickup Location | GPS button or interactive map picker (defaults to Nagercoil) |
| Prepared At | When the food was cooked |
| Expires At | Latest safe time to eat |
| Food Photo | Upload image (JPEG/PNG/WEBP) — stored on server |

#### What happens when you submit

1. Photo is uploaded first via `POST /upload/photo` → gets a URL
2. Donation is created via `POST /donations/`
3. **Smart Engine runs automatically:**
   - ML calculates expiry risk (GradientBoosting model, 94.56% accuracy)
   - All NGOs are ranked by distance + demand + rating
   - Notifications sent to all NGOs with match scores
4. Success toast notification appears

#### Right sidebar

- **Smart Engine Active** card — explains what ML does behind the scenes
- **Tips** — 5 numbered tips for faster pickup
- **Recent Donations** — live mini-list of last 4 donations with status badges

---

### 4.2 My Map — `/donor/map`

**Purpose:** See all your donations plotted on an interactive map.

- Loads all the donor's donations via `GET /donations/`
- Displays them as green markers on a Leaflet map
- Map is centered on **Nagercoil** by default
- Kanyakumari district boundary shown as a dashed green polygon
- Clicking a marker shows a popup with food name, quantity, status, and expiry

**Use case:** Quickly see where your donations are geographically and which ones are still active.

---

### 4.3 History — `/donor/history`

**Purpose:** Full history of all donations with filtering, journey tracking, CO₂ impact, and volunteer rating.

#### Impact summary bar

4 stat cards: Total Donations, Completed, Meals Saved, Food Saved (kg)

#### Filter tabs

Filter donations by status: All / Posted / Claimed / Assigned / Completed / Expired — with count badges on each tab.

#### Donation cards

Each card shows:
- Food photo (if uploaded)
- Color bar by food type (orange=cooked, green=raw, blue=packaged, purple=event)
- Food name + status badge
- Tags: food type, weight, serves
- Address
- Live countdown timer (turns red when < 1 hour left)

#### Expandable journey timeline

Click any card to expand it and see:

1. **CO₂ saved badge** — "X kg CO₂ saved — This donation prevented X kg of carbon emissions"
2. **Food Journey timeline** — 4 steps with who did each step and when:
   - 🍱 Food Posted — by [Donor name] at [time]
   - 🏢 Claimed by NGO — by [NGO name] at [time]
   - 🚴 Volunteer Assigned — by [Volunteer name] at [time]
   - ✅ Delivered to Community — fed X people
3. **Volunteer rating** — 5-star rating buttons appear for completed donations (only shown once, disappears after rating)

---

## 5. NGO Pages — `/ngo/*`

**File:** `NGOPage.js`  
**Who uses it:** NGOs / Charities / Food banks  
**Access:** Protected — requires `role = ngo`

The NGO section has 5 sub-pages — the most feature-rich role in the system.

---

### 5.1 Nearby Food — `/ngo`

**Purpose:** Find and claim surplus food donations near the NGO's location.

#### How it works

- On load, uses the NGO's saved location (lat/lng from registration) to call `GET /donations/nearby`
- Shows all `posted` donations within 20 km, sorted by distance (nearest first)
- GPS button lets NGO update their current location
- Refresh button reloads the list

#### Donation cards

Each card shows:
- Food photo (if available)
- Food type color banner with distance badge (e.g. "📍 0.3 km")
- Food name, type tag, weight, serves count
- Pickup address
- Live countdown timer
- Compact journey tracker (shows current step)
- Action button based on status:
  - `posted` → **Claim** button
  - `claimed` → **Assign Volunteer** button (opens modal)
  - `assigned` → "Volunteer Assigned" pill
  - `completed` → "Completed" pill

#### Claim flow

1. Click "Claim" → calls `PATCH /donations/{id}/claim`
2. Donation status changes: `posted` → `claimed`
3. NGO's location is logged as a demand signal for the ML heatmap
4. Donor receives notification: "Your donation was claimed by [NGO name]"

#### Assign Volunteer modal

After claiming, click "Assign Volunteer":
- Modal shows all registered volunteers with name, address, and star rating
- Select a volunteer → click Assign → calls `PATCH /donations/{id}/assign/{volunteer_id}`
- Donation status: `claimed` → `assigned`
- Volunteer receives notification with pickup address

---

### 5.2 Claimed Donations — `/ngo/claimed`

**Purpose:** Manage all donations the NGO has already claimed — see their status and assign volunteers to any that still need one.

- Loads all donations via `GET /donations/` and filters out `posted` ones
- Shows claimed, assigned, and completed donations
- Each card shows food name, weight, serves, expiry time, and current status
- For `claimed` donations: "Assign Volunteer" button opens the same assignment modal
- For `assigned` donations: shows the current status (volunteer is on the way)
- For `completed` donations: shows as completed

**Use case:** NGO coordinator's management view — see everything in progress at once.

---

### 5.3 Smart Engine — `/ngo/ai`

**Purpose:** Run the ML decision engine on any active donation to see which NGO is the best match and get a Gemini AI explanation.

#### How it works

**Left panel — Donation selector:**
- Lists all `posted` donations
- Click any donation to analyze it

**Right panel — Engine results:**

When a donation is selected, calls `GET /ml/smart-engine/{id}` which runs:

```
Score = 0.30 × distance + 0.25 × demand + 0.20 × safety + 0.15 × rating + 0.10 × urgency
```

**Priority banner** — shows urgency level:
- 🟢 NORMAL — more than 6 hours left
- ⚠️ HIGH — 2 to 6 hours left
- 🔴 CRITICAL — less than 2 hours left

**Best NGO card** — shows:
- NGO name, distance, rating, demand score
- Final score (0–1)
- 5 animated progress bars showing each factor's contribution:
  - Distance (max 0.30)
  - Demand (max 0.25)
  - Safety (max 0.20)
  - Rating (max 0.15)
  - Urgency (max 0.10)

**Gemini AI Explanation** — dark card with AI-generated text explaining in plain English WHY this NGO was chosen. Example:
> "🎯 Sneha Bhavan Trust was selected because it is only 0.3 km away (highest proximity score), serves an area with high food demand (0.85/1.0), and has an excellent rating of 4.9/5. With only 3.5 hours until expiry, urgency was factored in to ensure the food reaches people before it spoils."

**All Candidates** — ranked list of all NGOs with their scores.

**Use case:** NGO coordinators can understand exactly why the system recommended them for a donation, building trust in the AI decisions.

---

### 5.4 Route Planner — `/ngo/route`

**Purpose:** Plan and optimize a volunteer's multi-stop pickup and delivery route using the TSP algorithm.

#### How it works

**Left panel — Stop builder:**
- Starts with the NGO's current location as the starting point (defaults to Nagercoil if no location set)
- Add stops by entering: Label, Type (Pickup 🛒 or Delivery 🏠), Latitude, Longitude
- Each stop is shown in a list with its type color and coordinates
- Remove any stop with the ✕ button
- Click **Optimize Route** → calls `POST /ml/multi-stop-route`

**Right panel — Optimized result:**
- Total distance (km)
- Total stop count
- Ordered timeline showing each stop with:
  - Step number in a colored circle
  - Stop label and type
  - Distance from previous stop (`+X km`)
  - Cumulative distance so far

**Algorithm:** Nearest-Neighbor TSP (Travelling Salesman Problem) — always picks the closest unvisited stop next, minimizing total travel distance.

**Use case:** When a volunteer needs to pick up from multiple restaurants and deliver to multiple NGOs, this page generates the most efficient route order.

---

### 5.5 Live Map — `/ngo/map`

**Purpose:** Visual map showing all nearby donations, food demand heatmap, and route to the nearest donation.

#### What it shows

- All nearby `posted` donations as green markers (within 20 km of NGO's location)
- **Demand heatmap** — colored overlay showing where food claims happen most:
  - 🔴 Red = high demand zones
  - 🟡 Yellow = medium demand
  - 🔵 Blue = low demand
- **Route line** — dashed green line showing the road route from NGO to the nearest donation (via OSRM routing API)
- Kanyakumari district boundary polygon
- District info badge: "📍 Nagercoil & Kanyakumari District"

**Use case:** NGO coordinator gets a bird's-eye view of where food is available and where demand is highest — helps prioritize which donations to claim first.

---

## 6. Volunteer Pages — `/volunteer/*`

**File:** `VolunteerPage.js`  
**Who uses it:** Volunteers (delivery riders, community helpers)  
**Access:** Protected — requires `role = volunteer`

---

### 6.1 My Tasks — `/volunteer`

**Purpose:** The volunteer's main work dashboard — see assigned tasks and mark deliveries as complete.

#### Stats bar (top)

6 stat chips showing:
- 📋 Total Tasks
- 🔥 Active (not yet delivered)
- 📦 Assigned (waiting to be picked up)
- ✅ Delivered
- 🌍 CO₂ Saved (kg) — estimated from deliveries
- ⭐ My Rating — live from the volunteer's profile (updated by donors after delivery)

#### Task cards

Each active task card shows:
- Colored top accent bar (yellow=assigned, blue=picked up, green=delivered)
- Task ID and Donation ID
- **3-step progress tracker** with connecting lines:
  - Step 1: Assigned (yellow)
  - Step 2: Picked Up (blue)
  - Step 3: Delivered (green)
  - Current step has a colored glow ring
- Info box: Assigned time, ETA (if set), Photo status
- **Mark as Delivered →** button — calls `PATCH /donations/{id}/complete`
  - On success: task marked delivered, donor notified, CO₂ impact message shown

#### Completed tasks section

Shows last 5 completed tasks with:
- Task ID, Donation ID, completion date
- Link to proof photo (if uploaded)
- "You helped save CO₂ with this delivery!" green badge

#### Tips card

4 practical tips for volunteers about timing, proof photos, and ratings.

---

### 6.2 Route Map — `/volunteer/map`

**Purpose:** See the road route from the volunteer's location to a pickup point.

#### How it works

**Left panel — Active Tasks:**
- Lists all tasks that are not yet delivered
- Click any task to load its route

**Right panel — Route Info:**
- Shows route status (loaded / unavailable)
- Displays number of waypoints

**Map below:**
- Full Leaflet map with the route drawn as a dashed green polyline
- Route is fetched from the OpenRouteService API using the volunteer's location and the donation's location
- If location data is missing, shows a warning

**Use case:** Volunteer opens this page on their phone while on the road to navigate to the pickup location.

---

## 7. Admin Dashboard — `/dashboard/*`

**File:** `DashboardPage.js`  
**Who uses it:** Admin only  
**Access:** Protected — requires `role = admin`

The admin dashboard has 4 sub-pages for complete platform oversight.

---

### 7.1 Overview — `/dashboard`

**Purpose:** Real-time platform metrics and analytics — the admin's command center.

#### Live chip

Shows "● Live Dashboard" with a pulsing green dot and today's date.

#### 7 Metric cards

Each card has a colored top border, icon, large number, label, and sub-text:

| Metric | What it shows |
|---|---|
| 🍱 Total Donations | All donations ever posted |
| ✅ Completed | Successfully delivered donations |
| 🍽️ Meals Saved | Total people fed from completed donations |
| ⚖️ Food Saved (kg) | Total weight of food rescued |
| 🌍 CO₂ Saved (kg) | Carbon emissions avoided (kg × 2.5) |
| 🏢 Active NGOs | Number of registered NGO accounts |
| 🚴 Active Pickups | Donations currently in `assigned` status |

#### Donation Status Breakdown

Horizontal progress bars showing the percentage of donations in each status (posted, claimed, assigned, completed, expired) with count and percentage.

#### Top Donors

Ranked list of top 5 donors by completed donations, with medal icons (🥇🥈🥉), avatar, name, meals served, and donation count.

#### 7-Day Analytics Chart

Bar chart showing daily donation activity for the past 7 days:
- Purple bars = total posted
- Green overlay = completed
- Shows "This Week", "Completed", and "Success Rate" stats

#### Recent Donations Table

Table of the 10 most recent donations with columns: ID, Food, Type, Qty, Serves, Status, Expires, Posted.

#### Donor Leaderboard

Compact leaderboard showing top donors with badges (Legend, Gold, Star, Silver, New Hero) based on donation count.

---

### 7.2 All Users — `/dashboard/users`

**Purpose:** View and search all registered users across all roles.

#### Features

- **Search bar** — filter by name or email in real-time
- **Role filter tabs** — All Users / Donors / NGOs / Volunteers with count badges
- **User cards** — grid layout showing:
  - Avatar with role-colored background
  - Name, email, address
  - Role badge (color-coded: orange=donor, green=ngo, blue=volunteer, purple=admin)
  - Star rating
  - ✓ Verified badge (if verified)
  - 📌 Located badge (if lat/lng is set)

**Use case:** Admin can quickly find any user, check their details, and verify their role and location.

---

### 7.3 All Donations — `/dashboard/food`

**Purpose:** View and filter every donation on the platform.

#### Features

- **Filter tabs** — All / Posted / Claimed / Assigned / Completed / Expired with count badges
- **Data table** with columns: ID, Food Name, Type, Quantity, Serves, Status, Expires, Posted Date
- Status shown as colored pills (green=posted, blue=claimed, amber=assigned, gray=completed, red=expired)
- Scrollable horizontally on small screens

**Use case:** Admin monitors the health of the platform — how many donations are expiring, how many are stuck in claimed status, etc.

---

### 7.4 Heatmap — `/dashboard/map`

**Purpose:** Visual intelligence map showing food demand patterns across Nagercoil & Kanyakumari district.

#### What it shows

**3 legend cards** explaining the color scale:
- 🔴 High Demand — Frequent claim zones — prioritize these
- 🟡 Medium Demand — Moderate activity — monitor closely
- 🔵 Low Demand — Underserved areas — expand outreach

**Interactive heatmap:**
- All completed donations plotted as data points
- Heat intensity based on `serves_people` value (more people = hotter)
- Kanyakumari district boundary polygon
- Demand data comes from `DemandLog` table — every time an NGO claims a donation, their location is logged

**Use case:** Admin identifies which areas of Nagercoil/KK district have the most food need and which areas are underserved — helps in outreach and NGO recruitment decisions.

---

## 8. Leaderboard — `/leaderboard`

**File:** `LeaderboardPageNew.js`  
**Who uses it:** All logged-in roles (donor, ngo, volunteer, admin)  
**Access:** Protected — any logged-in user

**Purpose:** Celebrate and motivate food rescue champions across the district.

### Platform totals (top)

4 stat cards: Donations Completed, Meals Saved, Food Rescued (kg), CO₂ Saved (kg) — platform-wide numbers.

### Your rank card

If the current user has completed donations, shows a personal card with:
- Avatar, name, rank number (#1, #2, etc.)
- Personal stats: donations, meals saved, CO₂ saved

### Top 3 Podium

Visual podium with 3 columns of different heights (1st tallest, 2nd medium, 3rd shortest) showing the top 3 donors with their scores.

### Filter tabs

Sort the rankings by 4 different metrics:
- 🍱 Donations — by number of completed donations
- 🍽️ Meals Saved — by total people fed
- ⚖️ Food (kg) — by total weight rescued
- 🌍 CO₂ Saved — by carbon emissions avoided

### Full rankings table

Paginated list (10 per page) showing all donors with:
- Rank badge (🥇🥈🥉 for top 3, #N for others)
- Avatar, name, role badge
- "You" badge if it's the current user (highlighted row)
- Score for the selected filter category

### Achievements section

6 achievement badges that unlock based on the user's actual donation count:
- 🍱 First Donation (1 donation)
- 👥 Community Helper (10 donations)
- 🌍 Carbon Saver (40 donations → 100kg CO₂)
- ⭐ Trusted Donor (5 donations)
- 🚀 Power Donor (10 donations)
- 🏆 Legend (50 donations)

Unlocked badges are highlighted in green; locked ones are grayed out.

---

## 9. Global Components — Always Visible

These two components appear on every page for all logged-in users, regardless of role.

### Gemini AI Chat (bottom-left floating button 🤖)

**File:** `GeminiChatNew.js`

A floating chat button that opens a chat window powered by **Gemini 2.0 Flash API**.

- Pre-loaded with FoodShare context so it understands the platform
- Quick prompt buttons: "How does NGO matching work?", "What is expiry risk?", etc.
- Typing indicator with animated dots
- Answers questions about donations, NGO operations, volunteer tasks, and platform usage
- Useful for new users who don't know how to use the platform

### WhatsApp-style Notifications (bottom-right)

**File:** `WhatsAppNotif.js`

Toast notifications that appear in the bottom-right corner styled like WhatsApp messages.

- Triggered by key actions: donation posted, donation claimed, delivery completed
- Shows sender name, message, and timestamp
- Auto-dismisses after 5 seconds
- Maximum 3 toasts visible at once
- Color-coded: green=success, amber=warning, red=error

---

## 10. How All Pages Connect — The Full User Journey

This shows how a single food donation travels through all the pages from start to finish.

```
DONOR posts food on /donor
    ↓
    Smart Engine runs automatically (ML + notifications)
    ↓
NGO sees it on /ngo (Nearby Food)
    ↓
NGO claims it → status: posted → claimed
    ↓
NGO assigns volunteer on /ngo (Assign modal) or /ngo/claimed
    ↓
    status: claimed → assigned
    ↓
VOLUNTEER sees task on /volunteer (My Tasks)
    ↓
VOLUNTEER uses /volunteer/map to navigate to pickup
    ↓
VOLUNTEER marks delivered on /volunteer
    ↓
    status: assigned → completed
    ↓
DONOR sees journey on /donor/history (expand card)
    ↓
DONOR rates volunteer (1-5 stars) on /donor/history
    ↓
ADMIN sees all metrics on /dashboard
    ↓
ALL USERS see donor on /leaderboard
```

### Page-to-page data flow

| Page | Reads from | Writes to |
|---|---|---|
| `/donor` | `/donations/` (sidebar list) | `/donations/` (new donation) |
| `/donor/map` | `/donations/` | — |
| `/donor/history` | `/donations/`, `/donations/{id}/lifecycle` | `/donations/{id}/rate-volunteer` |
| `/ngo` | `/donations/nearby` | `/donations/{id}/claim`, `/donations/{id}/assign/{vid}` |
| `/ngo/claimed` | `/donations/` | `/donations/{id}/assign/{vid}` |
| `/ngo/ai` | `/donations/`, `/ml/smart-engine/{id}` | Gemini API (external) |
| `/ngo/route` | — | `/ml/multi-stop-route` |
| `/ngo/map` | `/donations/nearby` | — |
| `/volunteer` | `/volunteers/my-tasks` | `/donations/{id}/complete` |
| `/volunteer/map` | `/volunteers/my-tasks` | OpenRouteService API (external) |
| `/dashboard` | `/admin/metrics`, `/admin/all-donations` | — |
| `/dashboard/users` | `/admin/all-users` | — |
| `/dashboard/food` | `/admin/all-donations` | — |
| `/dashboard/map` | `/admin/all-donations` | — |
| `/leaderboard` | `/admin/leaderboard` | — |

---

*Generated for FoodShare — Nagercoil & Kanyakumari District Food Redistribution Platform*  
*Frontend: React.js | Maps: Leaflet + OpenStreetMap | AI: Gemini 2.0 Flash | ML: GradientBoosting*
