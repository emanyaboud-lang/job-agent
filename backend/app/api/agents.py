from fastapi import APIRouter
import asyncio
from datetime import datetime
from app.services.supabase_service import get_client, log_event

router = APIRouter()

_agent1_active = True
_agent2_active = True

@router.get("/status")
async def get_status():
    a1_state = "running" if _agent1_active else "stopped"
    a2_state = "running" if _agent2_active else "stopped"
    try:
        r = get_client().table("agent_status").select("*").execute()
        data = {d["agent_id"]: d for d in (r.data or [])}
        a1_data = data.get("agent1", {})
        a2_data = data.get("agent2", {})
    except Exception:
        a1_data = {}
        a2_data = {}

    today = datetime.utcnow().date().isoformat()
    sent_by_city = {}
    try:
        apps = get_client().table("applications").select("*").gte("sent_at", today).execute()
        for a in (apps.data or []):
            city = a.get("city", "other")
            sent_by_city[city] = sent_by_city.get(city, 0) + 1
    except Exception:
        pass

    from app.services.supabase_service import get_settings
    settings_data = get_settings()
    limits = settings_data.get("daily_limits", {"madinah": 5, "jeddah": 10, "riyadh": 8, "yanbu": 3})

    return {
        "agent1": {
            "state": a1_state,
            "last_run": a1_data.get("last_run"),
            "jobs_found_today": a1_data.get("jobs_found_today", 0),
            "next_run": None,
        },
        "agent2": {
            "state": a2_state,
            "sent_today": sent_by_city,
            "limits": limits,
        }
    }

@router.post("/search")
async def trigger_search():
    global _agent1_active
    _agent1_active = True
    from app.agents.agent1_searcher import run_search
    added = await run_search()
    return {"success": True, "jobs_added": added}

@router.post("/1/toggle")
async def toggle_agent1(body: dict):
    global _agent1_active
    _agent1_active = body.get("active", True)
    log_event("agent1_toggle", f"Agent 1: {'تشغيل' if _agent1_active else 'إيقاف'}", "info")
    return {"active": _agent1_active}

@router.post("/2/toggle")
async def toggle_agent2(body: dict):
    global _agent2_active
    _agent2_active = body.get("active", True)
    log_event("agent2_toggle", f"Agent 2: {'تشغيل' if _agent2_active else 'إيقاف'}", "info")
    return {"active": _agent2_active}