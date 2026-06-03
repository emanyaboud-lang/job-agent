import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsApi } from '@/lib/api'
import { Job } from '@/types'
import { cn, cityLabels, platformColors, platformLabels, matchScoreBg, formatDate } from '@/lib/utils'
import { Undo2, XCircle, MapPin } from 'lucide-react'

export default function RejectedJobs() {
  const qc = useQueryClient()

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['jobs', { status: 'rejected' }],
    queryFn: () => jobsApi.list({ status: 'rejected' }) as Promise<Job[]>,
  })

  const restore = useMutation({
    mutationFn: (id: string) => jobsApi.restore(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  if (isLoading) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <h1 className="font-bold text-xl">الوظائف المرفوضة</h1>
        <span className="badge-red">{jobs.length} وظيفة</span>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <XCircle size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500">لا وظائف مرفوضة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map(job => (
            <div key={job.id} className="card p-4 opacity-75 hover:opacity-100 transition-opacity space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{job.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{job.company}</p>
                </div>
                <span className={cn('badge shrink-0', matchScoreBg(job.match_score))}>{job.match_score}%</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <MapPin size={11} />{cityLabels[job.city] ?? job.city}
                </span>
                <span className={cn('badge', platformColors[job.platform])}>{platformLabels[job.platform]}</span>
                {job.published_at && <span className="text-gray-400">{formatDate(job.published_at)}</span>}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{job.description}</p>
              <button
                onClick={() => restore.mutate(job.id)}
                disabled={restore.isPending}
                className="btn-secondary text-xs w-full justify-center py-1.5"
              >
                <Undo2 size={13} />
                إرجاع للقائمة
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
