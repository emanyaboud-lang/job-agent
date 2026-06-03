from fastapi import APIRouter, HTTPException
from app.services.supabase_service import get_client, log_event
from app.services.claude_service import generate_interview_prep
from datetime import datetime

router = APIRouter()

@router.post("/{app_id}")
async def generate(app_id: str):
    r = get_client().table("applications").select("*, jobs(*)").eq("id", app_id).single().execute()
    if not r.data:
        raise HTTPException(404)
    app = r.data
    job = app.get("jobs") or {}

    cv_r = get_client().table("cv_files").select("extracted_text").eq("is_primary", True).limit(1).execute()
    cv_text = cv_r.data[0].get("extracted_text", "") if cv_r.data else ""

    prep = generate_interview_prep(
        job_title=job.get("title", ""),
        company_name=job.get("company", ""),
        job_description=job.get("description", ""),
        cv_text=cv_text,
    )
    prep["job_title"] = job.get("title", "")
    prep["company"] = job.get("company", "")
    prep["generated_at"] = datetime.utcnow().isoformat()

    try:
        get_client().table("interview_preps").upsert({"application_id": app_id, "data": prep}).execute()
    except Exception:
        pass

    log_event("interview_prep_generated", f"تم توليد أسئلة المقابلة لـ {job.get('title','')} في {job.get('company','')}", "success")
    return prep

@router.get("/{app_id}")
async def get_prep(app_id: str):
    try:
        r = get_client().table("interview_preps").select("data").eq("application_id", app_id).single().execute()
        if r.data:
            return r.data["data"]
    except Exception:
        pass
    raise HTTPException(404, "لم يتم توليد تحضير المقابلة بعد")