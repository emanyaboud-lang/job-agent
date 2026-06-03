import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type React from 'react'
import { statsApi } from '@/lib/api'
import { Stats as StatsType } from '@/types'
import { cityLabels, platformLabels } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts'
import { TrendingUp, Send, Clock, XCircle, Award, Target } from 'lucide-react'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280']

export default function Stats() {
  const [detailKey, setDetailKey] = useState<string | null>(null)

  const { data: stats } = useQuery<StatsType>({
    queryKey: ['stats'],
    queryFn: () => statsApi.overview() as Promise<StatsType>,
    refetchInterval: 60000,
  })

  const { data: detail } = useQuery({
    queryKey: ['stats-detail', detailKey],
    queryFn: () => statsApi.detail(detailKey!) as Promise<unknown>,
    enabled: !!detailKey,
  })

  const { data: heatmap } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => statsApi.heatmap() as Promise<{ date: string; count: number }[]>,
  })

  const KPIs: { key: string; label: string; value: string | number; icon: React.ElementType; color: string; bg: string }[] = [
    { key: 'total', label: 'إجمالي التقديمات', value: stats?.total_applications ?? 0, icon: Send, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
    { key: 'reviewing', label: 'قيد المراجعة', value: stats?.reviewing ?? 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { key: 'interviews', label: 'مقابلات', value: stats?.interviews ?? 0, icon: Award, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { key: 'rejected', label: 'مرفوضة', value: stats?.rejected ?? 0, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    { key: 'response_rate', label: 'نسبة الرد', value: `${(stats?.response_rate ?? 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { key: 'avg_match', label: 'متوسط التطابق', value: `${(stats?.avg_match_score ?? 0).toFixed(0)}%`, icon: Target, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
  ]

  const cityData = Object.entries(stats?.by_city ?? {}).map(([city, count]) => ({
    name: cityLabels[city as keyof typeof cityLabels] ?? city,
    value: count,
  }))

  const platformData = Object.entries(stats?.by_platform ?? {}).map(([platform, count]) => ({
    name: platformLabels[platform as keyof typeof platformLabels] ?? platform,
    value: count,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-bold text-xl">الإحصائيات</h1>

      {/* KPI cards — clickable */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPIs.map(kpi => (
          <button key={kpi.key} onClick={() => setDetailKey(detailKey === kpi.key ? null : kpi.key)}
            className={`card p-4 text-right transition-all ${detailKey === kpi.key ? 'ring-2 ring-primary-400' : 'hover:shadow-card-hover'}`}>
            <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
              <kpi.icon size={18} className={kpi.color} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpi.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{kpi.label}</p>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {detailKey && detail && (
        <div className="card p-5 animate-slide-down">
          <h3 className="font-semibold mb-3 text-sm">تفاصيل: {KPIs.find(k => k.key === detailKey)?.label}</h3>
          <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{JSON.stringify(detail, null, 2)}</pre>
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By city */}
        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-4">التقديمات حسب المدينة</h3>
          {cityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cityData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156,163,175,0.2)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="تقديمات" radius={[6, 6, 0, 0]}>
                  {cityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">لا بيانات</div>}
        </div>

        {/* By platform */}
        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-4">التقديمات حسب المنصة</h3>
          {platformData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={platformData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {platformData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">لا بيانات</div>}
        </div>

        {/* Heatmap / activity */}
        {heatmap && heatmap.length > 0 && (
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-semibold text-sm mb-4">نشاط التقديمات (30 يوم)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={heatmap.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156,163,175,0.2)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" name="تقديمات" stroke="#0ea5e9" fill="#e0f2fe" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'اليوم', value: stats?.today ?? 0 },
          { label: 'هذا الأسبوع', value: stats?.this_week ?? 0 },
          { label: 'المقبولة/عرض', value: stats?.offers ?? 0 },
          { label: 'متوسط التطابق', value: `${(stats?.avg_match_score ?? 0).toFixed(0)}%` },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-3xl font-bold text-primary-500">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
