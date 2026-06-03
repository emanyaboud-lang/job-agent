-- ================================================
--  Job Agents — Supabase Schema
--  نفّذي هذا الملف في Supabase SQL Editor
-- ================================================

-- تفعيل UUID
create extension if not exists "uuid-ossp";

-- جدول الوظائف
create table jobs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  company text not null,
  company_type text,
  city text default 'other',
  description text,
  requirements text,
  apply_url text,
  apply_email text,
  platform text default 'manual',
  match_score integer default 0,
  published_at timestamp,
  discovered_at timestamp default now(),
  status text default 'pending',
  is_vision2030 boolean default false,
  application_id uuid,
  notes text
);

-- جدول الشركات
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text,
  city text,
  website text,
  linkedin_url text,
  email text,
  applications_count integer default 0,
  last_contact timestamp,
  notes text
);

-- جدول التقديمات
create table applications (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade,
  company_id uuid references companies(id),
  status text default 'sent',
  letter_text text,
  letter_subject text,
  letter_language text default 'en',
  sent_at timestamp,
  email_status text,
  success_score integer,
  follow_up_count integer default 0,
  next_followup_at timestamp,
  cv_version_id uuid
);

-- جدول الإيميلات
create table emails (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  application_id uuid references applications(id),
  direction text default 'outgoing',
  subject text,
  body text,
  from_email text,
  to_email text,
  status text default 'sent',
  sent_at timestamp default now(),
  opened_at timestamp,
  thread_id text,
  gmail_id text unique,
  ai_summary text
);

-- جدول ملفات الـ CV
create table cv_files (
  id uuid primary key default uuid_generate_v4(),
  version_name text,
  language text default 'ar',
  specialization text,
  file_url text,
  file_name text,
  file_path text,
  extracted_text text,
  uploaded_at timestamp default now(),
  is_primary boolean default false,
  analysis jsonb
);

-- جدول قوالب الرسائل
create table letter_templates (
  id uuid primary key default uuid_generate_v4(),
  name text,
  language text default 'en',
  subject text,
  body text,
  is_default boolean default false,
  created_at timestamp default now()
);

-- جدول الإعدادات
create table settings (
  id uuid primary key default uuid_generate_v4(),
  data jsonb not null default '{}',
  updated_at timestamp default now()
);

-- جدول الإشعارات
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  type text,
  title text,
  message text,
  is_read boolean default false,
  created_at timestamp default now(),
  link text,
  meta jsonb
);

-- جدول سجل الأحداث
create table event_log (
  id uuid primary key default uuid_generate_v4(),
  event_type text,
  description text,
  status text default 'info',
  meta jsonb,
  created_at timestamp default now()
);

-- جدول حالة الـ Agents
create table agent_status (
  agent_id text primary key,
  state text default 'idle',
  last_run timestamp,
  jobs_found_today integer default 0,
  meta jsonb
);

-- جدول تحضير المقابلات
create table interview_preps (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid references applications(id),
  data jsonb,
  created_at timestamp default now()
);

-- إدراج الإعدادات الافتراضية
insert into settings (data) values ('{
  "daily_limits": {"madinah": 5, "jeddah": 10, "riyadh": 8, "yanbu": 3, "other": 5},
  "min_match_score": 70,
  "search_time": "08:00",
  "platforms": {"taqat": true, "jadarat": true, "linkedin": true, "bayt": true, "indeed": true},
  "email_signature": {
    "name": "إيمان العبود",
    "title": "مديرة مشاريع | PMP · PBA",
    "email": "Eman.mm.aboud@outlook.com",
    "custom_fields": []
  },
  "primary_color": "sky",
  "theme": "light",
  "sender_email": "Eman.mm.aboud@outlook.com",
  "notification_prefs": {
    "new_job": "both",
    "reply_received": "both",
    "application_sent": "site",
    "email_opened": "site",
    "limit_reached": "site"
  }
}');

-- إدراج القالب الافتراضي
insert into letter_templates (name, language, subject, body, is_default) values (
  'الرسالة الإنجليزية (افتراضي)',
  'en',
  'Application for {job_title} – Iman Al-Aboud',
  E'Dear {hiring_manager},\n\nI am writing to express my strong interest in the {job_title} position at {company_name}. With over {years_exp} of experience in project management and business analysis, including my work at the Madinah Development Authority on smart city initiatives, I am confident I can bring significant value to your team.\n\nMy PMP and PBA certifications, combined with hands-on experience in {relevant_skills}, align closely with the requirements for this role.\n\nI would welcome the chance to discuss how my experience can contribute to your organization''s goals.\n\nBest regards,\nIman Al-Aboud\nProject Manager | PMP · PBA\nEman.mm.aboud@outlook.com',
  true
);

-- تفعيل RLS (يمكن تخصيصه لاحقاً)
alter table jobs             enable row level security;
alter table companies        enable row level security;
alter table applications     enable row level security;
alter table emails           enable row level security;
alter table cv_files         enable row level security;
alter table letter_templates enable row level security;
alter table settings         enable row level security;
alter table notifications    enable row level security;
alter table event_log        enable row level security;
alter table agent_status     enable row level security;
alter table interview_preps  enable row level security;

-- السماح للـ service role بكل العمليات
create policy "service_role_all" on jobs             for all using (true);
create policy "service_role_all" on companies        for all using (true);
create policy "service_role_all" on applications     for all using (true);
create policy "service_role_all" on emails           for all using (true);
create policy "service_role_all" on cv_files         for all using (true);
create policy "service_role_all" on letter_templates for all using (true);
create policy "service_role_all" on settings         for all using (true);
create policy "service_role_all" on notifications    for all using (true);
create policy "service_role_all" on event_log        for all using (true);
create policy "service_role_all" on agent_status     for all using (true);
create policy "service_role_all" on interview_preps  for all using (true);
