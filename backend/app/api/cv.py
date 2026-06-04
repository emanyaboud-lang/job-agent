from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
import os, shutil, uuid
from datetime import datetime
from app.services.supabase_service import get_client, log_event
from app.services.cv_parser import extract_text
from app.services.claude_service import analyze_cv, cv_chat, analyze_skill_gap

router = APIRouter()
UPLOAD_DIR = "/tmp/cv_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _analyze_in_background(cv_id: str, text: str):
    try:
        analysis = analyze_cv(text)
        get_client().table("cv_files").update({"analysis": analysis}).eq("id", cv_id).execute()
        log_event("cv_analyzed", f"تم تحليل CV بنجاح", "success")
    except Exception as e:
        log_event("cv_analyze_error", f"خطأ في التحليل: {e}", "error")

@router.get("")
async def list_cvs():
    r = get_client().table("cv_files").select("*").order("uploaded_at", desc=True).execute()
    return r.data or []

@router.post("/upload")
async def upload_cv(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "لم يتم اختيار ملف")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"):
        raise HTTPException(400, "صيغة الملف غير مدعومة. استخدمي PDF أو Word")

    uid = str(uuid.uuid4())
    path = f"{UPLOAD_DIR}/{uid}{ext}"

    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)

    try:
        text = extract_text(path)
    except Exception as e:
        text = ""
        log_event("cv_parse_error", f"خطأ في قراءة الملف: {e}", "error")

    get_client().table("cv_files").update({"is_primary": False}).eq("is_primary", True).execute()

    r = get_client().table("cv_files").insert({
        "version_name": file.filename,
        "language": "ar" if any(c in text for c in "أبتثج") else "en",
        "file_url": path,
        "file_name": file.filename,
        "file_path": path,
        "extracted_text": text,
        "uploaded_at": datetime.utcnow().isoformat(),
        "is_primary": True,
        "analysis": {},
    }).execute()

    if not r.data:
        raise HTTPException(500, "فشل حفظ الـ CV في قاعدة البيانات")

    cv_id = r.data[0]["id"]
    background_tasks.add_task(_analyze_in_background, cv_id, text)

    log_event("cv_uploaded", f"تم رفع CV: {file.filename}", "success")
    return r.data[0]

@router.post("/{cv_id}/primary")
async def set_primary(cv_id: str):
    get_client().table("cv_files").update({"is_primary": False}).eq("is_primary", True).execute()
    get_client().table("cv_files").update({"is_primary": True}).eq("id", cv_id).execute()
    return {"success": True}

@router.post("/{cv_id}/analyze")
async def re_analyze(cv_id: str):
    r = get_client().table("cv_files").select("*").eq("id", cv_id).single().execute()
    if not r.data:
        raise HTTPException(404, "CV غير موجود")
    text = r.data.get("extracted_text", "")
    analysis = analyze_cv(text)
    get_client().table("cv_files").update({"analysis": analysis}).eq("id", cv_id).execute()
    return analysis

@router.delete("/{cv_id}")
async def delete_cv(cv_id: str):
    r = get_client().table("cv_files").select("file_path").eq("id", cv_id).single().execute()
    if r.data and os.path.exists(r.data.get("file_path", "")):
        os.remove(r.data["file_path"])
    get_client().table("cv_files").delete().eq("id", cv_id).execute()
    return {"success": True}

@router.post("/chat")
async def cv_chat_endpoint(body: dict):
    message = body.get("message", "")
    history = body.get("history", [])
    r = get_client().table("cv_files").select("extracted_text").eq("is_primary", True).limit(1).execute()
    cv_text = r.data[0].get("extracted_text", "") if r.data else ""
    reply = cv_chat(message, history, cv_text)
    return {"reply": reply}

@router.get("/skill-gap")
async def skill_gap():
    r = get_client().table("cv_files").select("extracted_text").eq("is_primary", True).limit(1).execute()
    cv_text = r.data[0].get("extracted_text", "") if r.data else ""
    return analyze_skill_gap(cv_text)