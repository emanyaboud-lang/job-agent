from fastapi import APIRouter, HTTPException
from app.services.supabase_service import get_client
from datetime import datetime

router = APIRouter()

@router.get("")
async def list_contacts():
    r = get_client().table("recruiter_contacts").select("*").order("created_at", desc=True).execute()
    return r.data or []

@router.post("")
async def create_contact(body: dict):
    body["created_at"] = datetime.utcnow().isoformat()
    r = get_client().table("recruiter_contacts").insert(body).execute()
    return r.data[0] if r.data else body

@router.put("/{contact_id}")
async def update_contact(contact_id: str, body: dict):
    body.pop("id", None)
    body["updated_at"] = datetime.utcnow().isoformat()
    r = get_client().table("recruiter_contacts").update(body).eq("id", contact_id).execute()
    return r.data[0] if r.data else {}

@router.delete("/{contact_id}")
async def delete_contact(contact_id: str):
    get_client().table("recruiter_contacts").delete().eq("id", contact_id).execute()
    return {"success": True}
