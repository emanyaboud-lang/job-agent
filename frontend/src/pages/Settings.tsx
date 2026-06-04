import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, agentsApi } from '@/lib/api'
import { Settings as SettingsType, City, Platform, PrimaryColor } from '@/types'
import { useStore } from '@/store/useStore'
import { applyPrimaryColor } from '@/lib/utils'
import { Save, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Wifi, Database, Mail, Bot, Clock, Globe, Zap, Key } from 'lucide-react'

type FullCheckService = { ok: boolean; detail: string }
type FullCheckResult = { ok: boolean; services: Record<string, FullCheckService> }

const SERVICE_META: Record<string, { label: string; icon: React.ElementType; iconColor: string }> = {
  backend:   { label: 'الخادم (Backend)',          icon: Wifi,     iconColor: 'text-blue-500' },
  supabase:  { label: 'قاعدة البيانات (Supabase)', icon: Database, iconColor: 'text-green-500' },
  gmail:     { label: 'Gmail API',                 icon: Mail,     iconColor: 'text-red-500' },
  anthropic: { label: 'Claude AI (Anthropic)',      icon: Bot,      iconColor: 'text-violet-500' },
  apify:     { label: 'Apify (سكرابر)',             icon: Globe,    iconColor: 'text-orange-500' },
}

const COLOR_OPTIONS: { value: PrimaryColor; label: string; preview: string }[] = [
  { value: 'sky',    label: 'أزرق سماوي', preview: '#0ea5e9' },
  { value: 'blue',   label: 'أزرق كحلي',  preview: '#3b82f6' },
  { value: 'green',  label: 'أخضر',       preview: '#22c55e' },
  { value: 'violet', label: 'بنفسجي',    preview: '#8b5cf6' },
]

const PLATFORM_LABELS: Record<Platform, string> = {
  taqat: 'طاقات', jadarat: 'جدارات', linkedin: 'LinkedIn', bayt: 'Bayt.com', indeed: 'Indeed', manual: 'يدوي',
}

const CITY_LABELS: Record<City, string> = {
  madinah: 'المدينة المنورة', jeddah: 'جدة', riyadh: 'الرياض', yanbu: 'ينبع', other: 'أخرى',
}

const DEFAULT_SETTINGS: SettingsType = {
  daily_limits: { madinah: 5, jeddah: 10, riyadh: 8, yanbu: 3, other: 5 },
  min_match_score: 70,
  search_time: '08:00',
  platforms: { taqat: true, jadarat: true, linkedin: true, bayt: true, indeed: true, manual: true },
  email_signature: {
    name: 'إيمان العبود', title: 'مديرة مشاريع | PMP · PBA',
    phone: '', linkedin: '', email: 'Eman.mm.aboud@outlook.com',
    custom_fields: [],
  },
  followup_template: 'Dear {hiring_manager},\n\nI hope this message finds you well. I wanted to follow up on my application for the {job_title} position I submitted on {sent_date}. I remain very interested in this opportunity and would welcome the chance to discuss my qualifications.\n\nBest regards,\n{your_name}',
  primary_color: 'sky',
  theme: 'light',
  sender_email: 'Eman.mm.aboud@outlook.com',
  notification_prefs: {
    new_job: 'both',
    reply_received: 'both',
    application_sent: 'site',
    email_opened: 'site',
    limit_reached: 'site',
  },
}

type StatusType = 'loading' | 'ok' | 'error'

function StatusBadge({ status, label, icon: Icon, detail }: { status: StatusType; label: string; icon: React.ElementType; detail?: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${status === 'ok' ? 'bg-green-100 dark:bg-green-900/30' : status === 'error' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
          <Icon size={18} className={status === 'ok' ? 'text-green-600' : status === 'error' ? 'text-red-500' : 'text-gray-400'} />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          {detail && <p className="text-xs text-gray-400 mt-0.5">{detail}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {status === 'loading' && <RefreshCw size={14} className="animate-spin text-gray-400" />}
        {status === 'ok'      && <CheckCircle size={16} className="text-green-500" />}
        {status === 'error'   && <XCircle size={16} className="text-red-500" />}
        <span className={`text-xs font-medium ${status === 'ok' ? 'text-green-600' : status === 'error' ? 'text-red-500' : 'text-gray-400'}`}>
          {status === 'loading' ? 'جارٍ الفحص' : status === 'ok' ? 'متصل' : 'غير متصل'}
        </span>
      </div>
    </div>
  )
}

export default function Settings() {
  const qc = useQueryClient()
  const { setTheme, setPrimaryColor, theme } = useStore()
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'server' | 'general' | 'preferences' | 'limits' | 'signature' | 'followup' | 'notifications'>('server')
  const [newKeyword, setNewKeyword] = useState('')
  const [newBlacklist, setNewBlacklist] = useState('')
  const [fullCheck, setFullCheck] = useState<FullCheckResult | null>(null)
  const [checking, setChecking] = useState(false)

  const [testEmail, setTestEmail] = useState<{ ok: boolean; detail: string } | null>(null)
  const [testingEmail, setTestingEmail] = useState(false)

  const runTestEmail = async () => {
    setTestingEmail(true)
    setTestEmail(null)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL ?? '') + '/api/health/test-email', { method: 'POST' })
      const data = await res.json()
      setTestEmail(data)
    } catch {
      setTestEmail({ ok: false, detail: 'تعذّر الاتصال بالخادم' })
    } finally {
      setTestingEmail(false)
    }
  }

  const runFullCheck = async () => {
    setChecking(true)
    setFullCheck(null)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL ?? '') + '/api/health/full')
      const data = await res.json() as FullCheckResult
      setFullCheck(data)
    } catch {
      setFullCheck({ ok: false, services: { backend: { ok: false, detail: 'تعذّر الاتصال بالخادم تماماً' } } })
    } finally {
      setChecking(false)
    }
  }

  const { data } = useQuery<SettingsType>({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get() as Promise<SettingsType>,
    retry: false,
  })

  useEffect(() => {
    if (data && Object.keys(data).length > 0) setSettings(prev => ({ ...prev, ...data }))
  }, [data])

  // فحص حالة الخادم
  const { data: health, isLoading: healthLoading, isError: healthError, refetch: refetchHealth } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetch((import.meta.env.VITE_API_URL ?? '') + '/api/health').then(r => r.json()),
    retry: 1,
    refetchInterval: 30000,
  })

  const { data: agentStatus, isLoading: agentLoading, refetch: refetchAgents } = useQuery({
    queryKey: ['agent-status'],
    queryFn: () => agentsApi.status() as Promise<Record<string, unknown>[]>,
    retry: 1,
    refetchInterval: 15000,
  })

  const backendStatus: StatusType = healthLoading ? 'loading' : healthError ? 'error' : 'ok'
  const supabaseStatus: StatusType = health?.supabase === false ? 'error' : backendStatus === 'ok' ? 'ok' : backendStatus
  const gmailStatus: StatusType = health?.gmail === false ? 'error' : backendStatus === 'ok' ? 'ok' : backendStatus

  const saveMut = useMutation({
    mutationFn: () => settingsApi.update(settings),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); qc.invalidateQueries({ queryKey: ['settings'] }) },
  })

  const update = (path: string[], value: unknown) => {
    setSettings(prev => {
      const next = { ...prev } as Record<string, unknown>
      let ref = next
      for (let i = 0; i < path.length - 1; i++) {
        ref[path[i]] = { ...(ref[path[i]] as Record<string, unknown>) }
        ref = ref[path[i]] as Record<string, unknown>
      }
      ref[path[path.length - 1]] = value
      return next as unknown as SettingsType
    })
  }

  const keywords: string[] = (settings as unknown as Record<string, unknown>).search_keywords as string[] ?? [
    'project manager', 'مدير مشاريع', 'business analyst', 'PMP', 'PMO', 'مدن ذكية'
  ]
  const blacklist: string[] = (settings as unknown as Record<string, unknown>).blacklist_companies as string[] ?? []

  const TABS = [
    { id: 'server',        label: 'الخادم',         icon: '🖥️' },
    { id: 'general',       label: 'عام',             icon: '⚙️' },
    { id: 'preferences',   label: 'تفضيلات البحث',  icon: '🔍' },
    { id: 'limits',        label: 'الحدود اليومية', icon: '📊' },
    { id: 'signature',     label: 'التوقيع',         icon: '✍️' },
    { id: 'followup',      label: 'المتابعة',        icon: '📨' },
    { id: 'notifications', label: 'الإشعارات',       icon: '🔔' },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-xl">الإعدادات</h1>
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary text-sm">
          {saveMut.isPending ? <RefreshCw size={14} className="animate-spin" /> : saved ? '✓ تم الحفظ' : <><Save size={14} />حفظ الإعدادات</>}
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === t.id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ===== تبويب الخادم ===== */}
      {activeTab === 'server' && (
        <div className="space-y-4">

          {/* زر الفحص الشامل */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Zap size={16} className="text-yellow-500" />فحص شامل للنظام</h3>
                <p className="text-xs text-gray-400 mt-0.5">يفحص كل خدمة ويخبرك بالضبط وش يشتغل ووش لا</p>
              </div>
              <button onClick={runFullCheck} disabled={checking}
                className="btn-primary text-sm flex items-center gap-2 px-5 py-2.5 disabled:opacity-60">
                {checking ? <><RefreshCw size={14} className="animate-spin" />جارٍ الفحص...</> : <><Zap size={14} />فحص الآن</>}
              </button>
            </div>

            {/* نتائج الفحص */}
            {checking && (
              <div className="space-y-2">
                {['backend','supabase','gmail','anthropic','apify'].map(k => (
                  <div key={k} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-600 rounded w-48" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {fullCheck && !checking && (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 p-3 rounded-xl font-medium text-sm ${fullCheck.ok ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                  {fullCheck.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {fullCheck.ok ? 'كل الخدمات تعمل بشكل صحيح ✅' : 'بعض الخدمات تحتاج مراجعة ⚠️'}
                </div>
                <div className="space-y-2">
                  {Object.entries(fullCheck.services).map(([key, svc]) => {
                    const meta = SERVICE_META[key] ?? { label: key, icon: Key, iconColor: 'text-gray-500' }
                    const Icon = meta.icon
                    return (
                      <div key={key} className={`flex items-center gap-3 p-3.5 rounded-xl border ${svc.ok ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${svc.ok ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                          <Icon size={17} className={svc.ok ? 'text-green-600' : 'text-red-500'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{meta.label}</p>
                          <p className={`text-xs mt-0.5 truncate ${svc.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{svc.detail}</p>
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${svc.ok ? 'text-green-600' : 'text-red-500'}`}>
                          {svc.ok ? '✅ متصل' : '❌ خطأ'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* زر اختبار الإيميل */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Mail size={16} className="text-red-500" />اختبار الإيميل</h3>
                <p className="text-xs text-gray-400 mt-0.5">يرسل إيميل تجريبي لنفسك عشان تتأكد أن الإرسال يعمل</p>
              </div>
              <button onClick={runTestEmail} disabled={testingEmail}
                className="btn-ghost text-sm flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-60">
                {testingEmail ? <><RefreshCw size={14} className="animate-spin" />جارٍ الإرسال...</> : <><Mail size={14} />أرسل إيميل اختبار</>}
              </button>
            </div>
            {testEmail && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${testEmail.ok ? 'bg-green-50 dark:bg-green-900/20 text-green-700' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                {testEmail.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {testEmail.detail}
              </div>
            )}
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">حالة الاتصال السريع</h3>
              <button onClick={() => { refetchHealth(); refetchAgents() }} className="btn-ghost text-xs px-2 py-1 flex items-center gap-1">
                <RefreshCw size={12} />تحديث
              </button>
            </div>
            <StatusBadge status={backendStatus} label="الخادم (Backend)" icon={Wifi}
              detail={backendStatus === 'ok' ? `v${health?.version ?? '1.0.0'} — يعمل` : 'تعذّر الاتصال بالخادم'} />
            <StatusBadge status={supabaseStatus} label="قاعدة البيانات (Supabase)" icon={Database}
              detail={supabaseStatus === 'ok' ? 'متصلة وتعمل' : 'تحقق من SUPABASE_URL'} />
            <StatusBadge status={gmailStatus} label="Gmail API" icon={Mail}
              detail={gmailStatus === 'ok' ? 'جاهز للإرسال والاستقبال' : 'تحقق من GMAIL_REFRESH_TOKEN'} />
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="font-semibold">حالة الوكلاء</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(['agent1', 'agent2'] as const).map((id, idx) => {
                const a = (agentStatus as unknown as Record<string, unknown>[] | undefined)?.[idx] as Record<string, unknown> | undefined
                const state = agentLoading ? 'loading' : a ? 'ok' : 'error'
                return (
                  <div key={id} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${state === 'ok' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <Bot size={18} className={state === 'ok' ? 'text-blue-600' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{idx === 0 ? 'Agent 1 — الباحث' : 'Agent 2 — المُقدِّم'}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {agentLoading ? 'جارٍ الفحص...' : a ? `الحالة: ${a.state ?? 'غير نشط'}` : 'لم يعمل بعد'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a?.state === 'running' ? 'bg-green-100 text-green-700' :
                      a?.state === 'idle' ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {a?.state === 'running' ? 'يعمل' : a?.state === 'idle' ? 'جاهز' : 'غير نشط'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="font-semibold">معلومات النظام</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Globe, label: 'رابط الخادم', value: import.meta.env.VITE_API_URL || 'localhost:8000' },
                { icon: Clock, label: 'إصدار API', value: health?.version ?? '—' },
                { icon: Database, label: 'قاعدة البيانات', value: 'Supabase PostgreSQL' },
                { icon: Bot, label: 'نموذج AI', value: 'Claude Sonnet 4.5' },
              ].map(item => (
                <div key={item.label} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <item.icon size={15} className="text-gray-400 mb-1.5" />
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="text-xs font-medium mt-0.5 truncate">{String(item.value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== تبويب عام ===== */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold">المظهر</h3>
            <div>
              <label className="text-xs font-medium block mb-2 text-gray-600 dark:text-gray-400">الوضع</label>
              <div className="flex gap-2">
                {(['light', 'dark'] as const).map(t => (
                  <button key={t} onClick={() => { update(['theme'], t); setTheme(t) }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${settings.theme === t ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    {t === 'light' ? '☀️ فاتح' : '🌙 مظلم'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2 text-gray-600 dark:text-gray-400">اللون الرئيسي</label>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.value} onClick={() => { update(['primary_color'], c.value); setPrimaryColor(c.value); applyPrimaryColor(c.value) }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition-all ${settings.primary_color === c.value ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: c.preview }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="font-semibold">بحث الوظائف</h3>
            <div>
              <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">وقت البحث اليومي</label>
              <input type="time" className="input" value={settings.search_time} onChange={e => update(['search_time'], e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">الحد الأدنى لنسبة التطابق: <span className="font-bold text-primary-600">{settings.min_match_score}%</span></label>
              <input type="range" min={50} max={95} step={5} value={settings.min_match_score} onChange={e => update(['min_match_score'], +e.target.value)} className="w-full accent-primary-500" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>50% (أكثر)</span><span>95% (أدق)</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2 text-gray-600 dark:text-gray-400">تفعيل المنصات</label>
              <div className="space-y-2">
                {(Object.keys(PLATFORM_LABELS) as Platform[]).filter(p => p !== 'manual').map(p => (
                  <div key={p} className="flex items-center justify-between py-1.5">
                    <span className="text-sm">{PLATFORM_LABELS[p]}</span>
                    <button onClick={() => update(['platforms', p], !settings.platforms[p])}
                      className={`w-11 h-6 rounded-full transition-all duration-200 relative ${settings.platforms[p] ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${settings.platforms[p] ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">إيميل الإرسال</label>
              <input className="input text-sm" value={settings.sender_email} onChange={e => update(['sender_email'], e.target.value)} />
            </div>
          </div>

          <div className="card p-5 space-y-3 md:col-span-2">
            <h3 className="font-semibold">لغة رسائل التقديم</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { value: 'en',   label: 'إنجليزية', flag: '🇬🇧' },
                { value: 'ar',   label: 'عربية',    flag: '🇸🇦' },
                { value: 'auto', label: 'تلقائي',   flag: '🤖' },
              ].map(l => {
                const cur = (settings as unknown as Record<string, unknown>).letter_language as string ?? 'en'
                return (
                  <button key={l.value} onClick={() => update(['letter_language'], l.value)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${cur === l.value ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <span className="text-lg">{l.flag}</span>{l.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== تبويب تفضيلات البحث ===== */}
      {activeTab === 'preferences' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold">كلمات البحث المخصصة</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">هذه الكلمات يستخدمها Agent 1 عند البحث في كل المنصات.</p>
            <div className="flex gap-2">
              <input className="input text-sm flex-1" placeholder="مثال: program manager" value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newKeyword.trim()) { update(['search_keywords'], [...keywords, newKeyword.trim()]); setNewKeyword('') } }} />
              <button onClick={() => { if (newKeyword.trim()) { update(['search_keywords'], [...keywords, newKeyword.trim()]); setNewKeyword('') } }}
                className="btn-primary text-sm px-4">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw, i) => (
                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium border border-primary-200 dark:border-primary-800">
                  {kw}
                  <button onClick={() => update(['search_keywords'], keywords.filter((_, j) => j !== i))} className="hover:text-red-500 transition-colors">
                    <XCircle size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="font-semibold">شركات محظورة</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">الوظائف من هذه الشركات لن تظهر في النتائج.</p>
            <div className="flex gap-2">
              <input className="input text-sm flex-1" placeholder="مثال: اسم الشركة" value={newBlacklist}
                onChange={e => setNewBlacklist(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newBlacklist.trim()) { update(['blacklist_companies'], [...blacklist, newBlacklist.trim()]); setNewBlacklist('') } }} />
              <button onClick={() => { if (newBlacklist.trim()) { update(['blacklist_companies'], [...blacklist, newBlacklist.trim()]); setNewBlacklist('') } }}
                className="btn-primary text-sm px-4">
                <Plus size={14} />
              </button>
            </div>
            {blacklist.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">لا توجد شركات محظورة</p>
            ) : (
              <div className="space-y-2">
                {blacklist.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                    <span className="text-sm">{c}</span>
                    <button onClick={() => update(['blacklist_companies'], blacklist.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="font-semibold">المدن المستهدفة</h3>
            <div className="space-y-2">
              {(Object.keys(CITY_LABELS) as City[]).map(city => {
                const targetCities = (settings as unknown as Record<string, unknown>).target_cities as City[] ?? ['madinah', 'jeddah', 'riyadh', 'yanbu']
                const active = targetCities.includes(city)
                return (
                  <div key={city} className="flex items-center justify-between py-1.5">
                    <span className="text-sm">{CITY_LABELS[city]}</span>
                    <button onClick={() => update(['target_cities'], active ? targetCities.filter(c => c !== city) : [...targetCities, city])}
                      className={`w-11 h-6 rounded-full transition-all duration-200 relative ${active ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${active ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="font-semibold">تفضيلات التقديم</h3>
            <div className="space-y-3">
              {[
                { key: 'auto_apply',       label: 'تقديم تلقائي', desc: 'Agent 2 يُقدّم تلقائياً بدون موافقة يدوية' },
                { key: 'vision2030_only',  label: 'أولوية رؤية 2030', desc: 'إعطاء أولوية لشركات رؤية 2030 والمشاريع الكبرى' },
                { key: 'attach_cv',        label: 'إرفاق السيرة الذاتية', desc: 'إرفاق الـ CV تلقائياً مع كل رسالة تقديم' },
                { key: 'require_approval', label: 'طلب موافقة قبل الإرسال', desc: 'مراجعة كل رسالة قبل إرسالها' },
              ].map(item => {
                const val = (settings as unknown as Record<string, unknown>)[item.key] as boolean ?? (item.key === 'attach_cv' || item.key === 'require_approval')
                return (
                  <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    <button onClick={() => update([item.key], !val)}
                      className={`w-11 h-6 rounded-full transition-all duration-200 relative shrink-0 ${val ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${val ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== تبويب الحدود اليومية ===== */}
      {activeTab === 'limits' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">الحدود اليومية للتقديمات</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">الحد الأقصى لعدد التقديمات يومياً لكل مدينة.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(CITY_LABELS) as City[]).filter(c => c !== 'other').map(city => (
              <div key={city} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <div className="flex-1">
                  <p className="font-medium text-sm">{CITY_LABELS[city]}</p>
                  <p className="text-xs text-gray-400">تقديمات/يوم</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => update(['daily_limits', city], Math.max(0, (settings.daily_limits[city] ?? 0) - 1))} className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 font-bold text-lg">−</button>
                  <span className="w-10 text-center font-bold text-xl">{settings.daily_limits[city] ?? 0}</span>
                  <button onClick={() => update(['daily_limits', city], (settings.daily_limits[city] ?? 0) + 1)} className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center hover:bg-primary-200 font-bold text-lg">+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              إجمالي الحد اليومي: <span className="font-bold">{Object.values(settings.daily_limits).reduce((a, b) => a + b, 0)} تقديم/يوم</span>
            </p>
          </div>
        </div>
      )}

      {/* ===== تبويب التوقيع ===== */}
      {activeTab === 'signature' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">توقيع الإيميل</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'الاسم', key: 'name', placeholder: 'إيمان العبود' },
              { label: 'المسمى الوظيفي', key: 'title', placeholder: 'مديرة مشاريع | PMP · PBA' },
              { label: 'الجوال', key: 'phone', placeholder: '+966 5x xxx xxxx' },
              { label: 'LinkedIn', key: 'linkedin', placeholder: 'linkedin.com/in/...' },
              { label: 'الإيميل', key: 'email', placeholder: 'example@email.com' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">{f.label}</label>
                <input className="input text-sm" placeholder={f.placeholder}
                  value={(settings.email_signature as unknown as Record<string, string>)[f.key] ?? ''}
                  onChange={e => update(['email_signature', f.key], e.target.value)} />
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">حقول مخصصة</label>
              <button onClick={() => update(['email_signature', 'custom_fields'], [...settings.email_signature.custom_fields, { label: '', value: '' }])}
                className="btn-ghost text-xs px-2 py-1 flex items-center gap-1">
                <Plus size={13} />إضافة حقل
              </button>
            </div>
            <div className="space-y-2">
              {settings.email_signature.custom_fields.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="input text-sm flex-1" placeholder="العنوان" value={f.label} onChange={e => {
                    const cf = [...settings.email_signature.custom_fields]
                    cf[i] = { ...cf[i], label: e.target.value }
                    update(['email_signature', 'custom_fields'], cf)
                  }} />
                  <input className="input text-sm flex-1" placeholder="القيمة" value={f.value} onChange={e => {
                    const cf = [...settings.email_signature.custom_fields]
                    cf[i] = { ...cf[i], value: e.target.value }
                    update(['email_signature', 'custom_fields'], cf)
                  }} />
                  <button onClick={() => update(['email_signature', 'custom_fields'], settings.email_signature.custom_fields.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          {/* معاينة التوقيع */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800">
            <p className="text-xs font-medium text-gray-400 mb-2">معاينة التوقيع</p>
            <div className="text-sm space-y-0.5">
              <p className="font-semibold">{settings.email_signature.name}</p>
              <p className="text-gray-600 dark:text-gray-400">{settings.email_signature.title}</p>
              {settings.email_signature.phone && <p className="text-gray-500 text-xs">{settings.email_signature.phone}</p>}
              {settings.email_signature.email && <p className="text-primary-600 text-xs">{settings.email_signature.email}</p>}
              {settings.email_signature.linkedin && <p className="text-blue-500 text-xs">{settings.email_signature.linkedin}</p>}
              {settings.email_signature.custom_fields.map((f, i) => f.label && (
                <p key={i} className="text-gray-500 text-xs">{f.label}: {f.value}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== تبويب المتابعة ===== */}
      {activeTab === 'followup' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold">إعدادات المتابعة التلقائية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">أيام الانتظار قبل المتابعة الأولى</label>
                <input type="number" min={3} max={14} className="input text-sm"
                  value={(settings as unknown as Record<string, unknown>).followup_days_1 as number ?? 7}
                  onChange={e => update(['followup_days_1'], +e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">أيام الانتظار قبل المتابعة الثانية</label>
                <input type="number" min={5} max={21} className="input text-sm"
                  value={(settings as unknown as Record<string, unknown>).followup_days_2 as number ?? 14}
                  onChange={e => update(['followup_days_2'], +e.target.value)} />
              </div>
            </div>
          </div>
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold">قالب رسالة المتابعة</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">رسالة المتابعة تُعرض للموافقة قبل الإرسال. الحد الأقصى متابعتان لكل وظيفة.</p>
            <textarea className="input text-sm resize-none leading-relaxed" rows={10}
              value={settings.followup_template}
              onChange={e => update(['followup_template'], e.target.value)} />
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">المتغيرات المتاحة:</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 leading-relaxed">
                {'{hiring_manager}  {job_title}  {sent_date}  {your_name}  {company_name}'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== تبويب الإشعارات ===== */}
      {activeTab === 'notifications' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">تفضيلات الإشعارات</h3>
          <div className="space-y-3">
            {([
              { key: 'new_job',           label: 'وظيفة جديدة',          icon: '💼' },
              { key: 'reply_received',    label: 'رد من شركة',            icon: '📩' },
              { key: 'application_sent',  label: 'تم إرسال تقديم',        icon: '✅' },
              { key: 'email_opened',      label: 'الشركة فتحت الإيميل',   icon: '👁️' },
              { key: 'limit_reached',     label: 'الوصول للحد اليومي',    icon: '⚠️' },
            ] as const).map(n => (
              <div key={n.key} className="flex items-center gap-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <span className="text-lg">{n.icon}</span>
                <span className="text-sm flex-1">{n.label}</span>
                <select className="input text-sm py-1.5 w-36"
                  value={settings.notification_prefs[n.key]}
                  onChange={e => update(['notification_prefs', n.key], e.target.value)}>
                  <option value="both">الموقع + إيميل</option>
                  <option value="site">الموقع فقط</option>
                  <option value="email">إيميل فقط</option>
                  <option value="none">لا إشعارات</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
