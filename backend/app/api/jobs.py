from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.services.supabase_service import get_client, log_event
from app.agents.agent2_applicant import apply_to_job
import asyncio

router = APIRouter()

@router.get("")
async def list_jobs(
    status: Optional[str] = None,
    city: Optional[str] = None,
    platform: Optional[str] = None,
    min_score: Optional[int] = None,
    limit: int = 100,
    q: Optional[str] = None,
):
    query = get_client().table("jobs").select("*").order("discovered_at", desc=True).limit(limit)
    if status: query = query.eq("status", status)
    if city:   query = query.eq("city", city)
    if platform: query = query.eq("platform", platform)
    if min_score: query = query.gte("match_score", min_score)
    if q: query = query.ilike("title", f"%{q}%")
    r = query.execute()
    return r.data or []

@router.post("/{job_id}/approve")
async def approve_job(job_id: str):
    get_client().table("jobs").update({"status": "approved"}).eq("id", job_id).execute()
    result = await apply_to_job(job_id)
    log_event("job_approved", f"تمت الموافقة على وظيفة {job_id}", "success")
    return result

@router.post("/{job_id}/reject")
async def reject_job(job_id: str):
    get_client().table("jobs").update({"status": "rejected"}).eq("id", job_id).execute()
    log_event("job_rejected", f"تم رفض وظيفة {job_id}", "info")
    return {"success": True}

@router.post("/{job_id}/restore")
async def restore_job(job_id: str):
    get_client().table("jobs").update({"status": "pending"}).eq("id", job_id).execute()
    return {"success": True}

@router.post("/approve-all")
async def approve_all():
    r = get_client().table("jobs").select("id").eq("status", "pending").execute()
    ids = [j["id"] for j in (r.data or [])]
    results = []
    for job_id in ids:
        get_client().table("jobs").update({"status": "approved"}).eq("id", job_id).execute()
        res = await apply_to_job(job_id)
        results.append(res)
    log_event("approve_all", f"تمت الموافقة على {len(ids)} وظيفة", "success")
    return {"approved": len(ids), "results": results}

@router.post("/manual")
async def add_manual_job(data: dict):
    data["status"] = "pending"
    data["platform"] = "manual"
    data["match_score"] = data.get("match_score", 80)
    from datetime import datetime
    data["discovered_at"] = datetime.utcnow().isoformat()
    r = get_client().table("jobs").insert(data).execute()
    return r.data[0] if r.data else {}

@router.get("/{job_id}/match-score")
async def get_match_score(job_id: str):
    r = get_client().table("jobs").select("match_score").eq("id", job_id).single().execute()
    return {"score": r.data.get("match_score", 0) if r.data else 0}

@router.get("/{job_id}/company-card")
async def get_company_card(job_id: str):
    r = get_client().table("jobs").select("*").eq("id", job_id).single().execute()
    if not r.data:
        raise HTTPException(404, "الوظيفة غير موجودة")
    job = r.data
    from app.services.claude_service import chat_with_context
    info = chat_with_context(
        f"أعطيني معلومات مختصرة عن شركة {job['company']} في السعودية: نوع الشركة، حجمها، أبرز مشاريعها، وتوجهاتها في التوظيف. 3-4 جمل فقط.",
        [], ""
    )
    return {"company": job["company"], "info": info}