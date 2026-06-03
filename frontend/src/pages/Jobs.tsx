import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsApi } from '@/lib/api'
import { Job, City, Platform } from '@/types'
import { cn, cityLabels, platformColors, platformLabels, matchScoreBg, formatDate, cityOrder } from '@/lib/utils'
import {
  Filter, Plus, CheckCheck, CheckCircle2, XCircle,
  MapPin, ExternalLink, ChevronDown, ChevronUp, Star, Zap,
  LayoutGrid, List, Search,
} from 'lucide-react'

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

  const approveAll = useMutation({ mutationFn: jobsApi.approveAll, onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }) })
  const approveJob = useMutation({ mutationFn: (id: string) => jobsApi.approve(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }) })
  const rejectJob = useMutation({ mutationFn: (id: string) => jobsApi.reject(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }) })

  const pendingCount = jobs.filter(j => j.status === 'pending').length

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-bold text-xl">الوظائف</h1>
        <span className="badge-gray">{jobs.length} وظيفة</span>
        {jobs.some(j => j.is_vision2030) && (
          <span className="badge-sky flex items-center gap-1"><Star size={11} />رؤية 2030</span>
        )}
        <div className="mr-auto flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && (
            <button onClick={() => approveAll.mutate()} disabled={approveAll.isPending} className="btn-primary text-xs px-3 py-1.5">
              <CheckCheck size={13} />اعتمد الكل ({pendingCount})
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} className="btn-secondary text-xs px-3 py-1.5">
            <Plus size={13} />إضافة يدوياً
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className={cn('btn-secondary text-xs px-3 py-1.5', showFilters && 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400')}>
            <Filter size={13} />فلترة
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
      ) : sortedJobs.length === 0 ? (
        <div className="card p-12 text-center">
          <Search size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500">لا وظائف تطابق الفلاتر المحددة</p>
        </div>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              expanded={expandedId === job.id}
              onToggle={() => setExpandedId(expandedId === job.id ? null : job.id)}
              onApprove={() => approveJob.mutate(job.id)}
              onReject={() => rejectJob.mutate(job.id)}
            />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['المسمى', 'الشركة', 'المدينة', 'المنصة', 'التطابق', 'التاريخ', 'إجراء'].map(h => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {sortedJobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{job.title}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate">{job.company}</td>
                  <td className="px-4 py-3"><span className="badge-gray">{cityLabels[job.city] ?? job.city}</span></td>
                  <td className="px-4 py-3"><span className={cn('badge', platformColors[job.platform])}>{platformLabels[job.platform]}</span></td>
                  <td className="px-4 py-3"><span className={cn('badge', matchScoreBg(job.match_score))}>{job.match_score}%</span></td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(job.published_at)}</td>
                  <td className="px-4 py-3">
                    {job.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => approveJob.mutate(job.id)} className="text-green-600 hover:text-green-700 p-1 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                          <CheckCircle2 size={16} />
                        </button>
                        <button onClick={() => rejectJob.mutate(job.id)} className="text-red-500 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <XCircle size={16} />
                        </button>
                      </div>
                    )}
                    {job.status === 'applied' && <span className="badge-green">مُقدَّم</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} onSave={(data) => { jobsApi.addManual(data); setShowAddModal(false); qc.invalidateQueries({ queryKey: ['jobs'] }) }} />}
    </div>
  )
}

function JobCard({ job, expanded, onToggle, onApprove, onReject }: {
  job: Job
  expanded: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className={cn('card flex flex-col gap-3 p-4 transition-all duration-200', job.is_vision2030 && 'border-primary-200 dark:border-primary-800')}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {job.is_vision2030 && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
            <h3 className="font-semibold text-sm truncate">{job.title}</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{job.company}</p>
        </div>
        <span className={cn('badge shrink-0', matchScoreBg(job.match_score))}>{job.match_score}%</span>
      </div>

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
        <p className={cn('text-xs text-gray-600 dark:text-gray-300 leading-relaxed', !expanded && 'line-clamp-3')}>
          {job.description}
        </p>
        <button onClick={onToggle} className="text-primary-500 text-xs flex items-center gap-1 mt-1 hover:text-primary-600">
          {expanded ? <><ChevronUp size={12} />أقل</> : <><ChevronDown size={12} />المزيد</>}
        </button>
      </div>

      {/* Requirements */}
      {expanded && job.requirements && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">المتطلبات:</p>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{job.requirements}</p>
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

      {/* Actions */}
      {job.status === 'pending' && (
        <div className="flex gap-2 mt-auto pt-1 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onApprove} className="btn-primary text-xs flex-1 justify-center py-1.5">
            <CheckCircle2 size={13} /> وافقت
          </button>
          <button onClick={onReject} className="btn-danger text-xs px-3 py-1.5">
            <XCircle size={13} />
          </button>
        </div>
      )}
      {job.status === 'approved' && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-auto pt-1 border-t border-gray-100 dark:border-gray-800">
          <Zap size={13} />في قائمة الإرسال
        </div>
      )}
      {job.status === 'applied' && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mt-auto pt-1 border-t border-gray-100 dark:border-gray-800">
          <CheckCircle2 size={13} />تم التقديم
        </div>
      )}
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
