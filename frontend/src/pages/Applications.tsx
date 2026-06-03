import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { applicationsApi } from '@/lib/api'
import { Application } from '@/types'
import { cn, statusColors, statusLabels, cityLabels, formatDateTime, platformLabels, platformColors } from '@/lib/utils'
import { RefreshCw, Mail, Eye, EyeOff, ChevronDown, ChevronUp, Building2, MapPin } from 'lucide-react'

export default function Applications() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
        <div className="mr-auto flex flex-wrap gap-2">
          {STATUS_OPTS.map(o => (
            <button key={o.value} onClick={() => setFilterStatus(o.value)}
              className={cn('badge cursor-pointer transition-all px-3 py-1', filterStatus === o.value ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'badge-gray hover:bg-gray-200 dark:hover:bg-gray-700')}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-gray-100 dark:bg-gray-800" />)}</div>
      ) : apps.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">لا تقديمات في هذه الفئة</div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => (
            <div key={app.id} className="card overflow-hidden">
              {/* Main row */}
              <div className="flex items-start gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <Link to={`/company/${app.company_id}`} className="font-semibold hover:text-primary-500 transition-colors">
                      {app.job?.title ?? '—'}
                    </Link>
                    <span className={cn('badge', statusColors[app.status])}>{statusLabels[app.status]}</span>
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
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {app.success_score && (
                    <span className="text-xs text-gray-400">{app.success_score}% نجاح</span>
                  )}
                  <button onClick={() => setExpandedId(expandedId === app.id ? null : app.id)} className="btn-ghost px-2 py-1 text-xs">
                    {expandedId === app.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    الرسالة
                  </button>
                  <button onClick={() => resend.mutate(app.id)} disabled={resend.isPending} className="btn-secondary text-xs px-2 py-1" title="إعادة الإرسال">
                    <RefreshCw size={13} />
                  </button>
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
    </div>
  )
}
