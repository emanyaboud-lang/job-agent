from fastapi import APIRouter, HTTPException
from app.services.supabase_service import get_client

router = APIRouter()

@router.get("")
async def list_companies():
    r = get_client().table("companies").select("*").order("name").execute()
    return r.data or []

@router.get("/{company_id}")
async def get_company(company_id: str):
    r = get_client().table("companies").select("*").eq("id", company_id).single().execute()
    if not r.data:
        raise HTTPException(404, "الشركة غير موجودة")
    return r.data