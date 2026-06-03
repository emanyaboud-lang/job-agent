import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/lib/api'
import { Settings as SettingsType, City, Platform, PrimaryColor } from '@/types'
import { useStore } from '@/store/useStore'
import { applyPrimaryColor } from '@/lib/utils'
import { Save, Plus, Trash2, RefreshCw } from 'lucide-react'

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

export default function Settings() {
  const qc = useQueryClient()
  const { setTheme, setPrimaryColor, theme } = useStore()
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'limits' | 'signature' | 'followup' | 'notifications'>('general')

  const { data } = useQuery<SettingsType>({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get() as Promise<SettingsType>,
    retry: false,
    // show defaults if backend is unavailable
    onError: () => {},
  } as Parameters<typeof useQuery>[0])

  useEffect(() => {
    if (data && Object.keys(data).length > 0) setSettings(prev => ({ ...prev, ...data }))
  }, [data])

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

  const TABS = [
    { id: 'general', label: 'عام' },
    { id: 'limits', label: 'الحدود اليومية' },
    { id: 'signature', label: 'التوقيع' },
    { id: 'followup', label: 'المتابعة' },
    { id: 'notifications', label: 'الإشعارات' },
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
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === t.id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* General tab */}
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
                  <button key={c.value} onClick={() => { update(['primary_color'], c.value); setPrimaryColor(c.value) }}
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
              <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">الحد الأدنى لنسبة التطابق: {settings.min_match_score}%</label>
              <input type="range" min={50} max={95} step={5} value={settings.min_match_score} onChange={e => update(['min_match_score'], +e.target.value)} className="w-full accent-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-2 text-gray-600 dark:text-gray-400">تفعيل المنصات</label>
              <div className="space-y-2">
                {(Object.keys(PLATFORM_LABELS) as Platform[]).filter(p => p !== 'manual').map(p => (
                  <div key={p} className="flex items-center justify-between py-1.5">
                    <span className="text-sm">{PLATFORM_LABELS[p]}</span>
                    <button
                      onClick={() => update(['platforms', p], !settings.platforms[p])}
                      className={`w-11 h-6 rounded-full transition-all duration-200 relative ${settings.platforms[p] ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
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
        </div>
      )}

      {/* Daily limits tab */}
      {activeTab === 'limits' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">الحدود اليومية للتقديمات</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(CITY_LABELS) as City[]).filter(c => c !== 'other').map(city => (
              <div key={city} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <div className="flex-1">
                  <p className="font-medium text-sm">{CITY_LABELS[city]}</p>
                  <p className="text-xs text-gray-400">تقديمات/يوم</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => update(['daily_limits', city], Math.max(0, (settings.daily_limits[city] ?? 0) - 1))} className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 font-bold">−</button>
                  <span className="w-8 text-center font-bold text-lg">{settings.daily_limits[city] ?? 0}</span>
                  <button onClick={() => update(['daily_limits', city], (settings.daily_limits[city] ?? 0) + 1)} className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center hover:bg-primary-200 dark:hover:bg-primary-900/50 font-bold">+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signature tab */}
      {activeTab === 'signature' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">توقيع الإيميل</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'الاسم', key: 'name' },
              { label: 'المسمى الوظيفي', key: 'title' },
              { label: 'الجوال', key: 'phone' },
              { label: 'LinkedIn', key: 'linkedin' },
              { label: 'الإيميل', key: 'email' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">{f.label}</label>
                <input className="input text-sm" value={(settings.email_signature as unknown as Record<string, string>)[f.key] ?? ''} onChange={e => update(['email_signature', f.key], e.target.value)} />
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">حقول مخصصة</label>
              <button onClick={() => update(['email_signature', 'custom_fields'], [...settings.email_signature.custom_fields, { label: '', value: '' }])} className="btn-ghost text-xs px-2 py-1">
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
                  <button onClick={() => update(['email_signature', 'custom_fields'], settings.email_signature.custom_fields.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Followup tab */}
      {activeTab === 'followup' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">إعدادات المتابعة</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">الحد الأقصى: متابعتان لكل وظيفة. رسالة المتابعة تُعرض للموافقة قبل الإرسال.</p>
          <div>
            <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">قالب رسالة المتابعة</label>
            <textarea className="input text-sm resize-none leading-relaxed" rows={10} value={settings.followup_template} onChange={e => update(['followup_template'], e.target.value)} />
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">المتغيرات المتاحة:</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{'{ hiring_manager } { job_title } { sent_date } { your_name } { company_name }'}</p>
          </div>
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">تفضيلات الإشعارات</h3>
          <div className="space-y-3">
            {([
              { key: 'new_job', label: 'وظيفة جديدة' },
              { key: 'reply_received', label: 'رد من شركة' },
              { key: 'application_sent', label: 'تم إرسال تقديم' },
              { key: 'email_opened', label: 'الشركة فتحت الإيميل' },
              { key: 'limit_reached', label: 'الوصول للحد اليومي' },
            ] as const).map(n => (
              <div key={n.key} className="flex items-center gap-4 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <span className="text-sm flex-1">{n.label}</span>
                <select
                  className="input text-sm py-1.5 w-36"
                  value={settings.notification_prefs[n.key]}
                  onChange={e => update(['notification_prefs', n.key], e.target.value)}
                >
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
