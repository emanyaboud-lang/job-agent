# Job Agents — دليل التشغيل

نظام ذكي يؤتمت البحث عن الوظائف والتقديم عليها بالذكاء الاصطناعي.

---

## خطوات التشغيل لأول مرة

### الخطوة 1 — ملء مفاتيح API

افتحي ملف `.env` الموجود في المجلد الرئيسي وضعي مفاتيحك:

```
ANTHROPIC_API_KEY=ضعي_المفتاح_هنا
SUPABASE_URL=ضعي_الرابط_هنا
SUPABASE_ANON_KEY=ضعي_المفتاح_هنا
SUPABASE_SERVICE_ROLE_KEY=ضعي_المفتاح_هنا
GMAIL_CLIENT_ID=ضعي_المفتاح_هنا
GMAIL_CLIENT_SECRET=ضعي_المفتاح_هنا
GMAIL_REFRESH_TOKEN=ضعي_المفتاح_هنا
APIFY_TOKEN=ضعي_المفتاح_هنا
```

### الخطوة 2 — إعداد قاعدة البيانات (مرة واحدة فقط)

1. افتحي مشروع Supabase الخاص بك
2. اذهبي إلى **SQL Editor**
3. انسخي محتوى ملف `supabase_schema.sql` والصقيه
4. اضغطي **Run**

### الخطوة 3 — تثبيت مكتبات Python (مرة واحدة)

افتحي نافذة CMD في مجلد `backend` وشغّلي:
```
C:\Users\user\AppData\Local\Programs\Python\Python311\python.exe -m pip install -r requirements.txt
```

ثم ثبّتي Playwright:
```
C:\Users\user\AppData\Local\Programs\Python\Python311\python.exe -m playwright install chromium
```

### الخطوة 4 — تثبيت مكتبات Frontend (مرة واحدة)

افتحي نافذة CMD في مجلد `frontend` وشغّلي:
```
npm install
```

### الخطوة 5 — التشغيل

**الطريقة السهلة:** انقري مرتين على ملف `start.bat`

أو شغّلي يدوياً:
- **Backend:** `cd backend && python -m uvicorn app.main:app --reload`
- **Frontend:** `cd frontend && npm run dev`

ثم افتحي المتصفح على: **http://localhost:5173**

---

## ملاحظات مهمة

- **بعد كل تشغيل أول:** ارفعي السيرة الذاتية من صفحة "السيرة الذاتية"
- **لتفعيل البحث:** اضغطي "ابحث الآن" في الداشبورد
- **لتخصيص اللون والمظهر:** اذهبي لصفحة "الإعدادات"
- **المفاتيح السرية:** لا تشاركي ملف `.env` مع أحد

---

## هيكل المشروع

```
AGENT/
├── .env                    ← مفاتيح API (لا تشاركيه)
├── start.bat               ← تشغيل سريع
├── supabase_schema.sql     ← قاعدة البيانات
├── frontend/               ← واجهة الموقع (React)
│   ├── src/pages/          ← الصفحات
│   └── src/components/     ← المكونات
└── backend/                ← خادم API (Python)
    ├── app/agents/         ← Agent 1 و Agent 2
    ├── app/scrapers/       ← سكرابرز المنصات
    ├── app/services/       ← Claude, Gmail, Supabase
    └── app/api/            ← نقاط API
```

---

## في حال وجود مشكلة

1. تأكدي أن مفاتيح `.env` صحيحة وغير منتهية الصلاحية
2. تأكدي أن قاعدة البيانات تم إنشاؤها (supabase_schema.sql)
3. تأكدي من تثبيت requirements.txt و npm install
4. إذا لم تعمل سكرابرز طاقات/جدارات: ثبّتي playwright chromium
