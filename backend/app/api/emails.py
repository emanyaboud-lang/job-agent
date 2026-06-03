from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
from app.services.supabase_service import get_client, log_event
from app.services.gmail_service import send_email
from app.services.claude_service import summarize_email
from app.core.config import settings

router = APIRouter()

@router.get("")
async def list_emails(direction: Optional[str] = None, limit: int = 100):
    query = get_client().table("emails").select("*").order("sent_at", desc=True).limit(limit)
    if direction: query = query.eq("direction", direction)
    return (query.execute().data or [])

@router.get("/thread/{company_id}")
async def get_thread(company_id: str):
    r = get_client().table("emails").select("*").eq("company_id", company_id).order("sent_at").execute()
    return r.data or []

@router.post("/{email_id}/reply")
async def reply_to_email(email_id: str, body: dict):
    r = get_client().table("emails").select("*").eq("id", email_id).single().execute()
    if not r.data:
        raise HTTPException(404)
    original = r.data
    reply_body = body.get("body", "")

    try:
        send_email(to=original["from_email"], subject=f"Re: {original['subject']}", body=reply_body)
        get_client().table("emails").insert({
            "company_id": original["company_id"],
            "direction": "outgoing",
            "subject": f"Re: {original['subject']}",
            "body": reply_body,
            "from_email": settings.GMAIL_SENDER_EMAIL,
            "to_email": original["from_email"],
            "status": "sent",
            "sent_at": datetime.utcnow().isoformat(),
            "thread_id": original.get("thread_id") or email_id,
        }).execute()
        log_event("email_replied", f"تم الرد على بريد الشركة", "success")
        return {"success": True}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/compose")
async def compose_email(body: dict):
    try:
        send_email(to=body["to"], subject=body["subject"], body=body["body"])
        return {"success": True}
    except Exception as e:
        raise HTTPException(500, str(e))