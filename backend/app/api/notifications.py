from fastapi import APIRouter
from app.services.supabase_service import get_client

router = APIRouter()

@router.get("")
async def list_notifications():
    r = get_client().table("notifications").select("*").order("created_at", desc=True).limit(50).execute()
    return r.data or []

@router.patch("/{notif_id}")
async def update_notification(notif_id: str, body: dict):
    get_client().table("notifications").update(body).eq("id", notif_id).execute()
    return {"success": True}

@router.post("/mark-all-read")
async def mark_all_read():
    get_client().table("notifications").update({"is_read": True}).eq("is_read", False).execute()
    return {"success": True}