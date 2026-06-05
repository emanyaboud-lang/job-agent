"""Agent 2 — المقدّم: يرسل طلبات التقديم"""
import os
from datetime import datetime, timedelta
from typing import Optional
from app.services.supabase_service import get_client, log_event, get_settings
from app.services.claude_service import generate_letter
from app.services.gmail_service import send_email, send_application_confirmation
from app.core.config import settings as app_settings

CITY_LIMITS = {
    "madinah": 5, "jeddah": 10, "riyadh": 8, "yanbu": 3, "other": 5
}

async def apply_to_job(job_id: str) -> dict:
    """تقديم على وظيفة محددة — دائماً يُنشئ سجل تقديم"""
    try:
        job_r = get_client().table("jobs").select("*").eq("id", job_id).single().execute()
        if not job_r.data:
            return {"success": False, "error": "الوظيفة غير موجودة"}
        job = job_r.data

        settings_data = get_settings()
        limits = settings_data.get("daily_limits", CITY_LIMITS)
        city = job.get("city", "other")
        if not _check_daily_limit(city, limits.get(city, CITY_LIMITS.get(city, 5))):
            return {"success": False, "error": f"تم الوصول للحد اليومي للتقديمات في {city}"}

        cv_text, cv_path = _get_primary_cv()
        template = _get_default_template(settings_data)

        # توليد الرسالة — مع fallback إذا فشل Claude
        try:
            letter = generate_letter(
                job_title=job.get("title", ""),
                company_name=job.get("company", ""),
                job_description=job.get("description", ""),
                city=job.get("city", "other"),
                template=template,
                cv_text=cv_text,
                language=settings_data.get("letter_language", "en"),
            )
        except Exception as e:
            log_event("letter_gen_error", f"خطأ توليد الرسالة: {e}", "warning")
            letter = {
                "subject": f"Application for {job.get('title', 'Position')} – Eman AlAboud | PMP·PBA",
                "body": template
                    .replace("{job_title}", job.get("title", ""))
                    .replace("{company_name}", job.get("company", ""))
                    .replace("{hiring_manager}", "Hiring Manager")
                    .replace("{relevant_skills}", "project management, smart city, PMP/PBA")
                    .replace("{years_exp}", "10+"),
            }

        apply_email = job.get("apply_email", "")
        apply_url = job.get("apply_url", "")
        sent_ok = False
        send_method = "none"
        error_msg = ""

        if apply_email:
            try:
                send_email(
                    to=apply_email,
                    subject=letter.get("subject", f"Application for {job['title']}"),
                    body=_build_body_with_signature(letter["body"], settings_data),
                    attachment_path=cv_path if cv_path and os.path.exists(cv_path) else None,
                )
                sent_ok = True
                send_method = "email"
            except Exception as e:
                error_msg = str(e)
                log_event("email_send_failed", f"فشل الإرسال لـ {job['company']}: {e}", "error")
        elif apply_url:
            # لا نستخدم Playwright — نوجّه المستخدمة لتتقدم يدوياً
            send_method = "manual_url"
            sent_ok = False
            error_msg = "يتطلب تقديماً يدوياً عبر الرابط"

        # ── إنشاء سجل التقديم دائماً ──
        now = datetime.utcnow().isoformat()
        company_id = _get_or_create_company(job)

        app_status = "sent" if sent_ok else ("pending" if send_method == "manual_url" else "failed")

        app_r = get_client().table("applications").insert({
            "job_id": job_id,
            "company_id": company_id,
            "status": app_status,
            "letter_text": letter["body"],
            "letter_subject": letter.get("subject", ""),
            "letter_language": settings_data.get("letter_language", "en"),
            "sent_at": now if sent_ok else None,
            "email_status": ("sent" if sent_ok else "failed") if apply_email else None,
            "follow_up_count": 0,
            "next_followup_at": (datetime.utcnow() + timedelta(days=14)).isoformat() if sent_ok else None,
            "notes": error_msg[:200] if error_msg else None,
        }).execute()

        app_id = app_r.data[0]["id"] if app_r.data else None

        get_client().table("jobs").update({
            "status": "applied",
            "application_id": app_id,
        }).eq("id", job_id).execute()

        if apply_email and sent_ok:
            get_client().table("emails").insert({
                "company_id": company_id,
                "application_id": app_id,
                "direction": "outgoing",
                "subject": letter.get("subject", ""),
                "body": letter["body"],
                "from_email": settings_data.get("sender_email", ""),
                "to_email": apply_email,
                "status": "sent",
                "sent_at": now,
            }).execute()

        # ── إرسال إيميل تأكيد للمستخدمة دائماً ──
        try:
            salary_note = _extract_salary(job)
            user_email = app_settings.GMAIL_SENDER_EMAIL or "emanyaboud@gmail.com"
            send_application_confirmation(
                user_email=user_email,
                job=job,
                letter_body=letter["body"],
                cv_text=cv_text,
                sent_ok=sent_ok,
                send_method=send_method,
                salary_note=salary_note,
            )
        except Exception as e:
            log_event("confirm_email_error", f"خطأ إيميل التأكيد: {e}", "warning")

        log_event(
            "application_sent" if sent_ok else "application_queued",
            f"{'أُرسل' if sent_ok else 'قُيِّد'} طلب تقديم لـ {job['title']} في {job['company']}",
            "success" if sent_ok else "info",
        )

        return {
            "success": True,
            "application_id": app_id,
            "sent": sent_ok,
            "method": send_method,
            "error": error_msg,
        }

    except Exception as e:
        log_event("apply_error", f"خطأ في التقديم: {e}", "error")
        return {"success": False, "error": str(e)}


def _extract_salary(job: dict) -> str:
    """استخراج تقدير الراتب من بيانات الوظيفة"""
    notes = job.get("notes", "") or ""
    if "ريال" in notes or "SAR" in notes or "راتب" in notes:
        return notes
    # توقع الراتب بناءً على المسمى والمدينة
    title = (job.get("title", "") or "").lower()
    city = job.get("city", "other")
    base = 12000
    if "مدير" in title or "manager" in title:
        base = 15000
    if "أول" in title or "senior" in title:
        base += 3000
    if city == "riyadh":
        base = int(base * 1.1)
    return f"الراتب المتوقع: {base:,} – {int(base * 1.4):,} ريال شهرياً"


def _check_daily_limit(city: str, limit: int) -> bool:
    today = datetime.utcnow().date().isoformat()
    try:
        r = get_client().table("applications").select("id", count="exact").gte("sent_at", today).execute()
        sent_today = r.count or 0
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
    fallback_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'cv_iman.txt')
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
    return settings_data.get(
        "default_template",
        "Dear {hiring_manager},\n\nI am applying for {job_title} at {company_name}.\n\nBest regards,\nEman AlAboud | PMP · PBA"
    )


def _build_body_with_signature(body: str, settings_data: dict) -> str:
    sig = settings_data.get("email_signature", {})
    parts = [body, "\n\n---"]
    if sig.get("name"):     parts.append(sig["name"])
    if sig.get("title"):    parts.append(sig["title"])
    if sig.get("phone"):    parts.append(f"📱 {sig['phone']}")
    if sig.get("linkedin"): parts.append(f"LinkedIn: {sig['linkedin']}")
    if sig.get("email"):    parts.append(f"✉️ {sig['email']}")
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
