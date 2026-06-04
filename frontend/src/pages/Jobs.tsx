import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsApi, featuresApi } from '@/lib/api'
import { Job, City, Platform } from '@/types'
import { cn, cityLabels, platformColors, platformLabels, matchScoreBg, formatDate, cityOrder } from '@/lib/utils'
import {
  Filter, Plus, CheckCheck, CheckCircle2, XCircle,
  MapPin, ExternalLink, ChevronDown, ChevronUp, Star, Zap,
  LayoutGrid, List, Search, StickyNote, DollarSign, GitCompare, X,
  MessageSquare, ShieldAlert, Languages, Maximize2, Minimize2,
} from 'lucide-react'
import SalaryEstimate from '@/components/jobs/SalaryEstimate'
import JobCompare from '@/components/jobs/JobCompare'

const STATUS_OPTS = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'في الانتظار' },
  { value: 'approved', label: 'معتمدة' },
  { value: 'applied', label: 'تم التقديم' },
]

export default function Jobs() {
  const qc = useQueryClient()
  const [view, setView] = useState<'cards' | 'list'>('cards')
  const [filterCity, setFilterCity] = useState<City | ''>('')
  const [filterPlatform, setFilterPlatform] = useState<Platform | ''>('')
  const [filterStatus, setFilterStatus] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [notesModal, setNotesModal] = useState<{ id: string; text: string } | null>(null)
  const [salaryJob, setSalaryJob] = useState<Job | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [compact, setCompact] = useState(false)
  const [jobSummaries, setJobSummaries] = useState<Record<string, string>>({})
  const [jobFakeChecks, setJobFakeChecks] = useState<Record<string, { is_fake: boolean; reason: string; confidence: number }>>({})
  const [translateModal, setTranslateModal] = useState<{ job: Job; translated?: string; loading?: boolean } | null>(null)

  const params: Record<string, string> = {}
  if (filterCity) params.city = filterCity
  if (filterPlatform) params.platform = filterPlatform
  if (filterStatus) params.status = filterStatus
  if (minScore) params.min_score = String(minScore)

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['jobs', params],
    queryFn: () => jobsApi.list(params) as Promise<Job[]>,
    refetchInterval: 30000,
  })

  const sortedJobs = [...jobs].sort((a, b) => {
    const ai = cityOrder.indexOf(a.city)
    const bi = cityOrder.indexOf(b.city)
    if (ai !== bi) return ai - bi
    return b.match_score - a.match_score
  })

  const filteredJobs = keyword
    ? sortedJobs.filter(j =>
        j.title.includes(keyword) || j.company.includes(keyword) || j.description.includes(keyword)
      )
    : sortedJobs

  const approveAll = useMutation({ mutationFn: jobsApi.approveAll, onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }) })
  const approveJob = useMutation({ mutationFn: (id: string) => jobsApi.approve(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }) })
  const rejectJob = useMutation({ mutationFn: (id: string) => jobsApi.reject(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }) })
  const starJob = useMutation({ mutationFn: (id: string) => jobsApi.toggleStar(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }) })
  const setNotes = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => jobsApi.setNotes(id, notes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); setNotesModal(null) },
  })

  const pendingCount = jobs.filter(j => j.status === 'pending').length

  function toggleCompare(id: string) {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const compareJob1 = compareIds[0] ? jobs.find(j => j.id === compareIds[0]) : undefined
  const compareJob2 = compareIds[1] ? jobs.find(j => j.id === compareIds[1]) : undefined

  async function fetchJobSummary(job: Job) {
    if (jobSummaries[job.id]) return
    try {
      const res = await featuresApi.jobSummary({ title: job.title, description: job.description }) as { summary: string }
      setJobSummaries(prev => ({ ...prev, [job.id]: res.summary }))
    } catch {}
  }

  async function fetchFakeCheck(job: Job) {
    if (jobFakeChecks[job.id]) return
    try {
      const res = await featuresApi.fakeJobCheck({ title: job.title, company: job.company, description: job.description, apply_url: job.apply_url || '' }) as { is_fake: boolean; reason: string; confidence: number }
      setJobFakeChecks(prev => ({ ...prev, [job.id]: res }))
    } catch {}
  }

  async function fetchTranslation(job: Job) {
    setTranslateModal({ job, loading: true })
    try {
      const res = await featuresApi.translate({ text: job.description, target: 'ar' }) as { translated: string }
      setTranslateModal({ job, translated: res.translated, loading: false })
    } catch {
      setTranslateModal({ job, translated: 'تعذّر الترجمة', loading: false })
    }
  }

  function highlight(text: string) {
    if (!keyword) return text
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'))
    return parts.map((p, i) =>
      p.toLowerCase() === keyword.toLowerCase()
        ? `<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">${p}</mark>`
        : p
    ).join('')
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-bold text-xl">الوظائف</h1>
        <span className="badge-gray">{filteredJobs.length} وظيفة</span>
        {jobs.some(j => j.is_vision2030) && (
          <span className="badge-sky flex items-center gap-1"><Star size={11} />رؤية 2030</span>
        )}
        <div className="mr-auto flex items-center gap-2 flex-wrap">
          {/* Keyword search */}
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input text-sm py-1.5 pr-8 w-40"
              placeholder="كلمة مفتاحية..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
            />
          </div>
          {pendingCount > 0 && (
            <button onClick={() => approveAll.mutate()} disabled={approveAll.isPending} className="btn-primary text-xs px-3 py-1.5">
              <CheckCheck size={13} />اعتمد الكل ({pendingCount})
            </button>
          )}
          {compareIds.length === 2 && (
            <button onClick={() => setShowCompare(true)} className="btn-secondary text-xs px-3 py-1.5 text-primary-600 dark:text-primary-400">
              <GitCompare size={13} />قارن ({compareIds.length})
            </button>
          )}
          {compareIds.length > 0 && (
            <button onClick={() => setCompareIds([])} className="btn-ghost text-xs px-2 py-1.5 text-gray-500">
              <X size={13} />إلغاء
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} className="btn-secondary text-xs px-3 py-1.5">
            <Plus size={13} />إضافة يدوياً
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className={cn('btn-secondary text-xs px-3 py-1.5', showFilters && 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400')}>
            <Filter size={13} />فلترة
          </button>
          <button
            onClick={() => setCompact(v => !v)}
            className={cn('p-2 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors', compact ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500')}
            title={compact ? 'عرض موسّع' : 'عرض مضغوط'}
          >
            {compact ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <button onClick={() => setView('cards')} className={cn('p-2 transition-colors', view === 'cards' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800')}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setView('list')} className={cn('p-2 transition-colors', view === 'list' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800')}>
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Compare selection notice */}
      {compareIds.length > 0 && (
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl px-4 py-2 text-sm text-primary-700 dark:text-primary-300 flex items-center gap-2">
          <GitCompare size={14} />
          حددتِ {compareIds.length} وظيفة للمقارنة
          {compareIds.length < 2 && ' — اختاري وظيفة ثانية'}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-down">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">المدينة</label>
            <select className="input text-sm py-2" value={filterCity} onChange={e => setFilterCity(e.target.value as City | '')}>
              <option value="">الكل</option>
              {cityOrder.map(c => <option key={c} value={c}>{cityLabels[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">المنصة</label>
            <select className="input text-sm py-2" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value as Platform | '')}>
              <option value="">الكل</option>
              {(['taqat','jadarat','linkedin','bayt','indeed','manual'] as Platform[]).map(p => (
                <option key={p} value={p}>{platformLabels[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">الحالة</label>
            <select className="input text-sm py-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">نسبة التطابق ≥ {minScore}%</label>
            <input type="range" min={0} max={100} step={5} value={minScore} onChange={e => setMinScore(+e.target.value)} className="w-full accent-primary-500" />
          </div>
        </div>
      )}

      {/* Job list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 h-56 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="card p-12 text-center">
          <Search size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500">لا وظائف تطابق الفلاتر المحددة</p>
        </div>
      ) : view === 'cards' ? (
        <div className={cn('grid gap-4', compact ? 'grid-cols-1 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3')}>
          {filteredJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              expanded={expandedId === job.id}
              onToggle={() => setExpandedId(expandedId === job.id ? null : job.id)}
              onApprove={() => approveJob.mutate(job.id)}
              onReject={() => rejectJob.mutate(job.id)}
              onStar={() => starJob.mutate(job.id)}
              onNotes={() => setNotesModal({ id: job.id, text: job.notes || '' })}
              onSalary={() => setSalaryJob(job)}
              compareSelected={compareIds.includes(job.id)}
              onCompare={() => toggleCompare(job.id)}
              keyword={keyword}
              highlight={highlight}
              compact={compact}
              summary={jobSummaries[job.id]}
              fakeCheck={jobFakeChecks[job.id]}
              onSummary={() => fetchJobSummary(job)}
              onFakeCheck={() => fetchFakeCheck(job)}
              onTranslate={() => fetchTranslation(job)}
            />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['', 'المسمى', 'الشركة', 'المدينة', 'المنصة', 'التطابق', 'التاريخ', 'إجراء'].map(h => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredJobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-2 py-3">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(job.id)}
                      onChange={() => toggleCompare(job.id)}
                      className="accent-primary-500"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium max-w-xs truncate">
                    <div className="flex items-center gap-1.5">
                      {job.is_starred && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
                      {job.title}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate">{job.company}</td>
                  <td className="px-4 py-3"><span className="badge-gray">{cityLabels[job.city] ?? job.city}</span></td>
                  <td className="px-4 py-3"><span className={cn('badge', platformColors[job.platform])}>{platformLabels[job.platform]}</span></td>
                  <td className="px-4 py-3"><span className={cn('badge', matchScoreBg(job.match_score))}>{job.match_score}%</span></td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(job.published_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <button onClick={() => starJob.mutate(job.id)} className={cn('p-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors', job.is_starred ? 'text-amber-400' : 'text-gray-400')}>
                        <Star size={14} className={job.is_starred ? 'fill-amber-400' : ''} />
                      </button>
                      <button onClick={() => setNotesModal({ id: job.id, text: job.notes || '' })} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                        <StickyNote size={14} />
                      </button>
                      <button onClick={() => setSalaryJob(job)} className="p-1 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-500 transition-colors">
                        <DollarSign size={14} />
                      </button>
                      {job.status === 'pending' && (
                        <>
                          <button onClick={() => approveJob.mutate(job.id)} className="text-green-600 hover:text-green-700 p-1 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                            <CheckCircle2 size={16} />
                          </button>
                          <button onClick={() => rejectJob.mutate(job.id)} className="text-red-500 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      {job.status === 'applied' && <span className="badge-green">مُقدَّم</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} onSave={(data) => { jobsApi.addManual(data); setShowAddModal(false); qc.invalidateQueries({ queryKey: ['jobs'] }) }} />}

      {/* Translation Modal */}
      {translateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setTranslateModal(null)}>
          <div className="card p-5 w-full max-w-lg animate-slide-up space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Languages size={16} />ترجمة الوظيفة</h3>
              <button onClick={() => setTranslateModal(null)} className="btn-ghost p-1"><X size={14} /></button>
            </div>
            <p className="text-xs text-gray-500">{translateModal.job.title} — {translateModal.job.company}</p>
            {translateModal.loading ? (
              <div className="py-8 text-center text-gray-400 text-sm animate-pulse">جارٍ الترجمة...</div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-64 overflow-y-auto">
                {translateModal.translated}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setNotesModal(null)}>
          <div className="card p-5 w-full max-w-sm animate-slide-up space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">ملاحظة على الوظيفة</h3>
              <button onClick={() => setNotesModal(null)} className="btn-ghost p-1"><X size={14} /></button>
            </div>
            <textarea
              className="input resize-none text-sm"
              rows={4}
              value={notesModal.text}
              onChange={e => setNotesModal(p => p ? { ...p, text: e.target.value } : null)}
              placeholder="اكتبي ملاحظتك..."
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setNotesModal(null)} className="btn-secondary text-xs">إلغاء</button>
              <button onClick={() => setNotes.mutate({ id: notesModal.id, notes: notesModal.text })} className="btn-primary text-xs">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Modal */}
      {salaryJob && <SalaryEstimate job={salaryJob} onClose={() => setSalaryJob(null)} />}

      {/* Compare Modal */}
      {showCompare && compareJob1 && compareJob2 && (
        <JobCompare job1={compareJob1} job2={compareJob2} onClose={() => setShowCompare(false)} />
      )}
    </div>
  )
}

function JobCard({ job, expanded, onToggle, onApprove, onReject, onStar, onNotes, onSalary, compareSelected, onCompare, keyword, highlight, compact, summary, fakeCheck, onSummary, onFakeCheck, onTranslate }: {
  job: Job
  expanded: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
  onStar: () => void
  onNotes: () => void
  onSalary: () => void
  compareSelected: boolean
  onCompare: () => void
  keyword: string
  highlight: (text: string) => string
  compact?: boolean
  summary?: string
  fakeCheck?: { is_fake: boolean; reason: string; confidence: number }
  onSummary: () => void
  onFakeCheck: () => void
  onTranslate: () => void
}) {
  // Company initial for avatar
  const initial = job.company?.charAt(0) || '؟'
  const avatarGradients = [
    'from-sky-400 to-blue-600',
    'from-emerald-400 to-teal-600',
    'from-violet-400 to-purple-600',
    'from-amber-400 to-orange-600',
    'from-rose-400 to-pink-600',
    'from-indigo-400 to-blue-600',
  ]
  const avatarGrad = avatarGradients[(job.company?.charCodeAt(0) ?? 0) % avatarGradients.length]

  return (
    <div className={cn('card-hover flex flex-col gap-3 transition-all duration-200',
      compact ? 'p-3' : 'p-4',
      job.is_vision2030 && 'border-sky-200 dark:border-sky-500/20',
      job.is_starred && 'border-amber-200 dark:border-amber-500/20',
      compareSelected && 'ring-2 ring-sky-400 dark:ring-sky-500/60',
    )}>
      {/* Starred glow accent */}
      {job.is_starred && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: '0 0 0 1px rgba(245,158,11,0.2), 0 0 20px rgba(245,158,11,0.05)' }} />
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Company avatar */}
        {!compact && (
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br text-white font-black text-sm shadow-sm', avatarGrad)}>
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {job.is_vision2030 && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
            <h3 className={cn('font-bold truncate', compact ? 'text-xs' : 'text-sm')}>{job.title}</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{job.company}</p>
          {/* AI Summary */}
          {summary && (
            <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5 italic">{summary}</p>
          )}
          {/* Fake check */}
          {fakeCheck && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full mt-0.5 inline-block font-medium', fakeCheck.is_fake ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300')}>
              {fakeCheck.is_fake ? `⚠️ مشبوهة (${fakeCheck.confidence}%)` : `✓ موثوقة (${fakeCheck.confidence}%)`}
            </span>
          )}
        </div>
        {/* Match score ring */}
        <div
          className="match-ring shrink-0 text-gray-700 dark:text-white font-black"
          style={{
            '--ring-color': job.match_score >= 80 ? '#10b981' : job.match_score >= 60 ? '#0ea5e9' : '#f59e0b',
            '--ring-pct': `${job.match_score}%`,
          } as React.CSSProperties}
        >
          {job.match_score}%
        </div>
      </div>

      {!compact && (
        <>
          {/* Meta */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <MapPin size={11} />{cityLabels[job.city] ?? job.city}
            </span>
            <span className={cn('badge', platformColors[job.platform])}>{platformLabels[job.platform]}</span>
            {job.published_at && (
              <span className="text-gray-400">{formatDate(job.published_at)}</span>
            )}
          </div>

          {/* Description */}
          <div className="relative">
            <p
              className={cn('text-xs text-gray-600 dark:text-gray-300 leading-relaxed', !expanded && 'line-clamp-3')}
              dangerouslySetInnerHTML={{ __html: highlight(job.description) }}
            />
            <button onClick={onToggle} className="text-primary-500 text-xs flex items-center gap-1 mt-1 hover:text-primary-600">
              {expanded ? <><ChevronUp size={12} />أقل</> : <><ChevronDown size={12} />المزيد</>}
            </button>
          </div>

          {/* Notes */}
          {job.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              {job.notes}
            </div>
          )}

          {/* Requirements */}
          {expanded && job.requirements && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">المتطلبات:</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: highlight(job.requirements) }} />
            </div>
          )}

          {/* Links */}
          {expanded && (job.apply_url || job.apply_email) && (
            <div className="flex gap-2 text-xs">
              {job.apply_url && (
                <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600 flex items-center gap-1">
                  <ExternalLink size={11} />رابط الوظيفة
                </a>
              )}
              {job.apply_email && (
                <span className="text-gray-500 flex items-center gap-1">📧 {job.apply_email}</span>
              )}
            </div>
          )}
        </>
      )}

      {/* Compact meta */}
      {compact && (
        <div className="flex flex-wrap gap-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-0.5"><MapPin size={10} />{cityLabels[job.city] ?? job.city}</span>
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex items-center gap-1 mt-auto pt-1 border-t border-gray-100 dark:border-gray-800 flex-wrap">
        <button onClick={onStar} className={cn('p-1.5 rounded-xl transition-colors', job.is_starred ? 'text-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-400 hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20')} title="تمييز">
          <Star size={13} className={job.is_starred ? 'fill-amber-400' : ''} />
        </button>
        {!compact && (
          <>
            <button onClick={onNotes} className="p-1.5 rounded-xl text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors" title="ملاحظة">
              <StickyNote size={13} />
            </button>
            <button onClick={onSalary} className="p-1.5 rounded-xl text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="تقدير الراتب">
              <DollarSign size={13} />
            </button>
            <button
              onClick={onCompare}
              className={cn('p-1.5 rounded-xl transition-colors', compareSelected ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20')}
              title="إضافة للمقارنة"
            >
              <GitCompare size={13} />
            </button>
            <button onClick={onSummary} className="p-1.5 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="ملخص AI">
              <MessageSquare size={13} />
            </button>
            <button onClick={onFakeCheck} className="p-1.5 rounded-xl text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors" title="فحص مصداقية">
              <ShieldAlert size={13} />
            </button>
            <button onClick={onTranslate} className="p-1.5 rounded-xl text-gray-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors" title="ترجمة">
              <Languages size={13} />
            </button>
          </>
        )}
        <div className="flex-1" />
        {job.status === 'pending' && (
          <>
            <button onClick={onApprove} className="btn-primary text-xs px-2 py-1.5">
              <CheckCircle2 size={13} /> {compact ? '' : 'وافقت'}
            </button>
            <button onClick={onReject} className="btn-danger text-xs px-2 py-1.5">
              <XCircle size={13} />
            </button>
          </>
        )}
        {job.status === 'approved' && (
          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Zap size={13} />{compact ? '' : 'في قائمة الإرسال'}
          </span>
        )}
        {job.status === 'applied' && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 size={13} />{compact ? '' : 'تم التقديم'}
          </span>
        )}
      </div>
    </div>
  )
}

function AddJobModal({ onClose, onSave }: { onClose: () => void; onSave: (data: unknown) => void }) {
  const [form, setForm] = useState({ title: '', company: '', city: 'madinah', apply_email: '', apply_url: '', description: '' })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-slide-up space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold">إضافة وظيفة يدوياً</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="text-xs font-medium block mb-1">المسمى الوظيفي *</label><input className="input" value={form.title} onChange={f('title')} /></div>
          <div><label className="text-xs font-medium block mb-1">الشركة *</label><input className="input" value={form.company} onChange={f('company')} /></div>
          <div><label className="text-xs font-medium block mb-1">المدينة</label><select className="input" value={form.city} onChange={f('city')}>{cityOrder.map(c => <option key={c} value={c}>{cityLabels[c]}</option>)}</select></div>
          <div><label className="text-xs font-medium block mb-1">إيميل التقديم</label><input className="input" type="email" value={form.apply_email} onChange={f('apply_email')} /></div>
          <div><label className="text-xs font-medium block mb-1">رابط التقديم</label><input className="input" value={form.apply_url} onChange={f('apply_url')} /></div>
          <div className="col-span-2"><label className="text-xs font-medium block mb-1">وصف الوظيفة</label><textarea className="input resize-none" rows={3} value={form.description} onChange={f('description')} /></div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={() => form.title && form.company && onSave({ ...form, platform: 'manual', status: 'pending' })} className="btn-primary" disabled={!form.title || !form.company}>حفظ وإضافة</button>
        </div>
      </div>
    </div>
  )
}
