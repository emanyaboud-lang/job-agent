from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.core.config import settings
from app.core.scheduler import start_scheduler, shutdown_scheduler
from app.api import jobs, applications, cv, emails, agents, stats, notifications, chat, export, companies, log, interview
from app.api import settings as settings_api

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()

app = FastAPI(
    title="Job Agents API",
    description="نظام أتمتة البحث عن وظائف والتقديم عليها",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router,           prefix="/api/jobs",          tags=["Jobs"])
app.include_router(applications.router,   prefix="/api/applications",   tags=["Applications"])
app.include_router(cv.router,             prefix="/api/cv",             tags=["CV"])
app.include_router(emails.router,         prefix="/api/emails",         tags=["Emails"])
app.include_router(agents.router,         prefix="/api/agents",         tags=["Agents"])
app.include_router(settings_api.router,   prefix="/api/settings",       tags=["Settings"])
app.include_router(stats.router,          prefix="/api/stats",          tags=["Stats"])
app.include_router(notifications.router,  prefix="/api/notifications",  tags=["Notifications"])
app.include_router(chat.router,           prefix="/api/chat",           tags=["Chat"])
app.include_router(export.router,         prefix="/api/export",         tags=["Export"])
app.include_router(companies.router,      prefix="/api/companies",      tags=["Companies"])
app.include_router(log.router,            prefix="/api/log",            tags=["Log"])
app.include_router(interview.router,      prefix="/api/interview-prep", tags=["Interview"])

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/api/health/full")
async def health_full():
    import time
    results = {}

    # Backend
    results["backend"] = {"ok": True, "detail": "يعمل", "version": "1.0.0"}

    # Supabase
    try:
        from app.services.supabase_service import get_client
        t0 = time.time()
        get_client().table("settings").select("id").limit(1).execute()
        ms = round((time.time() - t0) * 1000)
        results["supabase"] = {"ok": True, "detail": f"متصلة ({ms}ms)"}
    except Exception as e:
        results["supabase"] = {"ok": False, "detail": str(e)[:80]}

    # Gmail
    try:
        from app.services.gmail_service import check_connection
        results["gmail"] = check_connection()
    except Exception as e:
        results["gmail"] = {"ok": False, "detail": str(e)[:80]}

    # Anthropic
    try:
        from app.core.config import settings as cfg
        if not cfg.ANTHROPIC_API_KEY:
            results["anthropic"] = {"ok": False, "detail": "ANTHROPIC_API_KEY غير مضبوط"}
        else:
            import anthropic
            client = anthropic.Anthropic(api_key=cfg.ANTHROPIC_API_KEY)
            client.messages.create(model="claude-haiku-4-5-20251001", max_tokens=5,
                messages=[{"role":"user","content":"hi"}])
            results["anthropic"] = {"ok": True, "detail": "Claude متصل"}
    except Exception as e:
        results["anthropic"] = {"ok": False, "detail": str(e)[:80]}

    # Apify
    try:
        from app.core.config import settings as cfg
        if not cfg.APIFY_TOKEN:
            results["apify"] = {"ok": False, "detail": "APIFY_TOKEN غير مضبوط"}
        else:
            import httpx
            r = httpx.get("https://api.apify.com/v2/users/me",
                headers={"Authorization": f"Bearer {cfg.APIFY_TOKEN}"}, timeout=8)
            if r.status_code == 200:
                results["apify"] = {"ok": True, "detail": f"متصل ({r.json().get('username','')})"}
            else:
                results["apify"] = {"ok": False, "detail": f"HTTP {r.status_code}"}
    except Exception as e:
        results["apify"] = {"ok": False, "detail": str(e)[:80]}

    overall = all(v["ok"] for v in results.values())
    return {"ok": overall, "services": results}
