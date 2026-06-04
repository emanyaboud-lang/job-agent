from fastapi import APIRouter, BackgroundTasks
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

async def _run_search_bg():
    try:
        from app.agents.agent1_searcher import run_search
        added = await run_search()
        log_event("agent1_search_done", f"اكتمل البحث: {added} وظيفة", "success", {"added": added})
    except Exception as e:
        log_event("agent1_search_error", f"خطأ في البحث: {str(e)[:200]}", "error")


@router.post("/search")
async def trigger_search(background_tasks: BackgroundTasks):
    global _agent1_active
    _agent1_active = True
    log_event("agent1_search_start", "بدأ البحث في الخلفية", "info")
    background_tasks.add_task(_run_search_bg)
    return {"success": True, "message": "البحث بدأ — ستظهر الوظائف خلال دقيقة", "jobs_added": 0}


@router.post("/search/demo")
async def insert_demo_jobs():
    """يُدرج 5 وظائف تجريبية فوراً للاختبار"""
    from datetime import datetime
    DEMO_JOBS = [
        {"title": "مدير مشاريع - رؤية 2030", "company": "شركة نيوم", "city": "riyadh",
         "description": "قيادة مشاريع البنية التحتية الذكية ضمن مبادرات رؤية 2030",
         "requirements": "PMP, 5+ سنوات خبرة في إدارة المشاريع الكبرى", "platform": "linkedin",
         "apply_url": "https://www.linkedin.com/jobs"},
        {"title": "محلل أعمال أول", "company": "هيئة تطوير المدينة المنورة", "city": "madinah",
         "description": "تحليل متطلبات مشاريع التحول الرقمي والمدن الذكية",
         "requirements": "PBA أو CBAP, Power BI, Excel متقدم", "platform": "jadarat",
         "apply_url": "https://jadarat.sa"},
        {"title": "مدير مشاريع تقنية", "company": "شركة STC", "city": "riyadh",
         "description": "إدارة مشاريع التحول الرقمي وحلول الاتصالات",
         "requirements": "PMP, خبرة في مشاريع تقنية المعلومات 5 سنوات", "platform": "bayt",
         "apply_url": "https://www.bayt.com"},
        {"title": "Business Analyst", "company": "Aramco Digital", "city": "jeddah",
         "description": "Analyze business requirements for digital transformation projects in the energy sector",
         "requirements": "PBA, 4+ years experience, fluent English", "platform": "linkedin",
         "apply_url": "https://www.linkedin.com/jobs"},
        {"title": "PMO Specialist", "company": "أمانة المدينة المنورة", "city": "madinah",
         "description": "دعم مكتب إدارة المشاريع وتطوير منهجيات PMO",
         "requirements": "PMP, Microsoft Project, 3+ سنوات خبرة PMO", "platform": "taqat",
         "apply_url": "https://www.taqat.sa"},
    ]
    from app.services.claude_service import match_job
    cv = "Eman AlAboud PMP PBA Project Manager smart city Madinah Authority"
    added = 0
    for job in DEMO_JOBS:
        try:
            score = match_job(cv, job["title"], job.get("description",""), job.get("requirements",""))
            get_client().table("jobs").insert({
                **job,
                "match_score": score,
                "status": "pending",
                "is_vision2030": True,
                "discovered_at": datetime.utcnow().isoformat(),
            }).execute()
            added += 1
        except Exception:
            continue
    log_event("demo_jobs", f"أُدرجت {added} وظيفة تجريبية", "success")
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