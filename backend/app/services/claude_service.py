import anthropic
from app.core.config import settings
from typing import Optional

_client = None

def get_claude():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client

IMAN_PROFILE = """
=== ملف إيمان العبود الكامل ===
الاسم: Eman AlAboud / إيمان العبود
المسمى الوظيفي: Project Manager | PMP / PBA | مديرة مشاريع
البريد الإلكتروني: Eman.mm.aboud@outlook.com
الجوال: +966 566132059
الجنسية: سعودية

الشهادات المهنية:
- Project Management Professional (PMP) — PMI, 2023
- PMI Professional in Business Analysis (PBA) — PMI, 2024

التعليم:
- بكالوريوس رياضيات وإحصاء — جامعة طيبة، المدينة المنورة
- دبلوم عالٍ (ماجستير تنفيذي) في التربية الخاصة بامتياز — المدينة المنورة

الخبرة العملية:

1. مديرة مشاريع — هيئة تطوير المدينة المنورة، المدينة المنورة
   مايو 2023 – حتى الآن (3+ سنوات)
   - قيادة مشاريع المدن الذكية: مواقف ذكية، إضاءة ذكية، أنظمة نقل ذكية
   - إدارة المشاريع الاستراتيجية: متابعة التقدم، تقارير الأداء، التنسيق مع أصحاب المصلحة
   - إدارة العقود: التفاوض مع الموردين، ضمان الامتثال للمواصفات والمواعيد

2. منظمة فعاليات — مؤسسة السعودي مول، المدينة المنورة
   2015 – 2022 (7 سنوات)
   - تخطيط وتنفيذ 15 فعالية متنوعة
   - قيادة فرق من 12 عضواً
   - إدارة الميزانيات والموارد

المهارات التقنية:
- إدارة مشاريع المدن الذكية: تخطيط، تنفيذ، مراقبة، تسليم، ميزانية
- تحليل الأعمال: تحليل البيانات، استخلاص المتطلبات، نمذجة الأعمال، تقييم الحلول
- الأدوات: Microsoft Project, Power BI, Excel, Trello, Jira
- المهارات اللينة: التفاوض، التواصل، التفكير الاستراتيجي، إدارة العلاقات

اللغات:
- العربية: اللغة الأم
- الإنجليزية: جيد جداً

إجمالي الخبرة: 10+ سنوات (3+ إدارة مشاريع + 7 سنوات فعاليات)
المدن المستهدفة: المدينة المنورة (أولوية)، جدة، الرياض، ينبع
المدن المستهدفة: المدينة المنورة، جدة، الرياض، ينبع
"""

def analyze_cv(cv_text: str) -> dict:
    """تحليل شامل للـ CV"""
    response = get_claude().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=f"""أنت خبير موارد بشرية متخصص في سوق العمل السعودي.
{IMAN_PROFILE}
حلل السيرة الذاتية وأعد JSON بالشكل التالي بدقة:
{{
  "skills": ["مهارة1", ...],
  "tech_skills": ["أداة1", ...],
  "experience_years": رقم,
  "certifications": ["شهادة1", ...],
  "strengths": ["نقطة1", ...],
  "improvements": ["اقتراح1", ...],
  "projects": ["مشروع1", ...],
  "market_comparison": "مقارنة نصية بسوق العمل السعودي لـ PM/BA"
}}""",
        messages=[{"role": "user", "content": f"حلل هذا الـ CV:\n\n{cv_text}"}]
    )
    import json, re
    text = response.content[0].text
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return {}

def match_job(cv_text: str, job_title: str, job_description: str, job_requirements: str = "") -> int:
    """تقييم نسبة تطابق الوظيفة مع الـ CV (0-100)"""
    response = get_claude().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=100,
        system=f"""أنت خبير توظيف. قيّم مدى تطابق هذه الوظيفة مع السيرة الذاتية.
{IMAN_PROFILE}
أجب برقم فقط من 0 إلى 100 يمثل نسبة التطابق.""",
        messages=[{"role": "user", "content": f"""السيرة الذاتية:
{cv_text[:2000]}

الوظيفة: {job_title}
الوصف: {job_description[:1000]}
المتطلبات: {job_requirements[:500]}

نسبة التطابق (رقم فقط):"""}]
    )
    import re
    nums = re.findall(r'\d+', response.content[0].text)
    return min(100, max(0, int(nums[0]))) if nums else 70

def generate_letter(
    job_title: str,
    company_name: str,
    job_description: str,
    city: str,
    template: str,
    cv_text: str,
    language: str = "en",
    hiring_manager: str = "Hiring Manager",
) -> dict:
    """توليد رسالة تقديم مخصصة"""
    response = get_claude().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system=f"""أنت كاتب رسائل توظيف محترف.
{IMAN_PROFILE}
اكتب رسالة تقديم احترافية ومخصصة.
اللغة المطلوبة: {language}
استخدم القالب المعطى وأبدل المتغيرات بقيم حقيقية مناسبة للوظيفة والشركة.
أعد JSON: {{"subject": "موضوع الإيميل", "body": "نص الرسالة الكامل"}}""",
        messages=[{"role": "user", "content": f"""القالب:
{template}

معلومات الوظيفة:
- المسمى: {job_title}
- الشركة: {company_name}
- المدينة: {city}
- مسؤول التوظيف: {hiring_manager}
- وصف الوظيفة: {job_description[:800]}

ملخص الـ CV:
{cv_text[:1000]}

اكتب الرسالة المخصصة:"""}]
    )
    import json, re
    text = response.content[0].text
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return {"subject": f"Application for {job_title}", "body": text}

def chat_with_context(message: str, history: list, context: str = "") -> str:
    """شات AI عام مع سياق البيانات"""
    messages = []
    for h in history[-10:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    response = get_claude().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        system=f"""أنت مساعد ذكي لنظام Job Agents. 
{IMAN_PROFILE}
{context}
أجب بالعربية إذا كان السؤال بالعربية، وبالإنجليزية إذا كان بالإنجليزية.
كن مختصراً ومفيداً.""",
        messages=messages
    )
    return response.content[0].text

def cv_chat(message: str, history: list, cv_text: str) -> str:
    """شات متخصص في الـ CV"""
    return chat_with_context(
        message, history,
        context=f"\nمحتوى الـ CV:\n{cv_text[:3000]}"
    )

def generate_interview_prep(job_title: str, company_name: str, job_description: str, cv_text: str) -> dict:
    """توليد تحضير للمقابلة"""
    response = get_claude().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=f"""أنت خبير تحضير مقابلات وظيفية.
{IMAN_PROFILE}
أنشئ دليل تحضير شامل للمقابلة. أجب بـ JSON:
{{
  "company_info": "معلومات عن الشركة وثقافتها",
  "key_points": ["نقطة تركيز 1", ...],
  "questions": [
    {{"question": "السؤال", "tip": "نصيحة للإجابة", "focus": "ما يبحث عنه المحاور"}},
    ...
  ]
}}""",
        messages=[{"role": "user", "content": f"""الوظيفة: {job_title} في {company_name}
وصف: {job_description[:800]}
الـ CV: {cv_text[:1000]}
ولّد 8 أسئلة مقابلة متوقعة مع نصائح:"""}]
    )
    import json, re
    text = response.content[0].text
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return {"company_info": "", "key_points": [], "questions": []}

def analyze_skill_gap(cv_text: str) -> list:
    """تحليل فجوة المهارات مقارنةً بسوق العمل السعودي"""
    response = get_claude().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system="""أنت خبير سوق عمل سعودي متخصص في وظائف إدارة المشاريع وتحليل الأعمال.
حلل فجوة المهارات وأعد JSON:
[
  {"skill": "اسم المهارة", "demand_level": "high|medium|low", "you_have": true/false, "suggestion": "اقتراح اختياري"},
  ...
]
ركز على المهارات الأكثر طلباً في السوق السعودي 2024-2025.""",
        messages=[{"role": "user", "content": f"الـ CV:\n{cv_text[:2000]}\n\nحلل فجوة المهارات (15 مهارة):"}]
    )
    import json, re
    text = response.content[0].text
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return []

def generate_fallback_jobs(cv_text: str, count: int = 10) -> list:
    """يولّد وظائف واقعية من سوق العمل السعودي عندما تفشل السكرابرز"""
    import json, re
    response = get_claude().messages.create(
        model="claude-haiku-4-5",
        max_tokens=3000,
        system=f"""أنت خبير سوق العمل السعودي. ولّد قائمة وظائف حقيقية ومعقولة متاحة الآن في السوق السعودي.
{IMAN_PROFILE}
ولّد وظائف من شركات حقيقية مع مسميات وظيفية حقيقية تناسب ملف إيمان.
أجب بـ JSON array فقط بدون أي نص آخر:
[
  {{
    "title": "مسمى وظيفي حقيقي",
    "company": "اسم شركة أو جهة حقيقية",
    "city": "madinah|jeddah|riyadh|yanbu|other",
    "description": "وصف مختصر للوظيفة 2-3 جمل يذكر المتطلبات",
    "requirements": "PMP, 5 سنوات خبرة, ...",
    "apply_url": "https://www.linkedin.com/jobs",
    "platform": "linkedin|jadarat|taqat|bayt",
    "salary_range": "15000-20000 ريال"
  }}
]""",
        messages=[{"role": "user", "content": f"ولّد {count} وظيفة حقيقية مناسبة لهذا الـ CV:\n{cv_text[:1000]}\n\nأجب بـ JSON فقط:"}]
    )
    text = response.content[0].text.strip()
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    return []


def summarize_email(email_body: str) -> str:
    """تلخيص الإيميل الوارد"""
    response = get_claude().messages.create(
        model="claude-haiku-4-5",
        max_tokens=200,
        system="لخّص هذا الإيميل في جملة أو جملتين بالعربية.",
        messages=[{"role": "user", "content": email_body[:2000]}]
    )
    return response.content[0].text
