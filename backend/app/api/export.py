from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse
from app.services.supabase_service import get_client
import openpyxl, csv, io, json
from datetime import datetime

router = APIRouter()

@router.get("/excel")
async def export_excel():
    apps = get_client().table("applications").select("*, jobs(title, company, city, platform)").execute().data or []
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "التقديمات"
    ws.append(["المسمى", "الشركة", "المدينة", "المنصة", "الحالة", "تاريخ الإرسال", "نص الرسالة"])
    for a in apps:
        job = a.get("jobs") or {}
        ws.append([job.get("title",""), job.get("company",""), job.get("city",""), job.get("platform",""), a.get("status",""), a.get("sent_at",""), a.get("letter_text","")[:200]])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=job_agents_{datetime.now().strftime('%Y%m%d')}.xlsx"})

@router.get("/csv")
async def export_csv():
    apps = get_client().table("applications").select("*, jobs(title, company, city, platform)").execute().data or []
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["المسمى", "الشركة", "المدينة", "المنصة", "الحالة", "تاريخ الإرسال"])
    for a in apps:
        job = a.get("jobs") or {}
        writer.writerow([job.get("title",""), job.get("company",""), job.get("city",""), job.get("platform",""), a.get("status",""), a.get("sent_at","")])
    buf.seek(0)
    return StreamingResponse(io.BytesIO(buf.getvalue().encode("utf-8-sig")), media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=job_agents_{datetime.now().strftime('%Y%m%d')}.csv"})

@router.get("/backup")
async def backup():
    sb = get_client()
    jobs = sb.table("jobs").select("*").execute().data or []
    apps = sb.table("applications").select("*").execute().data or []
    contacts = sb.table("contacts").select("*").execute().data or []
    cv_files = sb.table("cv_files").select("id,version_name,file_name,uploaded_at,is_primary").execute().data or []
    data = {
        "exported_at": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "jobs": jobs,
        "applications": apps,
        "contacts": contacts,
        "cv_files": cv_files,
    }
    content = json.dumps(data, ensure_ascii=False, indent=2)
    buf = io.BytesIO(content.encode("utf-8"))
    buf.seek(0)
    filename = f"job_agents_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    return StreamingResponse(buf, media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"})