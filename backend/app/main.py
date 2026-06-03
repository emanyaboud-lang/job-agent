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
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
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
