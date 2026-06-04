from fastapi import APIRouter, HTTPException
from app.services.supabase_service import get_client
from app.services.claude_service import get_claude, IMAN_PROFILE
import json, re
from datetime import datetime, timedelta

router = APIRouter()

# ── Salary Estimator ──────────────────────────────────────────
@router.post("/salary-estimate")
async def salary_estimate(body: dict):
    job_title = body.get("job_title", "")
    description = body.get("description", "")
    city = body.get("city", "")
    response = get_claude().messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        system=f"""أنت خبير رواتب في سوق العمل السعودي.
{IMAN_PROFILE}
أعد JSON بالشكل:
{{"min": رقم, "max": رقم, "currency": "SAR", "reasoning": "تبرير مختصر باللغة العربية"}}""",
        messages=[{"role": "user", "content": f"المسمى: {job_title}\nالمدينة: {city}\nالوصف: {description[:600]}\nقدّر الراتب الشهري:"}]
    )
    text = response.content[0].text
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        return json.loads(m.group())
    return {"min": 10000, "max": 20000, "currency": "SAR", "reasoning": "تقدير عام بناءً على السوق السعودي"}

# ── Company Research ──────────────────────────────────────────
@router.post("/company-research")
async def company_research(body: dict):
    company_name = body.get("company_name", "")
    job_title = body.get("job_title", "")
    response = get_claude().messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=800,
        system="""أنت محلل أعمال متخصص في السوق السعودي.
أعد JSON:
{"overview": "نظرة عامة", "culture": "ثقافة الشركة", "news": "آخر الأخبار", "tips": "نصائح للمقابلة"}""",
        messages=[{"role": "user", "content": f"ابحث عن شركة: {company_name}\nللوظيفة: {job_title}"}]
    )
    text = response.content[0].text
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        return json.loads(m.group())
    return {"overview": text[:200], "culture": "", "news": "", "tips": ""}

# ── CV Hints Per Job ──────────────────────────────────────────
@router.post("/cv-hints")
async def cv_hints(body: dict):
    job_id = body.get("job_id", "")
    cv_text = body.get("cv_text", "")

    job_row = None
    if job_id:
        r = get_client().table("jobs").select("title,description,requirements").eq("id", job_id).single().execute()
        job_row = r.data

    job_context = ""
    if job_row:
        job_context = f"الوظيفة: {job_row.get('title','')}\nالمتطلبات: {job_row.get('requirements','')[:500]}"

    response = get_claude().messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=600,
        system=f"""أنت خبير تحسين سير ذاتية.
{IMAN_PROFILE}
أعد JSON:
{{"hints": ["تلميح1", "تلميح2", ...], "score_before": رقم, "score_after": رقم}}""",
        messages=[{"role": "user", "content": f"{job_context}\nالـ CV:\n{cv_text[:1500]}\nاعطِ 5 تلميحات لتحسين التطابق:"}]
    )
    text = response.content[0].text
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        return json.loads(m.group())
    return {"hints": [text[:200]], "score_before": 70, "score_after": 85}

# ── Interview Simulator ───────────────────────────────────────
@router.post("/interview-simulate")
async def interview_simulate(body: dict):
    question = body.get("question", "")
    answer = body.get("answer", "")
    job_title = body.get("job_title", "")
    response = get_claude().messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=600,
        system=f"""أنت محاور وظائف محترف.
{IMAN_PROFILE}
قيّم إجابة إيمان وأعد JSON:
{{"feedback": "تغذية راجعة مفصلة", "score": رقم_من_10, "better_answer": "إجابة مقترحة أفضل"}}""",
        messages=[{"role": "user", "content": f"الوظيفة: {job_title}\nالسؤال: {question}\nالإجابة: {answer}\nقيّم:"}]
    )
    text = response.content[0].text
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        return json.loads(m.group())
    return {"feedback": text[:300], "score": 7, "better_answer": ""}

# ── Interview Questions ───────────────────────────────────────
@router.get("/interview-questions/{job_id}")
async def interview_questions(job_id: str):
    r = get_client().table("jobs").select("title,description,requirements").eq("id", job_id).single().execute()
    if not r.data:
        raise HTTPException(404, "الوظيفة غير موجودة")
    job = r.data
    response = get_claude().messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        system=f"""أنت خبير مقابلات.
{IMAN_PROFILE}
أعد JSON: {{"questions": [{{"question": "سؤال", "category": "فئة", "tip": "نصيحة"}}]}}""",
        messages=[{"role": "user", "content": f"الوظيفة: {job['title']}\nالمتطلبات: {job.get('requirements','')[:400]}\nولّد 10 أسئلة مقابلة متوقعة:"}]
    )
    text = response.content[0].text
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        return json.loads(m.group())
    return {"questions": []}

# ── Weekly Report ─────────────────────────────────────────────
@router.get("/weekly-report")
async def weekly_report():
    now = datetime.utcnow()
    week_ago = (now - timedelta(days=7)).isoformat()
    sb = get_client()

    apps_r = sb.table("applications").select("status,sent_at").gte("sent_at", week_ago).execute()
    apps = apps_r.data or []

    jobs_r = sb.table("jobs").select("status,discovered_at,match_score").gte("discovered_at", week_ago).execute()
    jobs = jobs_r.data or []

    total_apps = len(apps)
    sent = sum(1 for a in apps if a["status"] == "sent")
    interviews = sum(1 for a in apps if a["status"] == "interview")
    offers = sum(1 for a in apps if a["status"] == "offer")
    rejected = sum(1 for a in apps if a["status"] == "rejected")
    response_rate = round((interviews + offers) / total_apps * 100, 1) if total_apps > 0 else 0

    jobs_found = len(jobs)
    avg_score = round(sum(j.get("match_score", 0) for j in jobs) / len(jobs), 1) if jobs else 0

    # Daily breakdown (last 7 days)
    daily = {}
    for i in range(7):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        daily[day] = {"sent": 0, "found": 0}
    for a in apps:
        d = (a.get("sent_at") or "")[:10]
        if d in daily:
            daily[d]["sent"] += 1
    for j in jobs:
        d = (j.get("discovered_at") or "")[:10]
        if d in daily:
            daily[d]["found"] += 1

    daily_list = [{"date": k, **v} for k, v in sorted(daily.items())]

    return {
        "period": f"{week_ago[:10]} - {now.strftime('%Y-%m-%d')}",
        "jobs_found": jobs_found,
        "applications_sent": total_apps,
        "responses": interviews + offers,
        "interviews": interviews,
        "offers": offers,
        "rejected": rejected,
        "response_rate": response_rate,
        "avg_match_score": avg_score,
        "daily": daily_list,
    }

# ── PDF Export (simple HTML→text) ────────────────────────────
@router.post("/export-pdf")
async def export_pdf():
    data = await weekly_report()
    return {"message": "تم تجهيز بيانات التقرير", "data": data}
