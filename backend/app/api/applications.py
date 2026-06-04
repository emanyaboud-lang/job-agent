from fastapi import APIRouter, HTTPException
from typing import Optional
from app.services.supabase_service import get_client, log_event
from app.agents.agent2_applicant import apply_to_job

router = APIRouter()

@router.get("")
async def list_applications(status: Optional[str] = None, company_id: Optional[str] = None, limit: int = 100):
    query = get_client().table("applications").select("*, jobs(*)").order("sent_at", desc=True).limit(limit)
    if status:     query = query.eq("status", status)
    if company_id: query = query.eq("company_id", company_id)
    r = query.execute()
    apps = r.data or []
    for a in apps:
        if "jobs" in a:
            a["job"] = a.pop("jobs")
    return apps

@router.get("/{app_id}")
async def get_application(app_id: str):
    r = get_client().table("applications").select("*, jobs(*)").eq("id", app_id).single().execute()
    if not r.data:
        raise HTTPException(404, "التقديم غير موجود")
    a = r.data
    if "jobs" in a:
        a["job"] = a.pop("jobs")
    return a

@router.post("/{app_id}/resend")
async def resend_application(app_id: str):
    r = get_client().table("applications").select("job_id").eq("id", app_id).single().execute()
    if not r.data:
        raise HTTPException(404)
    result = await apply_to_job(r.data["job_id"])
    log_event("application_resent", f"إعادة إرسال تقديم {app_id}", "info")
    return result

@router.patch("/{app_id}")
async def update_application(app_id: str, body: dict):
    get_client().table("applications").update(body).eq("id", app_id).execute()
    return {"success": True}

@router.patch("/{app_id}/stage")
async def update_stage(app_id: str, body: dict):
    stage = body.get("stage")
    allowed = ["sent", "viewed", "reply", "interview", "offer", "rejected"]
    if stage not in allowed:
        raise HTTPException(400, f"المرحلة يجب أن تكون إحدى: {allowed}")
    get_client().table("applications").update({"stage": stage}).eq("id", app_id).execute()
    return {"success": True, "stage": stage}

@router.patch("/{app_id}/rejection-reason")
async def set_rejection_reason(app_id: str, body: dict):
    get_client().table("applications").update({"rejection_reason": body.get("reason", "")}).eq("id", app_id).execute()
    return {"success": True}

@router.patch("/{app_id}/interview-date")
async def set_interview_date(app_id: str, body: dict):
    get_client().table("applications").update({"interview_date": body.get("interview_date")}).eq("id", app_id).execute()
    return {"success": True}