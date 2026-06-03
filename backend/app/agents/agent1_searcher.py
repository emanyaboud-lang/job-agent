"""Agent 1 — الباحث: يبحث عن وظائف ويقيّم تطابقها"""
import asyncio
from datetime import datetime
from typing import List, Dict
from app.services.supabase_service import get_client, log_event, get_settings
from app.services.claude_service import match_job
from app.scrapers.taqat import scrape_taqat
from app.scrapers.jadarat import scrape_jadarat
from app.scrapers.linkedin import scrape_linkedin
from app.scrapers.bayt import scrape_bayt
from app.scrapers.indeed import scrape_indeed

CV_KEYWORDS = [
    "project manager", "business analyst", "PMP", "مدير مشاريع",
    "محلل أعمال", "smart city", "مدن ذكية", "إدارة مشاريع",
    "program manager", "PMO", "contract manager"
]

VISION2030_COMPANIES = [
    "neom", "roshn", "kafd", "alula", "the line", "diriyah",
    "هيئة تطوير", "أمانة", "وزارة", "هيئة الملكية",
]

async def run_search() -> int:
    log_event("agent1_search_start", "بدء Agent 1 في البحث عن وظائف", "info")
    settings_data = get_settings()
    platforms = settings_data.get("platforms", {"taqat": True, "jadarat": True, "linkedin": True, "bayt": True, "indeed": True})
    min_score = settings_data.get("min_match_score", 70)
    cv_text = _get_primary_cv_text()
    all_raw: List[Dict] = []

    if platforms.get("taqat", True):
        try:
            jobs = await scrape_taqat(CV_KEYWORDS)
            all_raw.extend(jobs)
            log_event("scraper_taqat", f"طاقات: {len(jobs)} وظيفة", "success")
        except Exception as e:
            log_event("scraper_taqat", f"خطأ: {e}", "error")

    if platforms.get("jadarat", True):
        try:
            jobs = await scrape_jadarat(CV_KEYWORDS)
            all_raw.extend(jobs)
            log_event("scraper_jadarat", f"جدارات: {len(jobs)} وظيفة", "success")
        except Exception as e:
            log_event("scraper_jadarat", f"خطأ: {e}", "error")

    for platform, scraper in [("linkedin", scrape_linkedin), ("bayt", scrape_bayt), ("indeed", scrape_indeed)]:
        if platforms.get(platform, True):
            try:
                jobs = scraper(CV_KEYWORDS)
                all_raw.extend(jobs)
                log_event(f"scraper_{platform}", f"{platform}: {len(jobs)} وظيفة", "success")
            except Exception as e:
                log_event(f"scraper_{platform}", f"خطأ: {e}", "error")

    filtered = _deduplicate(all_raw)
    added = 0
    for job in filtered:
        try:
            score = match_job(cv_text, job["title"], job.get("description", ""), job.get("requirements", ""))
            if score < min_score:
                continue
            is_v2030 = any(k.lower() in (job.get("company", "") + job.get("title", "")).lower() for k in VISION2030_COMPANIES)
            get_client().table("jobs").insert({**job, "match_score": score, "status": "pending", "is_vision2030": is_v2030, "discovered_at": datetime.utcnow().isoformat()}).execute()
            added += 1
        except Exception:
            continue

    try:
        get_client().table("agent_status").upsert({"agent_id": "agent1", "last_run": datetime.utcnow().isoformat(), "jobs_found_today": added}).execute()
    except Exception:
        pass

    log_event("agent1_search_done", f"اكتمل البحث: {added} وظيفة جديدة", "success", {"added": added})
    return added

def _get_primary_cv_text() -> str:
    try:
        r = get_client().table("cv_files").select("*").eq("is_primary", True).limit(1).execute()
        if r.data:
            return r.data[0].get("extracted_text", "") or ""
    except Exception:
        pass
    return """Eman AlAboud - Project Manager PMP PBA
Experience: 3+ years at Madinah Authority Development - smart city projects (intelligent parking, street lighting, transportation systems)
7 years event management at Saudi Mall Foundation (15 events, teams of 12)
Certifications: PMP 2023, PBA 2024
Education: BSc Mathematics Statistics Taibah University, Executive Master Special Education
Skills: Smart City PM, Business Analysis, Contract Management, Microsoft Project, Power BI, Excel, Trello, Jira
Languages: Arabic (native), English (very good)
Target cities: Madinah, Jeddah, Riyadh, Yanbu"""

def _deduplicate(jobs: List[Dict]) -> List[Dict]:
    seen: set = set()
    existing: set = set()
    try:
        r = get_client().table("jobs").select("title, company").execute()
        for j in (r.data or []):
            existing.add(f"{j['title'].lower()}_{j['company'].lower()}")
    except Exception:
        pass
    result = []
    for job in jobs:
        key = f"{job.get('title', '').lower()}_{job.get('company', '').lower()}"
        if key not in seen and key not in existing and job.get("title"):
            seen.add(key)
            result.append(job)
    return result