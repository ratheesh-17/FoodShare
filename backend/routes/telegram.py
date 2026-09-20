from fastapi import APIRouter, Depends
import models
from auth import get_current_user
from telegram_bot import send_message, ADMIN_CHAT_ID, get_all_chat_ids
from datetime import datetime

router = APIRouter(prefix="/telegram", tags=["Telegram"])


@router.post("/test")
async def test_telegram(current_user: models.User = Depends(get_current_user)):
    """Send a test message to the current user's Telegram and all registered chats."""
    # Collect chat IDs: in-memory registered + admin + current user's connected chat
    chat_ids = set(get_all_chat_ids())
    if ADMIN_CHAT_ID:
        chat_ids.add(ADMIN_CHAT_ID)
    if current_user.telegram_chat_id:
        chat_ids.add(current_user.telegram_chat_id)

    if not chat_ids:
        return {"message": "No Telegram chats found. Connect Telegram from your Profile page first.", "sent": 0}

    text = (
        f"🧪 <b>FoodShare Bot Test</b>\n\n"
        f"✅ Connection successful!\n"
        f"👤 Triggered by: {current_user.name} ({current_user.role})\n"
        f"🕐 Time: {datetime.utcnow().strftime('%H:%M UTC')}\n\n"
        f"<i>Your bot is working correctly!</i>"
    )

    for cid in chat_ids:
        await send_message(cid, text)

    return {"message": f"Test message sent to {len(chat_ids)} chat(s)", "sent": len(chat_ids)}
