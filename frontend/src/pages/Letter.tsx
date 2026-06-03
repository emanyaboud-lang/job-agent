import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Save, Eye, Plus, Trash2, RefreshCw } from 'lucide-react'

const VARIABLES = [
  '{company_name}', '{job_title}', '{industry}', '{city}',
  '{your_name}', '{relevant_skills}', '{years_exp}',
  '{hiring_manager}', '{certifications}', '{achievements}',
]

const DEFAULT_EN = `Dear {hiring_manager},

I am writing to express my strong interest in the {job_title} position at {company_name}. With over {years_exp} of experience in project management and business analysis, including my work at the Madinah Development Authority on smart city initiatives, I am confident I can bring significant value to your team.

My PMP and PBA certifications, combined with hands-on experience in {relevant_skills}, align closely with the requirements for this role. At the Madinah Development Authority, I successfully led and delivered complex projects within scope, schedule, and budget, consistently achieving high stakeholder satisfaction.

I am particularly drawn to {company_name}'s commitment to excellence, and I believe my background in {industry} positions me as an ideal candidate for this opportunity.

I would welcome the chance to discuss how my experience can contribute to your organization's goals.

Best regards,
{your_name}
Project Manager | PMP · PBA`

const DEFAULT_AR = `عزيزي {hiring_manager}،

أتقدم بطلب الانضمام إلى فريقكم في وظيفة {job_title} في {company_name}، إذ أرى تطابقاً واضحاً بين خبرتي ومتطلبات هذه الوظيفة.

أمتلك خبرة تزيد عن {years_exp} في إدارة المشاريع وتحليل الأعمال، مع حيازتي على شهادات PMP و PBA. خلال عملي في هيئة تطوير المدينة المنورة، قدت مشاريع تحول رقمي ومدن ذكية حققت أهدافها بالجودة والوقت والميزانية المحددة.

مهاراتي في {relevant_skills} تجعلني مؤهلة بشكل مباشر لهذا الدور، وأتطلع إلى المساهمة في أهداف {company_name}.

شاكرةً لكم حسن الاهتمام،
{your_name}
مديرة مشاريع | PMP · PBA`

export default function Letter() {
  const [activeTemplate, setActiveTemplate] = useState('default-en')
  const [previewCompany, setPreviewCompany] = useState('')
  const [previewJob, setPreviewJob] = useState('')
  const [templates, setTemplates] = useState([
    { id: 'default-en', name: 'الرسالة الإنجليزية (افتراضي)', language: 'en', subject: 'Application for {job_title} – {your_name}', body: DEFAULT_EN, is_default: true },
    { id: 'default-ar', name: 'الرسالة العربية', language: 'ar', subject: 'تقديم على وظيفة {job_title} – {your_name}', body: DEFAULT_AR, is_default: false },
  ])
  const [saved, setSaved] = useState(false)

  const current = templates.find(t => t.id === activeTemplate)

  const updateCurrent = (field: string, value: string) => {
    setTemplates(prev => prev.map(t => t.id === activeTemplate ? { ...t, [field]: value } : t))
  }

  const insertVar = (v: string) => {
    const ta = document.querySelector<HTMLTextAreaElement>('#letter-body')
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const newVal = (current?.body ?? '').slice(0, start) + v + (current?.body ?? '').slice(end)
    updateCurrent('body', newVal)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + v.length, start + v.length) }, 0)
  }

  const preview = (text: string) => text
    .replace(/{company_name}/g, previewCompany || 'شركة النموذج')
    .replace(/{job_title}/g, previewJob || 'مدير مشاريع')
    .replace(/{your_name}/g, 'إيمان العبود')
    .replace(/{years_exp}/g, '3+')
    .replace(/{certifications}/g, 'PMP, PBA')
    .replace(/{hiring_manager}/g, 'Hiring Manager')
    .replace(/{relevant_skills}/g, 'project management, business analysis')
    .replace(/{industry}/g, 'smart cities')
    .replace(/{city}/g, 'Madinah')
    .replace(/{achievements}/g, 'led multiple smart city projects')

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-xl">محرر رسالة التقديم</h1>
        <button onClick={handleSave} className="btn-primary text-sm">
          {saved ? <><RefreshCw size={14} className="animate-spin" />تم الحفظ</> : <><Save size={14} />حفظ</>}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Templates list */}
        <div className="xl:col-span-1 space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">القوالب</p>
          {templates.map(t => (
            <button key={t.id} onClick={() => setActiveTemplate(t.id)}
              className={cn('w-full text-right px-3 py-2.5 rounded-xl text-sm transition-all',
                activeTemplate === t.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300')}>
              <p className="truncate">{t.name}</p>
              <p className="text-xs text-gray-400">{t.language === 'en' ? 'English' : 'عربي'}</p>
            </button>
          ))}
          <button onClick={() => {
            const newT = { id: `t${Date.now()}`, name: 'قالب جديد', language: 'en', subject: '', body: '', is_default: false }
            setTemplates(prev => [...prev, newT])
            setActiveTemplate(newT.id)
          }} className="btn-ghost text-xs w-full justify-center py-2">
            <Plus size={13} />إضافة قالب
          </button>
        </div>

        {/* Editor */}
        {current && (
          <div className="xl:col-span-2 space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">اسم القالب</label>
              <input className="input text-sm" value={current.name} onChange={e => updateCurrent('name', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">موضوع الإيميل</label>
              <input className="input text-sm" value={current.subject} onChange={e => updateCurrent('subject', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">اللغة</label>
              <select className="input text-sm" value={current.language} onChange={e => updateCurrent('language', e.target.value)}>
                <option value="en">English</option>
                <option value="ar">عربي</option>
                <option value="auto">تلقائي (AI يختار)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1 text-gray-600 dark:text-gray-400">نص الرسالة</label>
              <textarea
                id="letter-body"
                className="input text-sm resize-none leading-relaxed"
                style={{ height: '320px', direction: current.language === 'ar' ? 'rtl' : 'ltr' }}
                value={current.body}
                onChange={e => updateCurrent('body', e.target.value)}
              />
            </div>
            {/* Variables */}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">انقري على متغير لإدراجه في مكان المؤشر:</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map(v => (
                  <button key={v} onClick={() => insertVar(v)} className="badge-sky cursor-pointer hover:bg-sky-200 dark:hover:bg-sky-800 transition-colors text-xs font-mono">
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-primary-500" />
            <span className="font-medium text-sm">معاينة فورية</span>
          </div>
          <div className="flex gap-2">
            <input className="input text-xs py-2" placeholder="اسم الشركة" value={previewCompany} onChange={e => setPreviewCompany(e.target.value)} />
            <input className="input text-xs py-2" placeholder="المسمى الوظيفي" value={previewJob} onChange={e => setPreviewJob(e.target.value)} />
          </div>
          {current && (
            <div className="card p-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">الموضوع: {preview(current.subject)}</p>
              <hr className="border-gray-100 dark:border-gray-800" />
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto" style={{ direction: current.language === 'ar' ? 'rtl' : 'ltr' }}>
                {preview(current.body)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
