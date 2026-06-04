import { useMutation } from '@tanstack/react-query'
import { jobsApi } from '@/lib/api'
import { Job } from '@/types'
import { cn, cityLabels, platformLabels, matchScoreBg } from '@/lib/utils'
import { X, MapPin } from 'lucide-react'

interface Props {
  job1: Job
  job2: Job
  onClose: () => void
}

export default function JobCompare({ job1, job2, onClose }: Props) {
  const compareMut = useMutation({
    mutationFn: () => jobsApi.compare(job1.id, job2.id),
  })

  const rows: { label: string; key: keyof Job }[] = [
    { label: 'المسمى الوظيفي', key: 'title' },
    { label: 'الشركة',         key: 'company' },
    { label: 'المدينة',        key: 'city' },
    { label: 'المنصة',         key: 'platform' },
    { label: 'نسبة التطابق',   key: 'match_score' },
  ]

  function renderCell(job: Job, key: keyof Job) {
    const val = job[key]
    if (key === 'city') return <span className="badge-gray">{cityLabels[val as keyof typeof cityLabels] ?? String(val)}</span>
    if (key === 'platform') return <span className="badge-sky">{platformLabels[val as keyof typeof platformLabels] ?? String(val)}</span>
    if (key === 'match_score') return <span className={cn('badge', matchScoreBg(val as number))}>{val}%</span>
    return <span>{String(val ?? '—')}</span>
  }

  const better = (job1.match_score ?? 0) >= (job2.match_score ?? 0) ? job1 : job2

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up space-y-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold">مقارنة الوظيفتين</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        {/* Recommendation */}
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-2xl p-4">
          <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
            التوصية: <span className="font-bold">{better.title}</span> في <span className="font-bold">{better.company}</span> أفضل تطابقاً
          </p>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 w-32">المعيار</th>
                <th className="text-right py-3 px-4">
                  <div className="font-semibold text-primary-600 dark:text-primary-400">{job1.company}</div>
                </th>
                <th className="text-right py-3 px-4">
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">{job2.company}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {rows.map(row => (
                <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-xs text-gray-500 font-medium">{row.label}</td>
                  <td className="py-3 px-4">{renderCell(job1, row.key)}</td>
                  <td className="py-3 px-4">{renderCell(job2, row.key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Description comparison */}
        <div className="grid grid-cols-2 gap-4">
          {[job1, job2].map(j => (
            <div key={j.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-gray-400" />
                <span className="text-xs font-medium">{j.title}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-6 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                {j.description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">إغلاق</button>
        </div>
      </div>
    </div>
  )
}
