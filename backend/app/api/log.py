from fastapi import APIRouter
from typing import Optional
from app.services.supabase_service import get_client

router = APIRouter()

@router.get("")
async def list_log(status: Optional[str] = None, limit: int = 200):
    query = get_client().table("event_log").select("*").order("created_at", desc=True).limit(limit)
    if status: query = query.eq("status", status)
    return (query.execute().data or [])