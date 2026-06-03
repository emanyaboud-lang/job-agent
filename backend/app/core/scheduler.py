from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio

_scheduler = AsyncIOScheduler()

async def _daily_search():
    from app.agents.agent1_searcher import run_search
    await run_search()

async def _check_email_replies():
    """فحص الردود الواردة من الشركات"""
    try:
        from app.services.gmail_service import get_messages
        from app.services.supabase_service import get_client, log_event
        from app.services.claude_service import summarize_email
        from datetime import datetime
        messages = get_messages(max_results=20, query="in:inbox newer_than:1d")
        for msg in messages:
            existing = get_client().table("emails").select("id").eq("gmail_id", msg["gmail_id"]).execute()
            if existing.data:
                continue
            summary = summarize_email(msg["body"])
            get_client().table("emails").insert({
                "direction": "incoming",
                "subject": msg["subject"],
                "body": msg["body"],
                "from_email": msg["from_email"],
                "to_email": msg["to_email"],
                "status": "delivered",
                "sent_at": datetime.utcnow().isoformat(),
                "gmail_id": msg["gmail_id"],
                "thread_id": msg["thread_id"],
                "ai_summary": summary,
            }).execute()
            get_client().table("notifications").insert({
                "type": "email_received",
                "title": "رد جديد من شركة",
                "message": f"من: {msg['from_email']} — {summary}",
                "is_read": False,
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
            log_event("email_received", f"رد من {msg['from_email']}: {summary}", "info")
    except Exception as e:
        pass

def start_scheduler():
    from app.services.supabase_service import get_settings
    settings_data = get_settings()
    search_time = settings_data.get("search_time", "08:00")
    hour, minute = map(int, search_time.split(":"))

    _scheduler.add_job(_daily_search, CronTrigger(hour=hour, minute=minute), id="daily_search", replace_existing=True)
    _scheduler.add_job(_check_email_replies, "interval", minutes=30, id="check_emails", replace_existing=True)
    _scheduler.start()

def shutdown_scheduler():
    _scheduler.shutdown(wait=False)

def update_search_time(time_str: str):
    hour, minute = map(int, time_str.split(":"))
    _scheduler.reschedule_job("daily_search", trigger=CronTrigger(hour=hour, minute=minute))