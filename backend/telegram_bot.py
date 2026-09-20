"""
FoodShare Telegram Bot
======================
Commands:
  /start        - Register chat ID + welcome message
  /help         - List all commands
  /status       - Live platform stats
  /urgent       - Donations expiring in < 2 hours
  /mydonations  - Donor: see their active donations
  /tasks        - Volunteer: see active tasks
  /leaderboard  - Top 5 donors

Auto Notifications (fired from donation events):
  - New donation posted   → all registered NGO chats
  - Donation claimed      → donor chat
  - Volunteer assigned    → volunteer chat
  - Delivery completed    → donor chat + admin
  - Urgent expiry (< 2h)  → all registered chats
"""

import os
import asyncio
import httpx
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN        = os.getenv("TELEGRAM_BOT_TOKEN", "")
ADMIN_CHAT_ID    = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")
BASE_URL         = f"https://api.telegram.org/bot{BOT_TOKEN}"

# In-memory registry: chat_id → {"role": str, "name": str, "user_id": int}
# Persists only while server is running — good enough for demo
_registered_chats: dict = {}
_last_update_id: int    = 0

# Auto-register admin chat on startup
if ADMIN_CHAT_ID:
    _registered_chats[ADMIN_CHAT_ID] = {"role": "admin", "name": "Ratheesh", "user_id": None}


# ─── Core send function ───────────────────────────────────────────────────────

async def send_message(chat_id: str, text: str, reply_markup: dict = None):
    """Send a Telegram message. Silently ignores errors (bot not configured)."""
    if not BOT_TOKEN or BOT_TOKEN == "your_bot_token_here":
        return
    payload = {
        "chat_id":    chat_id,
        "text":       text,
        "parse_mode": "HTML",
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(f"{BASE_URL}/sendMessage", json=payload)
    except Exception:
        pass


async def broadcast(text: str, role_filter: str = None):
    """Send message to all registered chats, optionally filtered by role."""
    for chat_id, info in _registered_chats.items():
        if role_filter is None or info.get("role") == role_filter:
            await send_message(chat_id, text)


# ─── Notification helpers (called from donation routes) ──────────────────────

async def notify_new_donation(food_name: str, quantity_kg: float,
                               serves: int, food_type: str,
                               address: str, donor_name: str,
                               risk: str, hours_left: float,
                               db_session_factory=None):
    risk_emoji = {"low": "🟢", "medium": "🟡", "high": "🔴"}.get(risk, "⚪")
    text = (
        f"🍱 <b>New Food Donation!</b>\n\n"
        f"🥘 <b>{food_name}</b> ({food_type})\n"
        f"⚖️ {quantity_kg} kg  •  👥 Serves {serves} people\n"
        f"📍 {address}\n"
        f"👤 Donated by: {donor_name}\n"
        f"{risk_emoji} Expiry risk: <b>{risk.upper()}</b> ({hours_left}h left)\n\n"
        f"🌐 Open FoodShare app to claim!"
    )
    # Send to all NGOs who connected Telegram
    if db_session_factory:
        try:
            db = db_session_factory()
            from models import User
            ngos = db.query(User).filter(
                User.role == "ngo",
                User.telegram_chat_id.isnot(None)
            ).all()
            for ngo in ngos:
                await send_message(ngo.telegram_chat_id, text)
            db.close()
        except Exception as e:
            print(f"[Telegram] notify_new_donation DB error: {e}")
    # Also broadcast to in-memory registered NGO chats + admin
    await broadcast(text, role_filter="ngo")
    if ADMIN_CHAT_ID:
        await send_message(ADMIN_CHAT_ID, text)


async def notify_donation_claimed(food_name: str, ngo_name: str,
                                   donor_id: int = None,
                                   db_session_factory=None):
    text = (
        f"✅ <b>Your donation was claimed!</b>\n\n"
        f"🍱 <b>{food_name}</b>\n"
        f"🏢 Claimed by: <b>{ngo_name}</b>\n\n"
        f"A volunteer will be assigned shortly. Thank you for sharing! 🙏"
    )
    # Look up donor's telegram chat ID from DB
    if donor_id and db_session_factory:
        try:
            db = db_session_factory()
            from models import User
            donor = db.query(User).filter(User.id == donor_id).first()
            if donor and donor.telegram_chat_id:
                await send_message(donor.telegram_chat_id, text)
            db.close()
        except Exception as e:
            print(f"[Telegram] notify_donation_claimed DB error: {e}")
    if ADMIN_CHAT_ID:
        await send_message(ADMIN_CHAT_ID,
            f"📋 <b>Claim Update:</b> {food_name} claimed by {ngo_name}")


async def notify_volunteer_assigned(food_name: str, address: str,
                                     serves: int, expires_at: str,
                                     volunteer_id: int = None,
                                     volunteer_name: str = None,
                                     db_session_factory=None):
    text = (
        f"🚴 <b>New Pickup Task Assigned!</b>\n\n"
        f"🍱 <b>{food_name}</b>\n"
        f"📍 Pickup from: {address}\n"
        f"👥 Will feed: {serves} people\n"
        f"⏰ Expires: {expires_at}\n\n"
        f"Please pick up as soon as possible! 💪"
    )
    vol_name = volunteer_name or f"Volunteer #{volunteer_id}"
    if volunteer_id and db_session_factory:
        try:
            db = db_session_factory()
            from models import User
            vol = db.query(User).filter(User.id == volunteer_id).first()
            if vol:
                vol_name = vol.name
                if vol.telegram_chat_id:
                    await send_message(vol.telegram_chat_id, text)
            db.close()
        except Exception as e:
            print(f"[Telegram] notify_volunteer_assigned DB error: {e}")
    if ADMIN_CHAT_ID:
        await send_message(ADMIN_CHAT_ID,
            f"🚴 <b>Volunteer Assigned:</b> {food_name}\n"
            f"👤 Volunteer: <b>{vol_name}</b>\n"
            f"📍 Pickup: {address}\n"
            f"👥 Feeds {serves} people")


async def notify_delivery_complete(food_name: str, serves: int,
                                    volunteer_name: str,
                                    donor_id: int = None,
                                    ngo_id: int = None,
                                    db_session_factory=None):
    co2 = round(serves * 0.5, 1)
    donor_text = (
        f"🎉 <b>Delivery Complete!</b>\n\n"
        f"🍱 <b>{food_name}</b> has been delivered!\n"
        f"🚴 Delivered by: <b>{volunteer_name}</b>\n"
        f"👥 People fed: <b>{serves}</b>\n"
        f"🌱 CO₂ saved: ~{co2} kg\n\n"
        f"Thank you for sharing food! 🙏🌍"
    )
    ngo_text = (
        f"✅ <b>Food Received!</b>\n\n"
        f"🍱 <b>{food_name}</b> has arrived at your NGO!\n"
        f"🚴 Delivered by: <b>{volunteer_name}</b>\n"
        f"👥 People fed: <b>{serves}</b>\n"
        f"🌱 CO₂ saved: ~{co2} kg\n\n"
        f"Great work coordinating this rescue! 💪"
    )
    if db_session_factory:
        try:
            db = db_session_factory()
            from models import User
            if donor_id:
                donor = db.query(User).filter(User.id == donor_id).first()
                if donor and donor.telegram_chat_id:
                    await send_message(donor.telegram_chat_id, donor_text)
            if ngo_id:
                ngo = db.query(User).filter(User.id == ngo_id).first()
                if ngo and ngo.telegram_chat_id:
                    await send_message(ngo.telegram_chat_id, ngo_text)
            db.close()
        except Exception as e:
            print(f"[Telegram] notify_delivery_complete DB error: {e}")
    if ADMIN_CHAT_ID:
        await send_message(ADMIN_CHAT_ID,
            f"✅ <b>Delivery:</b> {food_name} delivered by {volunteer_name} • {serves} people fed")


async def notify_route_assigned(volunteer_chat_id: str, volunteer_name: str,
                                ngo_name: str, ordered_stops: list, total_km: float):
    """Send the full optimized multi-stop route to the volunteer on Telegram."""
    TYPE_ICON = {"start": "\U0001f4cd", "pickup": "\U0001f6d2", "delivery": "\U0001f3e0"}
    TYPE_LABEL = {"start": "Start", "pickup": "Pickup", "delivery": "Drop-off"}

    lines = [
        f"\U0001f5fa\ufe0f <b>Optimized Route Assigned!</b>",
        f"\U0001f4e6 Assigned by: <b>{ngo_name}</b>",
        f"\U0001f4cd {len(ordered_stops)} stops \u00b7 <b>{total_km} km total</b>",
        "",
    ]

    for i, stop in enumerate(ordered_stops, 1):
        icon  = TYPE_ICON.get(stop.get("type", ""), "\U0001f4cd")
        label = TYPE_LABEL.get(stop.get("type", ""), "Stop")
        name  = stop.get("label", "Unknown")
        addr  = stop.get("address", "")
        leg   = stop.get("leg_km", 0)

        lines.append(f"{i}\ufe0f\u20e3 {icon} <b>{label}:</b> {name}")
        if addr and addr != name:
            lines.append(f"   \U0001f4cd {addr}")
        if leg and float(leg) > 0:
            lines.append(f"   \u27a1\ufe0f +{leg} km to next stop")
        lines.append("")

    lines += [
        f"\u23f0 Start as soon as possible!",
        f"\U0001f4f1 Open FoodShare app for full details.",
    ]

    await send_message(volunteer_chat_id, "\n".join(lines))


async def notify_urgent_expiry(food_name: str, quantity_kg: float,
                                serves: int, hours_left: float, address: str,
                                db_session_factory=None):
    text = (
        f"🚨 <b>URGENT — Food Expiring Soon!</b>\n\n"
        f"🍱 <b>{food_name}</b> ({quantity_kg}kg)\n"
        f"👥 Serves {serves} people\n"
        f"📍 {address}\n"
        f"⏱️ Only <b>{hours_left}h left!</b>\n\n"
        f"⚡ Claim immediately on FoodShare app!"
    )
    # Send to all NGOs connected via Profile page (DB)
    if db_session_factory:
        try:
            db = db_session_factory()
            from models import User
            ngos = db.query(User).filter(
                User.role == "ngo",
                User.telegram_chat_id.isnot(None)
            ).all()
            for ngo in ngos:
                await send_message(ngo.telegram_chat_id, text)
            db.close()
        except Exception as e:
            print(f"[Telegram] notify_urgent_expiry DB error: {e}")
    # Also hit in-memory registered chats + admin
    await broadcast(text)
    if ADMIN_CHAT_ID:
        await send_message(ADMIN_CHAT_ID, text)


# ─── Command handlers ─────────────────────────────────────────────────────────

async def handle_start(chat_id: str, user_name: str):
    _registered_chats[chat_id] = {"role": "unknown", "name": user_name, "user_id": None}
    text = (
        f"👋 Welcome to <b>FoodShare Bot</b>, {user_name}!\n\n"
        f"I'll send you real-time alerts about food donations.\n\n"
        f"<b>Commands:</b>\n"
        f"/help — Show all commands\n"
        f"/status — Platform statistics\n"
        f"/urgent — Expiring donations\n"
        f"/leaderboard — Top donors\n\n"
        f"<b>Register your role:</b>\n"
        f"/register donor\n"
        f"/register ngo\n"
        f"/register volunteer\n\n"
        f"🌾 <i>Together we fight food waste!</i>"
    )
    await send_message(chat_id, text)


async def handle_help(chat_id: str):
    text = (
        f"📖 <b>FoodShare Bot Commands</b>\n\n"
        f"/start — Welcome & register\n"
        f"/status — Live platform stats\n"
        f"/urgent — Donations expiring in &lt;2h\n"
        f"/mydonations — Your active donations (donors)\n"
        f"/tasks — Your pickup tasks (volunteers)\n"
        f"/leaderboard — Top 5 donors\n"
        f"/register [role] — Set your role\n\n"
        f"<i>You'll receive automatic alerts for all donation events.</i>"
    )
    await send_message(chat_id, text)


async def handle_register(chat_id: str, role: str, user_name: str):
    valid = ["donor", "ngo", "volunteer", "admin"]
    if role not in valid:
        await send_message(chat_id, f"❌ Invalid role. Use: {', '.join(valid)}")
        return
    if chat_id not in _registered_chats:
        _registered_chats[chat_id] = {}
    _registered_chats[chat_id]["role"] = role
    _registered_chats[chat_id]["name"] = user_name

    role_emoji = {"donor": "🍱", "ngo": "🏢", "volunteer": "🚴", "admin": "🛡️"}
    await send_message(chat_id,
        f"{role_emoji.get(role, '✅')} Registered as <b>{role.upper()}</b>!\n\n"
        f"You'll now receive alerts relevant to your role.")


async def handle_status(chat_id: str, db_session_factory):
    """Fetch live stats from DB and send."""
    try:
        db = db_session_factory()
        from models import Donation, User, DonationStatus
        total     = db.query(Donation).count()
        posted    = db.query(Donation).filter(Donation.status == "posted").count()
        completed = db.query(Donation).filter(Donation.status == "completed").count()
        ngos      = db.query(User).filter(User.role == "ngo").count()
        volunteers= db.query(User).filter(User.role == "volunteer").count()
        donors    = db.query(User).filter(User.role == "donor").count()
        from sqlalchemy import func
        meals = db.query(func.sum(Donation.serves_people)).filter(
            Donation.status == "completed").scalar() or 0
        db.close()

        text = (
            f"📊 <b>FoodShare Live Stats</b>\n\n"
            f"🍱 Total Donations: <b>{total}</b>\n"
            f"🟢 Active (Posted): <b>{posted}</b>\n"
            f"✅ Completed: <b>{completed}</b>\n"
            f"🍽️ Meals Saved: <b>{meals}</b>\n\n"
            f"👥 <b>Community</b>\n"
            f"🏢 NGOs: {ngos}  •  🚴 Volunteers: {volunteers}  •  🍱 Donors: {donors}\n\n"
            f"<i>Updated: {datetime.utcnow().strftime('%H:%M UTC')}</i>"
        )
    except Exception as e:
        text = f"❌ Could not fetch stats: {e}"

    await send_message(chat_id, text)


async def handle_urgent(chat_id: str, db_session_factory):
    """Show donations expiring in < 2 hours."""
    try:
        db  = db_session_factory()
        from models import Donation
        now = datetime.utcnow()
        cutoff = now + timedelta(hours=2)
        urgent = db.query(Donation).filter(
            Donation.status == "posted",
            Donation.expires_at > now,
            Donation.expires_at <= cutoff
        ).all()
        db.close()

        if not urgent:
            await send_message(chat_id, "✅ No urgent donations right now. All good!")
            return

        text = f"🚨 <b>{len(urgent)} Urgent Donation(s) — Expiring Soon!</b>\n\n"
        for d in urgent:
            h = round((d.expires_at - now).total_seconds() / 3600, 1)
            text += (
                f"🍱 <b>{d.food_name}</b> — {d.quantity_kg}kg\n"
                f"👥 Serves {d.serves_people}  •  ⏱️ {h}h left\n"
                f"📍 {d.address}\n\n"
            )
        text += "⚡ Open FoodShare app to claim!"
        await send_message(chat_id, text)
    except Exception as e:
        await send_message(chat_id, f"❌ Error: {e}")


async def handle_leaderboard(chat_id: str, db_session_factory):
    try:
        db = db_session_factory()
        from models import Donation, User
        from sqlalchemy import func
        top = db.query(
            User.name,
            func.count(Donation.id).label("cnt"),
            func.sum(Donation.serves_people).label("meals")
        ).join(Donation, Donation.donor_id == User.id).filter(
            Donation.status == "completed"
        ).group_by(User.id).order_by(func.count(Donation.id).desc()).limit(5).all()
        db.close()

        if not top:
            await send_message(chat_id, "🏆 No completed donations yet. Be the first!")
            return

        medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
        text   = "🏆 <b>FoodShare Top Donors</b>\n\n"
        for i, (name, cnt, meals) in enumerate(top):
            text += f"{medals[i]} <b>{name}</b> — {cnt} donations • {meals or 0} meals\n"
        await send_message(chat_id, text)
    except Exception as e:
        await send_message(chat_id, f"❌ Error: {e}")


# ─── Update polling loop ──────────────────────────────────────────────────────

async def poll_updates(db_session_factory):
    """Long-poll Telegram for new messages and handle commands."""
    global _last_update_id
    if not BOT_TOKEN or BOT_TOKEN == "your_bot_token_here":
        print("[Telegram] Bot token not configured — skipping polling")
        return

    print("[Telegram] Bot polling started")
    while True:
        try:
            async with httpx.AsyncClient(timeout=35) as client:
                resp = await client.get(f"{BASE_URL}/getUpdates", params={
                    "offset":  _last_update_id + 1,
                    "timeout": 30,
                })
            data = resp.json()
            if not data.get("ok"):
                await asyncio.sleep(5)
                continue

            for update in data.get("result", []):
                _last_update_id = update["update_id"]
                msg = update.get("message", {})
                if not msg:
                    continue

                chat_id   = str(msg["chat"]["id"])
                user_name = msg["from"].get("first_name", "User")
                text      = msg.get("text", "").strip()

                if text.startswith("/start"):
                    await handle_start(chat_id, user_name)
                elif text.startswith("/help"):
                    await handle_help(chat_id)
                elif text.startswith("/register"):
                    parts = text.split()
                    role  = parts[1].lower() if len(parts) > 1 else ""
                    await handle_register(chat_id, role, user_name)
                elif text.startswith("/status"):
                    await handle_status(chat_id, db_session_factory)
                elif text.startswith("/urgent"):
                    await handle_urgent(chat_id, db_session_factory)
                elif text.startswith("/leaderboard"):
                    await handle_leaderboard(chat_id, db_session_factory)
                else:
                    await send_message(chat_id,
                        "❓ Unknown command. Type /help to see all commands.")

        except Exception as e:
            print(f"[Telegram] Poll error: {e}")
            await asyncio.sleep(5)


def get_registered_chat_by_role(role: str) -> list:
    """Return list of chat_ids registered with given role."""
    return [cid for cid, info in _registered_chats.items() if info.get("role") == role]


def get_all_chat_ids() -> list:
    return list(_registered_chats.keys())
