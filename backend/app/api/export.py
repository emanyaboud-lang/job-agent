from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.supabase_service import get_client
import openpyxl, csv, io
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