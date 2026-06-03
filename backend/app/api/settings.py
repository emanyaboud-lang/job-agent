from fastapi import APIRouter
from app.services.supabase_service import get_settings, save_settings

router = APIRouter()

@router.get("")
async def get():
    return get_settings()

@router.put("")
async def update(data: dict):
    save_settings(data)
    return {"success": True}