import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { jobsApi } from '@/lib/api'
import { Job } from '@/types'
import { cn, matchScoreBg } from '@/lib/utils'
import { Search, X, Briefcase, LayoutDashboard, BarChart2, Settings, FileText, Mail, Users } from 'lucide-react'

const PAGES = [
  { label: 'لوحة التحكم', path: '/', icon: LayoutDashboard, shortcut: '1' },
  { label: 'الوظائف', path: '/jobs', icon: Briefcase, shortcut: '2' },
  { label: 'التقديمات', path: '/applications', icon: Mail, shortcut: '3' },
  { label: 'السيرة الذاتية', path: '/cv', icon: FileText, shortcut: '4' },
  { label: 'التقارير', path: '/reports', icon: BarChart2, shortcut: '5' },
  { label: 'جهات الاتصال', path: '/contacts', icon: Users, shortcut: '6' },
  { label: 'الإعدادات', path: '/settings', icon: Settings, shortcut: '7' },
]

interface QuickSearchProps {
  open: boolean
  onClose: () => void
}

export default function QuickSearch({ open, onClose }: QuickSearchProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ['jobs', {}],
    queryFn: () => jobsApi.list({}) as Promise<Job[]>,
    enabled: open,
    staleTime: 60000,
  })

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  if (!open) return null

  const filteredJobs = query.length >= 2
    ? jobs.filter(j =>
        j.title.toLowerCase().includes(query.toLowerCase()) ||
        j.company.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : []

  const filteredPages = query.length >= 1
    ? PAGES.filter(p => p.label.includes(query))
    : PAGES.slice(0, 5)

  function go(path: string) {
    navigate(path)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center pt-20 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-slide-down"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none text-base"
            placeholder="ابحثي عن وظيفة أو انتقلي إلى صفحة..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose() }}
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {/* Pages */}
          {filteredPages.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 px-4 py-2">الصفحات</p>
              {filteredPages.map(p => (
                <button
                  key={p.path}
                  onClick={() => go(p.path)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-right"
                >
                  <p.icon size={15} className="text-gray-400 shrink-0" />
                  <span className="text-sm flex-1">{p.label}</span>
                  <kbd className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">Ctrl+{p.shortcut}</kbd>
                </button>
              ))}
            </div>
          )}

          {/* Jobs */}
          {filteredJobs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 px-4 py-2">الوظائف</p>
              {filteredJobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => go('/jobs')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-right"
                >
                  <Briefcase size={15} className="text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-sm font-medium truncate">{job.title}</p>
                    <p className="text-xs text-gray-400 truncate">{job.company}</p>
                  </div>
                  <span className={cn('badge text-xs shrink-0', matchScoreBg(job.match_score))}>{job.match_score}%</span>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && filteredJobs.length === 0 && filteredPages.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">لا نتائج لـ "{query}"</div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-xs text-gray-400">
          <span><kbd className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">↑↓</kbd> تنقل</span>
          <span><kbd className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">Enter</kbd> انتقال</span>
          <span><kbd className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">Esc</kbd> إغلاق</span>
        </div>
      </div>
    </div>
  )
}
