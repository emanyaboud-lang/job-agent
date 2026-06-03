from fastapi import APIRouter
from app.services.claude_service import chat_with_context
from app.services.supabase_service import get_client

router = APIRouter()

@router.post("")
async def chat(body: dict):
    message = body.get("message", "")
    history = body.get("history", [])

    # جمع سياق البيانات
    context_parts = []
    try:
        stats_r = get_client().table("applications").select("status", count="exact").execute()
        total = stats_r.count or 0
        context_parts.append(f"إجمالي التقديمات: {total}")
    except Exception:
        pass
    try:
        jobs_r = get_client().table("jobs").select("id", count="exact").eq("status", "pending").execute()
        pending = jobs_r.count or 0
        context_parts.append(f"وظائف تنتظر الموافقة: {pending}")
    except Exception:
        pass

    context = "\nبيانات النظام الحالية:\n" + "\n".join(context_parts) if context_parts else ""
    reply = chat_with_context(message, history, context)
    return {"reply": reply}

@router.get("/sessions")
async def get_sessions():
    return []

@router.delete("/history")
async def clear_history():
    return {"success": True}