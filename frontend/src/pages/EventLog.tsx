import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { logApi } from '@/lib/api'
import { EventLog as EventLogType } from '@/types'
import { cn, formatDateTime } from '@/lib/utils'
import { CheckCircle2, XCircle, Info, Filter, Search } from 'lucide-react'

export default function EventLog() {
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')

  const params: Record<string, string> = {}
  if (filter) params.status = filter

  const { data: logs = [], isLoading } = useQuery<EventLogType[]>({
    queryKey: ['log', params],
    queryFn: () => logApi.list(params) as Promise<EventLogType[]>,
    refetchInterval: 30000,
  })

  const filtered = logs.filter(l =>
    !search ||
    l.description.toLowerCase().includes(search.toLowerCase()) ||
    l.event_type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-bold text-xl">سجل الأحداث</h1>
        <span className="badge-gray">{filtered.length} حدث</span>
        <div className="mr-auto flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input text-sm pr-8 py-2 w-48" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {['', 'success', 'error', 'info'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                filter === s ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'badge-gray hover:bg-gray-200 dark:hover:bg-gray-700')}>
              {s === '' ? 'الكل' : s === 'success' ? 'نجاح' : s === 'error' ? 'خطأ' : 'معلومة'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-14 animate-pulse bg-gray-100 dark:bg-gray-800" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">لا أحداث</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.map(log => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="mt-0.5 shrink-0">
                  {log.status === 'success' && <CheckCircle2 size={16} className="text-green-500" />}
                  {log.status === 'error'   && <XCircle    size={16} className="text-red-500"   />}
                  {log.status === 'info'    && <Info       size={16} className="text-blue-500"  />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {log.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className={cn('badge text-xs',
                      log.status === 'success' ? 'badge-green' : log.status === 'error' ? 'badge-red' : 'badge-blue')}>
                      {log.status === 'success' ? 'نجاح' : log.status === 'error' ? 'خطأ' : 'معلومة'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{log.description}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{formatDateTime(log.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
