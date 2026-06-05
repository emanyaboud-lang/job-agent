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
        model="claude-haiku-4-5",
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
        model="claude-haiku-4-5",
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
        model="claude-haiku-4-5",
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
        model="claude-haiku-4-5",
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
        model="claude-haiku-4-5",
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

# ── PDF Export — returns weekly report as downloadable JSON ──
@router.get("/export-pdf")
async def export_pdf():
    from fastapi.responses import JSONResponse
    from datetime import datetime
    data = await weekly_report()
    return JSONResponse(content={"report": data, "generated_at": datetime.utcnow().isoformat()})

# ── Feature 1: AI Job Summary ─────────────────────────────────
@router.post("/job-summary")
async def job_summary(body: dict):
    title = body.get("title", "")
    description = body.get("description", "")
    response = get_claude().messages.create(
        model="claude-haiku-4-5",
        max_tokens=100,
        system="أنت مساعد توظيف. اكتب ملخصاً واحداً مختصراً بالعربية لا يتجاوز 15 كلمة للوظيفة التالية.",
        messages=[{"role": "user", "content": f"المسمى: {title}\nالوصف: {description[:500]}"}]
    )
    return {"summary": response.content[0].text.strip()}

# ── Feature 2: Fake Job Detection ────────────────────────────
@router.post("/fake-job-check")
async def fake_job_check(body: dict):
    title = body.get("title", "")
    company = body.get("company", "")
    description = body.get("description", "")
    apply_url = body.get("apply_url", "")
    response = get_claude().messages.create(
        model="claude-haiku-4-5",
        max_tokens=200,
        system="""أنت محلل وظائف متخصص في كشف الوظائف المزيفة. حلّل الوظيفة وأعد JSON:
{"is_fake": bool, "reason": "السبب باللغة العربية", "confidence": رقم_0_إلى_100}""",
        messages=[{"role": "user", "content": f"المسمى: {title}\nالشركة: {company}\nالوصف: {description[:400]}\nرابط: {apply_url}"}]
    )
    text = response.content[0].text
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except:
            pass
    return {"is_fake": False, "reason": "لم يتمكن من التحليل", "confidence": 50}

# ── Feature 3: CV Improvement Suggestions ────────────────────
@router.post("/cv-improve")
async def cv_improve(body: dict):
    cv_text = body.get("cv_text", "")
    response = get_claude().messages.create(
        model="claude-haiku-4-5",
        max_tokens=1200,
        system=f"""أنت خبير تحسين سير ذاتية للسوق السعودي.
{IMAN_PROFILE}
أعد JSON:
{{"improved_sections": [{{"section": "اسم القسم", "original": "النص الأصلي", "improved": "النص المحسّن", "reason": "سبب التحسين"}}]}}""",
        messages=[{"role": "user", "content": f"السيرة الذاتية:\n{cv_text[:2000]}\nاقترح تحسينات لـ 4 أقسام رئيسية:"}]
    )
    text = response.content[0].text
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except:
            pass
    return {"improved_sections": []}

# ── Feature 4: Career Path Suggestions ───────────────────────
@router.get("/career-paths")
async def career_paths():
    response = get_claude().messages.create(
        model="claude-haiku-4-5",
        max_tokens=800,
        system=f"""أنت مستشار مهني للسوق السعودي.
{IMAN_PROFILE}
أعد JSON:
{{"paths": [{{"title": "المسار", "description": "الوصف", "required_skills": ["مهارة1"], "match_percent": رقم, "timeline": "المدة"}}]}}""",
        messages=[{"role": "user", "content": "اقترح 4 مسارات مهنية مناسبة لإيمان بناءً على خبرتها وشهاداتها في السوق السعودي:"}]
    )
    text = response.content[0].text
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except:
            pass
    return {"paths": [
        {"title": "مدير مشاريع PMO", "description": "قيادة مكتب إدارة المشاريع", "required_skills": ["PMP", "MS Project"], "match_percent": 95, "timeline": "الآن"},
        {"title": "محلل أعمال أول", "description": "تحليل المتطلبات وتحسين العمليات", "required_skills": ["PBA", "CBAP"], "match_percent": 90, "timeline": "الآن"},
    ]}

# ── Feature 5: Job Description Translation ───────────────────
@router.post("/translate")
async def translate(body: dict):
    text = body.get("text", "")
    target = body.get("target", "ar")
    lang = "العربية" if target == "ar" else "الإنجليزية"
    response = get_claude().messages.create(
        model="claude-haiku-4-5",
        max_tokens=800,
        system=f"أنت مترجم محترف. ترجم النص التالي إلى {lang} بدقة واحتفظ بالمعنى الوظيفي.",
        messages=[{"role": "user", "content": text[:1500]}]
    )
    return {"translated": response.content[0].text.strip()}

# ── Feature 6: Thank You Email Template ──────────────────────
@router.post("/thank-you-email")
async def thank_you_email(body: dict):
    company = body.get("company", "")
    job_title = body.get("job_title", "")
    interviewer_name = body.get("interviewer_name", "Hiring Manager")
    response = get_claude().messages.create(
        model="claude-haiku-4-5",
        max_tokens=500,
        system=f"""أنت متخصص في كتابة رسائل الشكر بعد المقابلات.
{IMAN_PROFILE}
أعد JSON: {{"subject": "الموضوع", "body": "نص الرسالة"}}
اكتب الرسالة باللغة الإنجليزية بأسلوب مهني.""",
        messages=[{"role": "user", "content": f"الشركة: {company}\nالوظيفة: {job_title}\nاسم المحاور: {interviewer_name}\nاكتب رسالة شكر احترافية:"}]
    )
    text = response.content[0].text
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except:
            pass
    return {
        "subject": f"Thank You – {job_title} Interview",
        "body": f"Dear {interviewer_name},\n\nThank you for taking the time to interview me for the {job_title} position at {company}. I enjoyed our conversation and remain very enthusiastic about this opportunity.\n\nBest regards,\nIman Al-Aboud"
    }

# ── Feature 7: LinkedIn Message Templates ────────────────────
@router.get("/linkedin-templates")
async def linkedin_templates():
    return {"templates": [
        {"title": "طلب تواصل عام", "use_case": "للتواصل مع مسؤولي التوظيف", "message": "مرحباً [الاسم]،\n\nأنا إيمان العبود، مديرة مشاريع معتمدة PMP وPBA مع خبرة في السوق السعودي. أودّ الانضمام إلى شبكتك المهنية والتعرف على فرص في مجال إدارة المشاريع.\n\nشكراً لك"},
        {"title": "استفسار عن وظيفة", "use_case": "عند رؤية إعلان وظيفي", "message": "مرحباً [الاسم]،\n\nرأيت إعلان [اسم الوظيفة] في شركتكم وأنا مهتمة جداً بهذه الفرصة. لديّ [X] سنوات خبرة وشهادات PMP وPBA. هل يمكنني التواصل معك لمعرفة المزيد؟\n\nشكراً"},
        {"title": "متابعة بعد التقديم", "use_case": "بعد التقديم على وظيفة", "message": "مرحباً [الاسم]،\n\nتقدمت مؤخراً لوظيفة [اسم الوظيفة] في شركتكم وأودّ التأكيد على اهتمامي الكبير بهذه الفرصة. سيكون من دواعي سروري مناقشة كيف يمكنني إضافة قيمة لفريقكم.\n\nشكراً"},
        {"title": "طلب نصيحة مهنية", "use_case": "للتواصل مع متخصصين في المجال", "message": "مرحباً [الاسم]،\n\nأتابع عملك في [المجال] وأجد خبرتك ملهمة. أنا مديرة مشاريع أسعى للتطور في [المجال المحدد]. هل لديك دقيقتان لمشاركة نصيحة؟\n\nشكراً جزيلاً"},
    ]}

# ── Feature 8: Success Rate by Job Type ──────────────────────
@router.get("/success-by-type")
async def success_by_type():
    sb = get_client()
    apps = sb.table("applications").select("status, stage, jobs(title)").execute().data or []
    type_map = {}
    for a in apps:
        title = (a.get("jobs") or {}).get("title", "")
        # categorize
        if any(k in title.lower() for k in ["project manager", "pm ", "مدير مشاريع", "pmo"]):
            cat = "مدير مشاريع"
        elif any(k in title.lower() for k in ["business analyst", "ba ", "محلل أعمال", "pba"]):
            cat = "محلل أعمال"
        elif any(k in title.lower() for k in ["coordinator", "منسق"]):
            cat = "منسق مشاريع"
        elif any(k in title.lower() for k in ["director", "مدير عام", "head"]):
            cat = "مدير"
        else:
            cat = "أخرى"
        if cat not in type_map:
            type_map[cat] = {"type": cat, "applied": 0, "responses": 0, "rate": 0}
        type_map[cat]["applied"] += 1
        if a.get("stage") in ["reply", "interview", "offer"] or a.get("status") in ["interview", "offer"]:
            type_map[cat]["responses"] += 1
    data = list(type_map.values())
    for d in data:
        d["rate"] = round(d["responses"] / d["applied"] * 100, 1) if d["applied"] > 0 else 0
    return {"data": data}

# ── Feature 9: Monthly Performance Comparison ────────────────
@router.get("/monthly-comparison")
async def monthly_comparison():
    now = datetime.utcnow()
    month_start = now.replace(day=1).isoformat()
    last_month_start = (now.replace(day=1) - timedelta(days=1)).replace(day=1).isoformat()
    last_month_end = now.replace(day=1).isoformat()
    sb = get_client()

    cur_apps = sb.table("applications").select("status,stage").gte("sent_at", month_start).execute().data or []
    prev_apps = sb.table("applications").select("status,stage").gte("sent_at", last_month_start).lt("sent_at", last_month_end).execute().data or []

    def count_responses(apps):
        return sum(1 for a in apps if a.get("stage") in ["reply", "interview", "offer"] or a.get("status") in ["interview", "offer"])
    def count_interviews(apps):
        return sum(1 for a in apps if a.get("stage") == "interview" or a.get("status") == "interview")

    current = {"applied": len(cur_apps), "responses": count_responses(cur_apps), "interviews": count_interviews(cur_apps)}
    previous = {"applied": len(prev_apps), "responses": count_responses(prev_apps), "interviews": count_interviews(prev_apps)}
    changes = {
        "applied": current["applied"] - previous["applied"],
        "responses": current["responses"] - previous["responses"],
        "interviews": current["interviews"] - previous["interviews"],
    }
    return {"current": current, "previous": previous, "changes": changes}

# ── Feature 10: Best Time to Apply ───────────────────────────
@router.get("/best-time")
async def best_time():
    sb = get_client()
    try:
        apps = sb.table("applications").select("sent_at, stage, status").limit(200).execute().data or []
        hour_resp = {}
        for a in apps:
            sent = a.get("sent_at", "")
            if not sent:
                continue
            try:
                dt = datetime.fromisoformat(sent.replace("Z", "+00:00"))
                h = dt.hour
                if h not in hour_resp:
                    hour_resp[h] = {"total": 0, "responses": 0}
                hour_resp[h]["total"] += 1
                if a.get("stage") in ["reply", "interview", "offer"] or a.get("status") in ["interview", "offer"]:
                    hour_resp[h]["responses"] += 1
            except:
                pass
        best_hour = 9
        best_rate = 0
        for h, v in hour_resp.items():
            if v["total"] >= 2:
                rate = v["responses"] / v["total"]
                if rate > best_rate:
                    best_rate = rate
                    best_hour = h
        hour_str = f"{best_hour:02d}:00 - {best_hour+1:02d}:00"
    except:
        hour_str = "09:00 - 10:00"
    return {
        "day": "الأحد - الثلاثاء",
        "time": hour_str,
        "tip": "التقديم في الصباح الباكر أيام الأحد والاثنين والثلاثاء يحصل على أعلى معدلات استجابة في السوق السعودي."
    }

# ── Feature 12: Smart Reminders ──────────────────────────────
@router.get("/reminders")
async def reminders():
    sb = get_client()
    result = []
    now = datetime.utcnow()
    try:
        # Applications with no response for 7+ days
        week_ago = (now - timedelta(days=7)).isoformat()
        apps = sb.table("applications").select("id, sent_at, stage, status, jobs(title, company)").execute().data or []
        for a in apps:
            sent = a.get("sent_at", "")
            if not sent:
                continue
            try:
                sent_dt = datetime.fromisoformat(sent.replace("Z", "+00:00")).replace(tzinfo=None)
            except:
                continue
            stage = a.get("stage", "sent")
            status = a.get("status", "sent")
            if stage in ["sent", "viewed"] and status not in ["rejected", "offer", "interview"] and sent_dt < now - timedelta(days=7):
                job = a.get("jobs") or {}
                result.append({
                    "type": "followup",
                    "message": f"لا رد من {job.get('company','الشركة')} على وظيفة {job.get('title','')} منذ 7+ أيام",
                    "link": "/applications",
                    "urgency": "medium"
                })
        # Interviews today
        for a in apps:
            interview_date = a.get("interview_date", "")
            if interview_date:
                try:
                    idt = datetime.fromisoformat(interview_date.replace("Z", "+00:00")).replace(tzinfo=None)
                    if idt.date() == now.date():
                        job = a.get("jobs") or {}
                        result.append({
                            "type": "interview",
                            "message": f"مقابلة اليوم مع {job.get('company','الشركة')} — {job.get('title','')}",
                            "link": "/applications",
                            "urgency": "high"
                        })
                except:
                    pass
    except:
        pass
    if not result:
        result.append({
            "type": "info",
            "message": "لا تذكيرات عاجلة حالياً. أنت في المسار الصحيح!",
            "link": "/dashboard",
            "urgency": "low"
        })
    return {"reminders": result[:10]}
