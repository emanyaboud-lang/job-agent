import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cvApi, agentsApi, jobsApi } from '@/lib/api'
import { CVFile, Job } from '@/types'
import { cn, cityLabels, matchScoreBg } from '@/lib/utils'
import {
  X, ChevronLeft, FileText, Mail, Search, Briefcase, Send,
  CheckCircle2, RefreshCw, Sparkles, MapPin, Star, Zap,
  AlertCircle, ChevronRight, Edit3,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────
interface WizardProps { onClose: () => void }

type Step = 'cv' | 'template' | 'search' | 'pick' | 'send'
const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 'cv',       label: 'السيرة الذاتية', icon: FileText  },
  { id: 'template', label: 'القالب',          icon: Mail      },
  { id: 'search',   label: 'البحث',           icon: Search    },
  { id: 'pick',     label: 'اختاري وظيفة',   icon: Briefcase },
  { id: 'send',     label: 'أرسلي',           icon: Send      },
]

const DEFAULT_TEMPLATE = `Dear {hiring_manager},

I am writing to express my strong interest in the {job_title} position at {company_name}. With over 10 years of experience in project management and business analysis — including 3+ years leading smart city projects at the Madinah Development Authority — I am confident I can bring significant value to your team.

My PMP and PBA certifications, combined with hands-on expertise in {relevant_skills}, align directly with your requirements.

I would welcome the opportunity to discuss how my background can contribute to {company_name}'s goals.

Best regards,
Iman Al-Aboud | Project Manager · PMP · PBA`

// ─── Main Component ───────────────────────────────────────
export default function QuickApplyWizard({ onClose }: WizardProps) {
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('cv')
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [searchStatus, setSearchStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stepIdx = STEPS.findIndex(s => s.id === step)

  // ── Data fetching ──
  const { data: cvList = [] } = useQuery<CVFile[]>({
    queryKey: ['cv-list'],
    queryFn: () => cvApi.list() as Promise<CVFile[]>,
  })
  const primaryCv = cvList.find(c => c.is_primary) ?? cvList[0]

  const { data: jobs = [], refetch: refetchJobs } = useQuery<Job[]>({
    queryKey: ['jobs-wizard'],
    queryFn: () => jobsApi.list({ status: 'pending', limit: '20' }) as Promise<Job[]>,
    enabled: step === 'pick' || step === 'search',
  })

  // ── Search mutation ──
  const searchMut = useMutation({
    mutationFn: () => agentsApi.search() as Promise<unknown>,
    onSuccess: () => {
      setSearchStatus('running')
      // Poll for new jobs every 5s for up to 90s
      let count = 0
      intervalRef.current = setInterval(async () => {
        count++
        setPollCount(count)
        await refetchJobs()
        if (count >= 18) {
          clearInterval(intervalRef.current!)
          setSearchStatus('done')
        }
      }, 5000)
    },
  })

  const demoMut = useMutation({
    mutationFn: () => agentsApi.demoSearch() as Promise<{ jobs_added: number }>,
    onSuccess: () => { setSearchStatus('done'); refetchJobs() },
  })

  const approveMut = useMutation({
    mutationFn: (id: string) => jobsApi.approve(id),
    onSuccess: () => {
      setSent(true)
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['applications'] })
    },
  })

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  // ── Navigation ──
  function next() {
    const idx = STEPS.findIndex(s => s.id === step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id)
  }
  function back() {
    const idx = STEPS.findIndex(s => s.id === step)
    if (idx > 0) setStep(STEPS[idx - 1].id)
  }

  // ── Send ──
  async function handleSend() {
    if (!selectedJob) return
    setSending(true)
    await approveMut.mutateAsync(selectedJob.id)
    setSending(false)
  }

  // ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        style={{ animation: 'fadeIn 200ms ease' }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(10, 15, 30, 0.97)',
          border: '1px solid rgba(14, 165, 233, 0.2)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px rgba(0,0,0,0.6), 0 0 40px rgba(14,165,233,0.08)',
          animation: 'slideUp 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Top glow ── */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.6), transparent)',
        }} />

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">معالج التقديم السريع</h2>
              <p className="text-xs text-slate-500 mt-0.5">من السيرة الذاتية إلى الإرسال في خطوات</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const done = i < stepIdx
              const active = i === stepIdx
              const Icon = s.icon
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <button
                    onClick={() => done && setStep(s.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 transition-all duration-200',
                      done && 'cursor-pointer opacity-70 hover:opacity-100',
                      active && 'cursor-default',
                      !done && !active && 'cursor-default opacity-30',
                    )}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300',
                      active && 'bg-sky-500 shadow-lg shadow-sky-500/40 scale-110',
                      done && 'bg-emerald-500/20 border border-emerald-500/40',
                      !active && !done && 'bg-white/[0.05] border border-white/[0.08]',
                    )}>
                      {done
                        ? <CheckCircle2 size={16} className="text-emerald-400" />
                        : <Icon size={15} className={active ? 'text-white' : 'text-slate-500'} />
                      }
                    </div>
                    <span className={cn(
                      'text-[10px] font-medium leading-none whitespace-nowrap',
                      active ? 'text-sky-400' : done ? 'text-emerald-400' : 'text-slate-600',
                    )}>
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      'flex-1 h-px mx-2 mb-4 transition-colors duration-500',
                      i < stepIdx ? 'bg-emerald-500/40' : 'bg-white/[0.06]',
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 min-h-0">
          {/* Step 1: CV */}
          {step === 'cv' && (
            <StepCV cv={primaryCv} cvList={cvList} />
          )}
          {/* Step 2: Template */}
          {step === 'template' && (
            <StepTemplate
              template={template}
              editing={editingTemplate}
              onEdit={() => setEditingTemplate(true)}
              onChange={setTemplate}
            />
          )}
          {/* Step 3: Search */}
          {step === 'search' && (
            <StepSearch
              status={searchStatus}
              jobsFound={jobs.length}
              pollCount={pollCount}
              onSearch={() => searchMut.mutate()}
              onDemo={() => demoMut.mutate()}
              searching={searchMut.isPending || demoMut.isPending}
            />
          )}
          {/* Step 4: Pick job */}
          {step === 'pick' && (
            <StepPick
              jobs={jobs}
              selected={selectedJob}
              onSelect={setSelectedJob}
              onRefresh={() => refetchJobs()}
            />
          )}
          {/* Step 5: Send */}
          {step === 'send' && (
            <StepSend
              job={selectedJob}
              template={template}
              sent={sent}
              sending={sending}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 shrink-0 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <button
            onClick={back}
            disabled={stepIdx === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-0 transition-all"
          >
            <ChevronRight size={15} />
            السابق
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={cn(
                'rounded-full transition-all duration-300',
                i === stepIdx ? 'w-5 h-1.5 bg-sky-500' : 'w-1.5 h-1.5 bg-white/20',
              )} />
            ))}
          </div>

          {/* Next / Send button */}
          {sent ? (
            <button onClick={onClose} className="btn-success px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-emerald-500 text-white hover:bg-emerald-400 transition-colors">
              <CheckCircle2 size={15} />
              أغلقي
            </button>
          ) : step === 'send' ? (
            <button
              onClick={handleSend}
              disabled={!selectedJob || sending}
              className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-50 transition-all shadow-lg shadow-sky-500/30"
            >
              {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'جاري الإرسال...' : 'أرسلي التقديم ✨'}
            </button>
          ) : step === 'search' ? (
            <button
              onClick={() => { if (searchStatus === 'done' || jobs.length > 0) next() }}
              disabled={searchStatus === 'idle' && jobs.length === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-40 transition-all shadow-lg shadow-sky-500/30"
            >
              {jobs.length > 0 ? `عرض ${jobs.length} وظيفة` : 'انتظري...'}
              <ChevronLeft size={15} />
            </button>
          ) : step === 'pick' ? (
            <button
              onClick={next}
              disabled={!selectedJob}
              className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-40 transition-all shadow-lg shadow-sky-500/30"
            >
              التالي
              <ChevronLeft size={15} />
            </button>
          ) : (
            <button
              onClick={next}
              className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white transition-all shadow-lg shadow-sky-500/30"
            >
              التالي
              <ChevronLeft size={15} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
      `}</style>
    </div>
  )
}

// ─── Step 1: CV ───────────────────────────────────────────
function StepCV({ cv, cvList }: { cv?: CVFile; cvList: CVFile[] }) {
  if (!cv) return (
    <div className="py-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
        <AlertCircle size={24} className="text-amber-400" />
      </div>
      <p className="text-slate-300 font-medium mb-1">لا يوجد CV مرفوع</p>
      <p className="text-sm text-slate-500">ارفعي سيرتك الذاتية أولاً من صفحة السيرة الذاتية</p>
    </div>
  )
  return (
    <div className="space-y-4 py-2">
      <p className="text-sm text-slate-400">تأكدي من صحة السيرة الذاتية قبل التقديم</p>
      <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0">
            <FileText size={22} className="text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white mb-0.5">{cv.file_name}</p>
            <p className="text-xs text-slate-500 mb-3">
              {cv.is_primary && <span className="text-sky-400 font-medium ml-2">✓ السيرة الأساسية</span>}
              {cv.language === 'en' ? 'إنجليزي' : 'عربي'}
            </p>
            {cv.analysis && (
              <div className="space-y-2">
                {cv.analysis.certifications?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cv.analysis.certifications.map(c => (
                      <span key={c} className="text-xs bg-violet-500/15 border border-violet-500/25 text-violet-300 px-2.5 py-0.5 rounded-full font-medium">{c}</span>
                    ))}
                  </div>
                )}
                {cv.analysis.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cv.analysis.skills.slice(0, 5).map(s => (
                      <span key={s} className="text-xs bg-white/[0.06] text-slate-400 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  {cv.analysis.experience_years} سنة خبرة
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {cvList.length > 1 && (
        <p className="text-xs text-slate-500 text-center">
          عندك {cvList.length} سيرة ذاتية — السيرة الأساسية هي المستخدمة
        </p>
      )}
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
        <p className="text-xs text-emerald-300">السيرة جاهزة — اضغطي "التالي" للمتابعة</p>
      </div>
    </div>
  )
}

// ─── Step 2: Template ─────────────────────────────────────
function StepTemplate({ template, editing, onEdit, onChange }: {
  template: string; editing: boolean; onEdit: () => void; onChange: (v: string) => void
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">مراجعة وتأكيد قالب رسالة التقديم</p>
        {!editing && (
          <button onClick={onEdit} className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors">
            <Edit3 size={12} />
            تعديل
          </button>
        )}
      </div>
      {editing ? (
        <textarea
          value={template}
          onChange={e => onChange(e.target.value)}
          rows={12}
          className="w-full rounded-2xl border border-sky-500/20 bg-white/[0.03] text-slate-300 text-xs leading-relaxed p-4 resize-none outline-none focus:border-sky-500/50 transition-colors font-mono"
          style={{ direction: 'ltr', textAlign: 'left' }}
        />
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 max-h-56 overflow-y-auto">
          <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans" style={{ direction: 'ltr', textAlign: 'left' }}>
            {template}
          </pre>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {['{job_title}', '{company_name}', '{hiring_manager}', '{relevant_skills}', '{years_exp}'].map(v => (
          <span key={v} className="text-[10px] bg-sky-500/10 border border-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-mono">{v}</span>
        ))}
        <span className="text-[10px] text-slate-500">← متغيرات تتبدل تلقائياً</span>
      </div>
    </div>
  )
}

// ─── Step 3: Search ───────────────────────────────────────
function StepSearch({ status, jobsFound, pollCount, onSearch, onDemo, searching }: {
  status: 'idle'|'running'|'done'; jobsFound: number; pollCount: number;
  onSearch: () => void; onDemo: () => void; searching: boolean;
}) {
  return (
    <div className="py-4 space-y-4">
      <p className="text-sm text-slate-400">ابحثي عن وظائف مناسبة أو أضيفي وظائف تجريبية للاختبار</p>

      {status === 'running' && (
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 text-center">
          <RefreshCw size={28} className="text-sky-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-white">البحث جاري في الخلفية...</p>
          <p className="text-xs text-slate-500 mt-1">
            تحقق رقم {pollCount} — {jobsFound} وظيفة حتى الآن
          </p>
          <div className="mt-3 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full"
              style={{ width: `${Math.min(100, (pollCount / 18) * 100)}%`, transition: 'width 1s ease' }} />
          </div>
        </div>
      )}

      {(status === 'idle' || status === 'running') && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSearch}
            disabled={searching || status === 'running'}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-sky-500/25 bg-sky-500/8 hover:bg-sky-500/15 hover:border-sky-500/40 text-white transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
              <Search size={18} className="text-sky-400" />
            </div>
            <span className="font-bold text-sm">ابحثي الآن</span>
            <span className="text-[11px] text-slate-500 text-center leading-tight">يبحث في طاقات، جدارات، LinkedIn</span>
          </button>
          <button
            onClick={onDemo}
            disabled={searching}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-violet-500/25 bg-violet-500/8 hover:bg-violet-500/15 hover:border-violet-500/40 text-white transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              {searching ? <RefreshCw size={18} className="text-violet-400 animate-spin" /> : <Sparkles size={18} className="text-violet-400" />}
            </div>
            <span className="font-bold text-sm">وظائف تجريبية</span>
            <span className="text-[11px] text-slate-500 text-center leading-tight">5 وظائف فورية للاختبار</span>
          </button>
        </div>
      )}

      {(status === 'done' || jobsFound > 0) && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-300">وُجد {jobsFound} وظيفة!</p>
            <p className="text-xs text-slate-500">اضغطي "عرض X وظيفة" للمتابعة</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Pick Job ─────────────────────────────────────
function StepPick({ jobs, selected, onSelect, onRefresh }: {
  jobs: Job[]; selected: Job|null; onSelect: (j: Job) => void; onRefresh: () => void;
}) {
  if (jobs.length === 0) return (
    <div className="py-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
        <Briefcase size={24} className="text-slate-500" />
      </div>
      <p className="text-slate-300 font-medium mb-1">لا وظائف بعد</p>
      <p className="text-xs text-slate-500 mb-4">ارجعي للخطوة السابقة وابحثي</p>
      <button onClick={onRefresh} className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mx-auto">
        <RefreshCw size={12} />تحديث
      </button>
    </div>
  )
  return (
    <div className="space-y-2 py-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">اختاري وظيفة للتقديم عليها</p>
        <button onClick={onRefresh} className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors">
          <RefreshCw size={11} />تحديث
        </button>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pl-1">
        {jobs.map(job => (
          <button
            key={job.id}
            onClick={() => onSelect(job)}
            className={cn(
              'w-full text-right p-4 rounded-2xl border transition-all duration-150 flex items-start gap-3',
              selected?.id === job.id
                ? 'border-sky-500/50 bg-sky-500/10 shadow-lg shadow-sky-500/10'
                : 'border-white/[0.07] bg-white/[0.02] hover:border-sky-500/25 hover:bg-sky-500/5',
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
              selected?.id === job.id ? 'bg-sky-500 shadow-lg shadow-sky-500/40' : 'bg-white/[0.06]',
            )}>
              {selected?.id === job.id
                ? <CheckCircle2 size={16} className="text-white" />
                : <Briefcase size={14} className="text-slate-500" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-sm text-white leading-tight">{job.title}</p>
                <span className={cn('badge text-xs shrink-0 px-2 py-0.5 rounded-full font-bold', matchScoreBg(job.match_score))}>
                  {job.match_score}%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{job.company}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <MapPin size={9} />{cityLabels[job.city] ?? job.city}
                </span>
                {job.is_vision2030 && (
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full">رؤية 2030</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step 5: Send ─────────────────────────────────────────
function StepSend({ job, template, sent, sending }: {
  job: Job|null; template: string; sent: boolean; sending: boolean;
}) {
  if (!job) return (
    <div className="py-8 text-center">
      <AlertCircle size={28} className="text-amber-400 mx-auto mb-2" />
      <p className="text-slate-300">ارجعي واختاري وظيفة أولاً</p>
    </div>
  )

  const preview = template
    .replace(/{job_title}/g, job.title)
    .replace(/{company_name}/g, job.company)
    .replace(/{hiring_manager}/g, 'Hiring Manager')
    .replace(/{relevant_skills}/g, 'project management, smart city, PMP/PBA')
    .replace(/{years_exp}/g, '10+')
    .replace(/{industry}/g, 'project management & smart cities')

  if (sent) return (
    <div className="py-8 text-center space-y-3">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
        <CheckCircle2 size={32} className="text-emerald-400" />
      </div>
      <p className="text-xl font-black text-white">تم الإرسال! 🎉</p>
      <p className="text-sm text-slate-400">
        تم تقديم طلبك لـ <span className="text-white font-medium">{job.company}</span>
      </p>
      <p className="text-xs text-slate-500">ستصلك إشعارات بأي تحديثات على التقديم</p>
    </div>
  )

  return (
    <div className="space-y-4 py-2">
      {/* Job summary */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0">
          <Briefcase size={16} className="text-sky-400" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-white">{job.title}</p>
          <p className="text-xs text-slate-400">{job.company} — {cityLabels[job.city] ?? job.city}</p>
        </div>
        <span className={cn('badge text-xs mr-auto shrink-0 px-2 py-0.5 rounded-full font-bold', matchScoreBg(job.match_score))}>
          {job.match_score}%
        </span>
      </div>

      {/* Letter preview */}
      <div>
        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
          <Mail size={11} />
          معاينة الرسالة (Claude سيخصصها تلقائياً)
        </p>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 max-h-44 overflow-y-auto">
          <pre className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap font-sans" style={{ direction: 'ltr', textAlign: 'left' }}>
            {preview}
          </pre>
        </div>
      </div>

      {sending && (
        <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-3">
          <RefreshCw size={13} className="text-sky-400 animate-spin shrink-0" />
          <p className="text-xs text-sky-300">Claude يكتب رسالة مخصصة ويرسلها...</p>
        </div>
      )}
    </div>
  )
}
