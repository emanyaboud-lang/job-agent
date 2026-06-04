import { useQuery } from '@tanstack/react-query'
import { featuresApi, exportApi } from '@/lib/api'
import { WeeklyReport } from '@/types'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, Send, Eye, Calendar, Award, Download, RefreshCw } from 'lucide-react'

export default function Reports() {
  const { data: report, isLoading, refetch, isFetching } = useQuery<WeeklyReport>({
    queryKey: ['weekly-report'],
    queryFn: () => featuresApi.weeklyReport() as Promise<WeeklyReport>,
  })

  const handleExportExcel = async () => {
    const blob = await exportApi.excel()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'job-agents-report.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  const statCards = report ? [
    { label: 'وظائف مكتشفة', value: report.jobs_found,          icon: TrendingUp, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
    { label: 'تقديمات مرسلة', value: report.applications_sent,  icon: Send,       color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'ردود وصلت',    value: report.responses,            icon: Eye,        color: 'text-green-500',   bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'مقابلات',      value: report.interviews,           icon: Calendar,   color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'عروض وظيفية',  value: report.offers,               icon: Award,      color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ] : []

  // Format daily data for charts
  const dailyData = (report?.daily ?? []).map(d => ({
    date: new Date(d.date).toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' }),
    'مرسلة': d.sent,
    'مكتشفة': d.found,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-bold text-xl">التقرير الأسبوعي</h1>
          {report && <p className="text-xs text-gray-500 mt-0.5">{report.period}</p>}
        </div>
        <div className="mr-auto flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            تحديث
          </button>
          <button onClick={handleExportExcel} className="btn-primary text-xs px-3 py-1.5">
            <Download size={13} />
            تصدير Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {statCards.map(s => (
              <div key={s.label} className="card p-4 flex flex-col gap-2">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.bg)}>
                  <s.icon size={18} className={s.color} />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Response rate + avg score */}
          {report && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-5">
                <h3 className="font-semibold text-sm mb-3">معدل الاستجابة</h3>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold text-primary-500">{report.response_rate}%</span>
                  <span className="text-sm text-gray-500 mb-1">من إجمالي التقديمات</span>
                </div>
                <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, report.response_rate)}%` }}
                  />
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-sm mb-3">متوسط نسبة التطابق</h3>
                <div className="flex items-end gap-3">
                  <span className={cn(
                    'text-4xl font-bold',
                    report.avg_match_score >= 85 ? 'text-green-500' :
                    report.avg_match_score >= 70 ? 'text-amber-500' : 'text-red-500'
                  )}>{report.avg_match_score}%</span>
                  <span className="text-sm text-gray-500 mb-1">لوظائف الأسبوع</span>
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          {dailyData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-5">
                <h3 className="font-semibold text-sm mb-4">التقديمات اليومية</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="مرسلة" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="مكتشفة" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-sm mb-4">الاتجاه الأسبوعي</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="مرسلة" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="مكتشفة" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Summary table */}
          {report && (
            <div className="card p-5">
              <h3 className="font-semibold mb-4">ملخص تفصيلي</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {['المرحلة', 'العدد', 'النسبة'].map(h => (
                        <th key={h} className="text-right px-4 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {[
                      { label: 'وظائف مكتشفة',   val: report.jobs_found,         pct: '—' },
                      { label: 'تقديمات مرسلة',   val: report.applications_sent,  pct: '100%' },
                      { label: 'ردود استُلمت',    val: report.responses,          pct: `${report.response_rate}%` },
                      { label: 'مقابلات',          val: report.interviews,         pct: report.applications_sent > 0 ? `${Math.round(report.interviews/report.applications_sent*100)}%` : '0%' },
                      { label: 'عروض وظيفية',     val: report.offers,             pct: report.applications_sent > 0 ? `${Math.round(report.offers/report.applications_sent*100)}%` : '0%' },
                      { label: 'مرفوضة',           val: report.rejected,           pct: report.applications_sent > 0 ? `${Math.round(report.rejected/report.applications_sent*100)}%` : '0%' },
                    ].map(row => (
                      <tr key={row.label} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-2.5 font-medium">{row.label}</td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{row.val}</td>
                        <td className="px-4 py-2.5 text-primary-600 dark:text-primary-400">{row.pct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
