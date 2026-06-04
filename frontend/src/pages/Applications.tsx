import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { applicationsApi, featuresApi } from '@/lib/api'
import { Application, ApplicationStage } from '@/types'
import { cn, statusColors, statusLabels, cityLabels, formatDateTime, platformLabels, platformColors } from '@/lib/utils'
import { RefreshCw, Mail, Eye, EyeOff, ChevronDown, ChevronUp, Building2, MapPin, LayoutGrid, List, X, StickyNote, Calendar, Heart, Minimize2, Maximize2 } from 'lucide-react'

const STAGES: { key: ApplicationStage; label: string; color: string; bg: string }[] = [
  { key: 'sent',      label: 'مرسلة',       color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 'viewed',    label: 'شُوهدت',      color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { key: 'reply',     label: 'ردّ',         color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { key: 'interview', label: 'مقابلة',      color: 'text-emerald-600',bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { key: 'offer',     label: 'عرض',         color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20' },
  { key: 'rejected',  label: 'مرفوضة',      color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
]

export default function Applications() {
  const qc = useQueryClient()
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [filterStatus, setFilterStatus] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notesModal, setNotesModal] = useState<{ id: string; text: string } | null>(null)
  const [rejectionModal, setRejectionModal] = useState<{ id: string; text: string } | null>(null)
  const [interviewModal, setInterviewModal] = useState<{ id: string; date: string } | null>(null)
  const [thankYouModal, setThankYouModal] = useState<{ app: Application; subject?: string; body?: string; loading?: boolean } | null>(null)
  const [compact, setCompact] = useState(false)

  const params: Record<string, string> = {}
  if (filterStatus) params.status = filterStatus

  const { data: apps = [], isLoading } = useQuery<Application[]>({
    queryKey: ['applications', params],
    queryFn: () => applicationsApi.list(params) as Promise<Application[]>,
    refetchInterval: 30000,
  })

  const resend = useMutation({
    mutationFn: (id: string) => applicationsApi.resend(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  })

  const updateStage = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ApplicationStage }) =>
      applicationsApi.updateStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  })

  const saveNotes = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      applicationsApi.setNotes(id, notes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); setNotesModal(null) },
  })

  const saveRejection = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      applicationsApi.setRejection(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); setRejectionModal(null) },
  })

  const saveInterview = useMutation({
    mutationFn: ({ id, interview_date }: { id: string; interview_date: string }) =>
      applicationsApi.setInterviewDate(id, interview_date),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); setInterviewModal(null) },
  })

  async function fetchThankYouEmail(app: Application) {
    setThankYouModal({ app, loading: true })
    try {
      const res = await featuresApi.thankYouEmail({
        company: app.job?.company || '',
        job_title: app.job?.title || '',
        interviewer_name: 'Hiring Manager',
      }) as { subject: string; body: string }
      setThankYouModal({ app, subject: res.subject, body: res.body, loading: false })
    } catch {
      setThankYouModal({ app, subject: 'Thank You', body: 'حدث خطأ في التوليد', loading: false })
    }
  }

  const STATUS_OPTS = [
    { value: '', label: 'الكل' },
    { value: 'sent', label: 'مرسلة' },
    { value: 'reviewing', label: 'قيد المراجعة' },
    { value: 'interview', label: 'مقابلة' },
    { value: 'rejected', label: 'مرفوضة' },
    { value: 'offer', label: 'عرض وظيفي' },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-bold text-xl">التقديمات</h1>
        <span className="badge-gray">{apps.length}</span>
        <div className="mr-auto flex flex-wrap gap-2 items-center">
          {STATUS_OPTS.map(o => (
            <button key={o.value} onClick={() => setFilterStatus(o.value)}
              className={cn('badge cursor-pointer transition-all px-3 py-1', filterStatus === o.value ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'badge-gray hover:bg-gray-200 dark:hover:bg-gray-700')}>
              {o.label}
            </button>
          ))}
          <button
            onClick={() => setCompact(v => !v)}
            className={cn('p-2 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors', compact ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500')}
            title={compact ? 'عرض موسّع' : 'عرض مضغوط'}
          >
            {compact ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <button onClick={() => setView('list')} className={cn('p-2 transition-colors', view === 'list' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800')}>
              <List size={16} />
            </button>
            <button onClick={() => setView('kanban')} className={cn('p-2 transition-colors', view === 'kanban' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800')}>
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-gray-100 dark:bg-gray-800" />)}</div>
      ) : apps.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">لا تقديمات في هذه الفئة</div>
      ) : view === 'kanban' ? (
        <KanbanView
          apps={apps}
          onStageChange={(id, stage) => {
            updateStage.mutate({ id, stage })
            if (stage === 'rejected') {
              setRejectionModal({ id, text: '' })
            }
            if (stage === 'interview') {
              setInterviewModal({ id, date: '' })
            }
          }}
          onNotes={(id, text) => setNotesModal({ id, text })}
        />
      ) : (
        <div className="space-y-3">
          {apps.map(app => (
            <div key={app.id} className="card overflow-hidden">
              {/* Main row */}
              <div className={cn('flex items-start gap-4', compact ? 'p-2' : 'p-4')}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <Link to={`/company/${app.company_id}`} className="font-semibold hover:text-primary-500 transition-colors">
                      {app.job?.title ?? '—'}
                    </Link>
                    <span className={cn('badge', statusColors[app.status])}>{statusLabels[app.status]}</span>
                    {app.stage && (
                      <span className={cn('badge', STAGES.find(s => s.key === app.stage)?.bg, STAGES.find(s => s.key === app.stage)?.color)}>
                        {STAGES.find(s => s.key === app.stage)?.label}
                      </span>
                    )}
                    {app.email_status === 'opened' && (
                      <span className="badge-green flex items-center gap-1">
                        <Eye size={11} />فُتح الإيميل
                      </span>
                    )}
                    {app.email_status === 'failed' && (
                      <span className="badge-red flex items-center gap-1">
                        <EyeOff size={11} />فشل الإرسال
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Building2 size={11} />{app.job?.company}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} />{cityLabels[app.job?.city as keyof typeof cityLabels] ?? '—'}</span>
                    {app.job?.platform && <span className={cn('badge', platformColors[app.job.platform])}>{platformLabels[app.job.platform]}</span>}
                    <span className="flex items-center gap-1"><Mail size={11} />{formatDateTime(app.sent_at)}</span>
                  </div>
                  {app.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-start gap-1">
                      <StickyNote size={11} className="mt-0.5 shrink-0" />{app.notes}
                    </p>
                  )}
                  {app.rejection_reason && (
                    <p className="text-xs text-red-500 mt-1">سبب الرفض: {app.rejection_reason}</p>
                  )}
                  {app.interview_date && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <Calendar size={11} />المقابلة: {formatDateTime(app.interview_date)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {app.success_score && (
                    <span className="text-xs text-gray-400">{app.success_score}% نجاح</span>
                  )}
                  {/* Stage selector */}
                  <select
                    value={app.stage || ''}
                    onChange={e => {
                      const stage = e.target.value as ApplicationStage
                      updateStage.mutate({ id: app.id, stage })
                      if (stage === 'rejected') setRejectionModal({ id: app.id, text: app.rejection_reason || '' })
                      if (stage === 'interview') setInterviewModal({ id: app.id, date: app.interview_date || '' })
                    }}
                    className="input text-xs py-1 px-2"
                  >
                    <option value="">المرحلة</option>
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <button onClick={() => setNotesModal({ id: app.id, text: app.notes || '' })} className="btn-ghost p-1.5 text-xs" title="ملاحظة">
                    <StickyNote size={13} />
                  </button>
                  <button onClick={() => setExpandedId(expandedId === app.id ? null : app.id)} className="btn-ghost px-2 py-1 text-xs">
                    {expandedId === app.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    الرسالة
                  </button>
                  <button onClick={() => resend.mutate(app.id)} disabled={resend.isPending} className="btn-secondary text-xs px-2 py-1" title="إعادة الإرسال">
                    <RefreshCw size={13} />
                  </button>
                  {(app.stage === 'interview' || app.status === 'interview') && (
                    <button onClick={() => fetchThankYouEmail(app)} className="btn-secondary text-xs px-2 py-1 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20" title="إيميل شكر">
                      <Heart size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Letter preview */}
              {expandedId === app.id && (
                <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50 animate-slide-down">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">نص الرسالة المرسلة:</p>
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                    {app.letter_text}
                  </pre>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Link to={`/company/${app.company_id}`} className="btn-secondary text-xs px-3 py-1.5">
                      <Building2 size={13} />ملف الشركة
                    </Link>
                    {app.job?.apply_url && (
                      <a href={app.job.apply_url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs px-3 py-1.5">
                        رابط الوظيفة
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Follow-up info */}
              {app.next_followup_at && app.status !== 'rejected' && (
                <div className="border-t border-gray-50 dark:border-gray-800 px-4 py-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10">
                  <Mail size={12} />
                  متابعة مجدولة: {formatDateTime(app.next_followup_at)}
                  <span className="text-gray-400">({app.follow_up_count}/2)</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setNotesModal(null)}>
          <div className="card p-5 w-full max-w-sm animate-slide-up space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">ملاحظة</h3>
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
              <button onClick={() => saveNotes.mutate({ id: notesModal.id, notes: notesModal.text })} className="btn-primary text-xs">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejectionModal(null)}>
          <div className="card p-5 w-full max-w-sm animate-slide-up space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">سبب الرفض</h3>
              <button onClick={() => setRejectionModal(null)} className="btn-ghost p-1"><X size={14} /></button>
            </div>
            <textarea
              className="input resize-none text-sm"
              rows={3}
              value={rejectionModal.text}
              onChange={e => setRejectionModal(p => p ? { ...p, text: e.target.value } : null)}
              placeholder="ما سبب رفض الطلب؟"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectionModal(null)} className="btn-secondary text-xs">تخطي</button>
              <button onClick={() => saveRejection.mutate({ id: rejectionModal.id, reason: rejectionModal.text })} className="btn-primary text-xs">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Date Modal */}
      {interviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setInterviewModal(null)}>
          <div className="card p-5 w-full max-w-sm animate-slide-up space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">تاريخ المقابلة</h3>
              <button onClick={() => setInterviewModal(null)} className="btn-ghost p-1"><X size={14} /></button>
            </div>
            <input
              type="datetime-local"
              className="input"
              value={interviewModal.date}
              onChange={e => setInterviewModal(p => p ? { ...p, date: e.target.value } : null)}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setInterviewModal(null)} className="btn-secondary text-xs">تخطي</button>
              <button onClick={() => saveInterview.mutate({ id: interviewModal.id, interview_date: interviewModal.date })} disabled={!interviewModal.date} className="btn-primary text-xs">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Email Modal */}
      {thankYouModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setThankYouModal(null)}>
          <div className="card p-5 w-full max-w-lg animate-slide-up space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Heart size={16} className="text-pink-500" />إيميل الشكر</h3>
              <button onClick={() => setThankYouModal(null)} className="btn-ghost p-1"><X size={14} /></button>
            </div>
            <p className="text-xs text-gray-500">{thankYouModal.app.job?.title} — {thankYouModal.app.job?.company}</p>
            {thankYouModal.loading ? (
              <div className="py-8 text-center text-gray-400 text-sm animate-pulse">جارٍ توليد الإيميل...</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">الموضوع:</p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm font-medium">{thankYouModal.subject}</div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">نص الرسالة:</p>
                  <pre className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">{thankYouModal.body}</pre>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { navigator.clipboard?.writeText(`Subject: ${thankYouModal.subject}\n\n${thankYouModal.body}`) }} className="btn-secondary text-xs">نسخ</button>
                  <button onClick={() => setThankYouModal(null)} className="btn-primary text-xs">تم</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function KanbanView({ apps, onStageChange, onNotes }: {
  apps: Application[]
  onStageChange: (id: string, stage: ApplicationStage) => void
  onNotes: (id: string, text: string) => void
}) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {STAGES.map(stage => {
          const stageApps = apps.filter(a => (a.stage || 'sent') === stage.key)
          return (
            <div key={stage.key} className="w-64 shrink-0">
              <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl mb-3', stage.bg)}>
                <span className={cn('font-semibold text-sm', stage.color)}>{stage.label}</span>
                <span className="text-xs bg-white/60 dark:bg-black/20 px-1.5 py-0.5 rounded-lg font-medium">{stageApps.length}</span>
              </div>
              <div className="space-y-3">
                {stageApps.map(app => (
                  <KanbanCard
                    key={app.id}
                    app={app}
                    stages={STAGES}
                    onStageChange={onStageChange}
                    onNotes={onNotes}
                  />
                ))}
                {stageApps.length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                    لا تقديمات
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KanbanCard({ app, stages, onStageChange, onNotes }: {
  app: Application
  stages: typeof STAGES
  onStageChange: (id: string, stage: ApplicationStage) => void
  onNotes: (id: string, text: string) => void
}) {
  return (
    <div className="card p-3 space-y-2 hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-semibold line-clamp-1">{app.job?.title ?? '—'}</p>
        <p className="text-xs text-gray-500">{app.job?.company}</p>
      </div>
      {app.notes && (
        <p className="text-xs text-gray-500 line-clamp-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1">{app.notes}</p>
      )}
      <div className="flex items-center gap-1 flex-wrap">
        {stages.filter(s => s.key !== (app.stage || 'sent')).slice(0, 3).map(s => (
          <button
            key={s.key}
            onClick={() => onStageChange(app.id, s.key)}
            className={cn('text-xs px-2 py-0.5 rounded-lg transition-colors', s.bg, s.color, 'hover:opacity-80')}
          >
            {s.label}
          </button>
        ))}
        <button onClick={() => onNotes(app.id, app.notes || '')} className="btn-ghost p-1 text-gray-400 mr-auto">
          <StickyNote size={12} />
        </button>
      </div>
    </div>
  )
}
