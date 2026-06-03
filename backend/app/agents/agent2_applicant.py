"""Agent 2 — المقدّم: يرسل طلبات التقديم"""
import asyncio
import os
from datetime import datetime, timedelta
from typing import Optional
from app.services.supabase_service import get_client, log_event, get_settings
from app.services.claude_service import generate_letter
from app.services.gmail_service import send_email

CITY_LIMITS = {
    "madinah": 5, "jeddah": 10, "riyadh": 8, "yanbu": 3, "other": 5
}

async def apply_to_job(job_id: str) -> dict:
    """تقديم على وظيفة محددة"""
    try:
        job_r = get_client().table("jobs").select("*").eq("id", job_id).single().execute()
        if not job_r.data:
            return {"success": False, "error": "الوظيفة غير موجودة"}
        job = job_r.data

        settings_data = get_settings()
        limits = settings_data.get("daily_limits", CITY_LIMITS)
        city = job.get("city", "other")

        if not _check_daily_limit(city, limits.get(city, 5)):
            return {"success": False, "error": f"تجاوز الحد اليومي لـ {city}"}

        cv_text, cv_path = _get_primary_cv()
        template = _get_default_template(settings_data)

        letter = generate_letter(
            job_title=job.get("title", ""),
            company_name=job.get("company", ""),
            job_description=job.get("description", ""),
            city=city,
            template=template,
            cv_text=cv_text,
            language=settings_data.get("letter_language", "en"),
        )

        apply_email = job.get("apply_email", "")
        sent_ok = False
        error_msg = ""

        if apply_email:
            try:
                send_email(
                    to=apply_email,
                    subject=letter.get("subject", f"Application for {job['title']}"),
                    body=_build_body_with_signature(letter["body"], settings_data),
                    attachment_path=cv_path,
                )
                sent_ok = True
            except Exception as e:
                error_msg = str(e)
                log_event("email_send_failed", f"فشل الإرسال لـ {job['company']}: {e}", "error")
        elif job.get("apply_url"):
            try:
                sent_ok = await _apply_via_form(job["apply_url"], job, cv_path, letter["body"])
            except Exception as e:
                error_msg = str(e)

        status = "sent" if sent_ok else "failed"
        now = datetime.utcnow().isoformat()

        app_r = get_client().table("applications").insert({
            "job_id": job_id,
            "company_id": _get_or_create_company(job),
            "status": "sent" if sent_ok else "pending",
            "letter_text": letter["body"],
            "letter_subject": letter.get("subject", ""),
            "letter_language": settings_data.get("letter_language", "en"),
            "sent_at": now if sent_ok else None,
            "email_status": status if apply_email else None,
            "follow_up_count": 0,
            "next_followup_at": (datetime.utcnow() + timedelta(days=14)).isoformat() if sent_ok else None,
        }).execute()

        get_client().table("jobs").update({"status": "applied", "application_id": app_r.data[0]["id"]}).eq("id", job_id).execute()

        if apply_email:
            get_client().table("emails").insert({
                "company_id": _get_or_create_company(job),
                "application_id": app_r.data[0]["id"],
                "direction": "outgoing",
                "subject": letter.get("subject", ""),
                "body": letter["body"],
                "from_email": settings_data.get("sender_email", ""),
                "to_email": apply_email,
                "status": status,
                "sent_at": now,
            }).execute()

        log_event("application_sent" if sent_ok else "application_failed",
                  f"{'أُرسل طلب تقديم' if sent_ok else 'فشل الإرسال'} لـ {job['title']} في {job['company']}",
                  "success" if sent_ok else "error")

        return {"success": sent_ok, "application_id": app_r.data[0]["id"] if sent_ok else None, "error": error_msg}

    except Exception as e:
        log_event("apply_error", f"خطأ في التقديم: {e}", "error")
        return {"success": False, "error": str(e)}

def _check_daily_limit(city: str, limit: int) -> bool:
    today = datetime.utcnow().date().isoformat()
    try:
        r = get_client().table("applications").select("id", count="exact").gte("sent_at", today).execute()
        sent_today = r.count or 0
        city_r = get_client().table("applications").select("id", count="exact").gte("sent_at", today).execute()
        return sent_today < limit
    except Exception:
        return True

def _get_primary_cv():
    try:
        r = get_client().table("cv_files").select("*").eq("is_primary", True).limit(1).execute()
        if r.data:
            return r.data[0].get("extracted_text", ""), r.data[0].get("file_path", "")
    except Exception:
        pass
    # fallback CV text when Supabase not configured
    import os
    fallback_path = os.path.join(os.path.dirname(__file__), '..', '..', 'cv_iman.txt')
    try:
        with open(fallback_path, encoding='utf-8') as f:
            return f.read(), ""
    except Exception:
        pass
    return "", ""

def _get_default_template(settings_data: dict) -> str:
    try:
        r = get_client().table("letter_templates").select("*").eq("is_default", True).limit(1).execute()
        if r.data:
            return r.data[0].get("body", "")
    except Exception:
        pass
    return settings_data.get("default_template", "Dear {hiring_manager},\n\nI am applying for {job_title} at {company_name}.\n\nBest regards,\n{your_name}")

def _build_body_with_signature(body: str, settings_data: dict) -> str:
    sig = settings_data.get("email_signature", {})
    parts = [body, "\n\n---"]
    if sig.get("name"):    parts.append(sig["name"])
    if sig.get("title"):   parts.append(sig["title"])
    if sig.get("phone"):   parts.append(f"📱 {sig['phone']}")
    if sig.get("linkedin"):parts.append(f"LinkedIn: {sig['linkedin']}")
    if sig.get("email"):   parts.append(f"✉️ {sig['email']}")
    for cf in sig.get("custom_fields", []):
        if cf.get("label") and cf.get("value"):
            parts.append(f"{cf['label']}: {cf['value']}")
    return "\n".join(parts)

def _get_or_create_company(job: dict) -> str:
    try:
        r = get_client().table("companies").select("id").eq("name", job["company"]).limit(1).execute()
        if r.data:
            return r.data[0]["id"]
        ins = get_client().table("companies").insert({
            "name": job["company"],
            "city": job.get("city"),
            "applications_count": 0,
        }).execute()
        return ins.data[0]["id"]
    except Exception:
        return ""

async def _apply_via_form(url: str, job: dict, cv_path: str, letter_text: str) -> bool:
    """تعبئة نموذج التقديم عبر Playwright"""
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, timeout=30000)
            # محاولة ذكية لتعبئة النموذج
            for selector in ['input[type="email"]', 'input[name*="email"]']:
                try:
                    el = await page.query_selector(selector)
                    if el:
                        await el.fill("Eman.mm.aboud@outlook.com")
                        break
                except Exception:
                    pass
            if cv_path and os.path.exists(cv_path):
                for selector in ['input[type="file"]', 'input[name*="cv"]', 'input[name*="resume"]']:
                    try:
                        el = await page.query_selector(selector)
                        if el:
                            await el.set_input_files(cv_path)
                            break
                    except Exception:
                        pass
            for selector in ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Apply")']:
                try:
                    el = await page.query_selector(selector)
                    if el:
                        await el.click()
                        await page.wait_for_timeout(2000)
                        await browser.close()
                        return True
                except Exception:
                    pass
            await browser.close()
        return False
    except Exception as e:
        log_event("form_apply_error", f"خطأ في تعبئة النموذج: {e}", "error")
        return False