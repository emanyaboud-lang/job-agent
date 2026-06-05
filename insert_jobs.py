"""أداة إدراج وظائف تجريبية مباشرة في Supabase"""
import httpx
import json
from datetime import datetime

SUPABASE_URL = "https://abmmjzuaueqzwmwjqwho.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibW1qenVhdWVxendtd2pxd2hvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQyNzUwMSwiZXhwIjoyMDk2MDAzNTAxfQ.yB10qruPARjh8H-KE_V8954LXZnlzXEkB1GCcREXMh8"
HEADERS = {
    "Authorization": f"Bearer {KEY}",
    "apikey": KEY,
    "Content-Type": "application/json; charset=utf-8",
    "Prefer": "return=minimal",
}

now = datetime.utcnow().isoformat()

JOBS = [
    {
        "title": "مدير مشاريع - مشاريع رؤية 2030",
        "company": "شركة نيوم",
        "city": "riyadh",
        "description": "قيادة مشاريع البنية التحتية الذكية ضمن مبادرات رؤية 2030. إدارة فرق متعددة التخصصات.",
        "requirements": "PMP مطلوب، 5+ سنوات خبرة في إدارة المشاريع الكبرى",
        "notes": "💰 الراتب المتوقع: 18,000 – 25,000 ريال شهرياً + حوافز",
        "apply_url": "https://www.linkedin.com/jobs",
        "apply_email": "careers@neom.com",
        "platform": "linkedin",
        "match_score": 92,
        "status": "pending",
        "is_vision2030": True,
        "discovered_at": now,
    },
    {
        "title": "محلل أعمال أول",
        "company": "هيئة تطوير المدينة المنورة",
        "city": "madinah",
        "description": "تحليل متطلبات مشاريع التحول الرقمي والمدن الذكية. التنسيق مع أصحاب المصلحة.",
        "requirements": "PBA أو CBAP، Power BI، Excel متقدم، 4+ سنوات",
        "notes": "💰 الراتب المتوقع: 14,000 – 19,000 ريال شهرياً",
        "apply_url": "https://jadarat.sa",
        "apply_email": "hr@mdamadinah.gov.sa",
        "platform": "jadarat",
        "match_score": 95,
        "status": "pending",
        "is_vision2030": True,
        "discovered_at": now,
    },
    {
        "title": "Business Analyst - Digital Transformation",
        "company": "Aramco Digital",
        "city": "jeddah",
        "description": "Analyze business requirements for digital transformation projects in the energy sector.",
        "requirements": "PBA certification, 4+ years experience, fluent English, Power BI",
        "notes": "💰 Expected Salary: 16,000 – 22,000 SAR/month",
        "apply_url": "https://www.linkedin.com/jobs",
        "apply_email": "talent@aramcodigital.com",
        "platform": "linkedin",
        "match_score": 88,
        "status": "pending",
        "is_vision2030": False,
        "discovered_at": now,
    },
    {
        "title": "PMO Specialist",
        "company": "أمانة المدينة المنورة",
        "city": "madinah",
        "description": "دعم مكتب إدارة المشاريع وتطوير منهجيات PMO. مراقبة الأداء وإعداد التقارير.",
        "requirements": "PMP، Microsoft Project، 3+ سنوات خبرة PMO",
        "notes": "💰 الراتب المتوقع: 12,000 – 16,000 ريال شهرياً",
        "apply_url": "https://www.taqat.sa",
        "apply_email": "jobs@amanahmadinah.gov.sa",
        "platform": "taqat",
        "match_score": 90,
        "status": "pending",
        "is_vision2030": True,
        "discovered_at": now,
    },
    {
        "title": "Project Manager - Smart City",
        "company": "ROSHN Group",
        "city": "riyadh",
        "description": "Lead smart city infrastructure projects within ROSHN communities. Coordinate with contractors.",
        "requirements": "PMP required, 5+ years experience, smart city knowledge",
        "notes": "💰 Expected Salary: 19,000 – 26,000 SAR/month + benefits",
        "apply_url": "https://www.linkedin.com/jobs",
        "apply_email": "careers@roshn.sa",
        "platform": "linkedin",
        "match_score": 91,
        "status": "pending",
        "is_vision2030": True,
        "discovered_at": now,
    },
    {
        "title": "مدير مشاريع تقنية",
        "company": "شركة الاتصالات STC",
        "city": "riyadh",
        "description": "إدارة مشاريع التحول الرقمي وحلول الاتصالات للعملاء الحكوميين.",
        "requirements": "PMP، خبرة في مشاريع تقنية 5 سنوات",
        "notes": "💰 الراتب المتوقع: 17,000 – 23,000 ريال شهرياً",
        "apply_url": "https://www.bayt.com",
        "apply_email": "hr@stc.com.sa",
        "platform": "bayt",
        "match_score": 85,
        "status": "pending",
        "is_vision2030": False,
        "discovered_at": now,
    },
    {
        "title": "مدير مشاريع - قطاع الصحة",
        "company": "وزارة الصحة - المدينة المنورة",
        "city": "madinah",
        "description": "إدارة مشاريع تطوير المنشآت الصحية وتحديث الأنظمة الإلكترونية.",
        "requirements": "PMP، خبرة 4+ سنوات، خبرة في مشاريع حكومية",
        "notes": "💰 الراتب المتوقع: 13,000 – 18,000 ريال شهرياً",
        "apply_url": "https://jadarat.sa",
        "apply_email": "jobs@moh.gov.sa",
        "platform": "jadarat",
        "match_score": 87,
        "status": "pending",
        "is_vision2030": True,
        "discovered_at": now,
    },
]


def main():
    print("حذف الوظائف المعطوبة...")
    with httpx.Client(timeout=15) as client:
        # حذف الوظائف القديمة المعطوبة
        r = client.delete(
            f"{SUPABASE_URL}/rest/v1/jobs?status=eq.pending",
            headers=HEADERS,
        )
        print(f"حذف: {r.status_code}")

        # إدراج الوظائف الجديدة
        print("إدراج وظائف جديدة...")
        r = client.post(
            f"{SUPABASE_URL}/rest/v1/jobs",
            headers=HEADERS,
            content=json.dumps(JOBS, ensure_ascii=False).encode("utf-8"),
        )
        print(f"إدراج: {r.status_code}")
        if r.status_code in (200, 201):
            print(f"✅ تم إدراج {len(JOBS)} وظيفة بنجاح!")
        else:
            print(f"❌ خطأ: {r.text[:200]}")

        # تحقق
        r = client.get(
            f"{SUPABASE_URL}/rest/v1/jobs?status=eq.pending&select=title,match_score&order=match_score.desc",
            headers=HEADERS,
        )
        jobs = r.json()
        print(f"\n✅ {len(jobs)} وظيفة في قاعدة البيانات الآن:")
        for j in jobs:
            print(f"  {j['match_score']}% — {j['title']}")


if __name__ == "__main__":
    main()
