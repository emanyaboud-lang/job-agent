import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { jobsApi, agentsApi, statsApi, featuresApi } from '@/lib/api'
import { Job, AgentStatus } from '@/types'
import { cn, cityLabels, platformColors, platformLabels, matchScoreBg, timeAgo } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import {
  Search, Play, CheckCircle2, ChevronRight,
  Zap, ZapOff, MapPin, Calendar, Briefcase, TrendingUp,
  RefreshCw, CheckCheck, Clock, Pause, Target, Lightbulb,
  BarChart2, Bell, Plus, Trash2, Route, Trophy,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'

// ── Todo List types ───────────────────────────────────────────
interface TodoItem { id: string; text: string; done: boolean; created_at: string }

function loadTodos(): TodoItem[] {
  try { return JSON.parse(localStorage.getItem('job_todos') || '[]') } catch { return [] }
}
function saveTodos(todos: TodoItem[]) { localStorage.setItem('job_todos', JSON.stringify(todos)) }

const CITY_COLORS: Record<string, string> = {
  madinah: '#0ea5e9',
  jeddah:  '#10b981',
  riyadh:  '#f59e0b',
  yanbu:   '#8b5cf6',
  other:   '#6b7280',
}

const TIPS = [
  'تتميّزين بشهادتي PMP وPBA — ركّزي على الوظائف التي تطلبهما صراحةً لأعلى تطابق.',
  'أفضل وقت لإرسال التقديمات في السوق السعودي: الأحد - الثلاثاء بين 9 صباحاً و11 صباحاً.',
  'الشركات التي تستجيب بسرعة عادةً تلك ذات الفرق الصغيرة — تابعيها بعد 3 أيام.',
  'إضافة مشاريع المدن الذكية الملموسة في رسالة التقديم يرفع معدل الاستجابة.',
  'اقترحي قيمة محددة: "أديرت مشروعاً بميزانية X وسلّمته قبل الموعد".',
]

export default function Dashboard() {
  const qc = useQueryClient()
  const { agentStatus, setAgentStatus } = useStore()
  const [pauseMode, setPauseMode] = useState(false)
  const [dailyGoal, setDailyGoal] = useState(() => Number(localStorage.getItem('dailyGoal') || '3'))
  const [editGoal, setEditGoal] = useState(false)
  const [goalInput, setGoalInput] = useState(String(dailyGoal))
  const [tipIdx] = useState(() => Math.floor(Math.random() * TIPS.length))
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos)
  const [todoInput, setTodoInput] = useState('')

  function addTodo() {
    const text = todoInput.trim()
    if (!text) return
    const next = [...todos, { id: Date.now().toString(), text, done: false, created_at: new Date().toISOString() }]
    setTodos(next); saveTodos(next); setTodoInput('')
  }
  function toggleTodo(id: string) {
    const next = todos.map(t => t.id === id ? { ...t, done: !t.done } : t)
    setTodos(next); saveTodos(next)
  }
  function deleteTodo(id: string) {
    const next = todos.filter(t => t.id !== id)
    setTodos(next); saveTodos(next)
  }

  const { data: pendingJobs = [] } = useQuery<Job[]>({
    queryKey: ['jobs', 'pending'],
    queryFn: () => jobsApi.list({ status: 'pending' }) as Promise<Job[]>,
    refetchInterval: 30000,
    enabled: !pauseMode,
  })

  const { data: recentApps = [] } = useQuery({
    queryKey: ['applications', 'recent'],
    queryFn: () => (jobsApi.list as (p: Record<string, string>) => Promise<Job[]>)({ status: 'applied', limit: '5' }),
    refetchInterval: 60000,
  })

  const { data: status, refetch: refetchStatus } = useQuery<AgentStatus>({
    queryKey: ['agent-status'],
    queryFn: agentsApi.status as () => Promise<AgentStatus>,
    refetchInterval: 15000,
  })

  const { data: stats } = useQuery<{ today: number; this_week: number; response_rate: number }>({
    queryKey: ['stats', 'overview'],
    queryFn: () => statsApi.overview() as Promise<{ today: number; this_week: number; response_rate: number }>,
    refetchInterval: 60000,
  })

  const { data: bestTimeData } = useQuery<{ day: string; time: string; tip: string }>({
    queryKey: ['best-time'],
    queryFn: () => featuresApi.bestTime() as Promise<{ day: string; time: string; tip: string }>,
    staleTime: 300_000,
  })

  const { data: remindersData } = useQuery<{ reminders: { type: string; message: string; link: string; urgency: string }[] }>({
    queryKey: ['reminders'],
    queryFn: () => featuresApi.reminders() as Promise<{ reminders: { type: string; message: string; link: string; urgency: string }[] }>,
    refetchInterval: 120000,
  })

  const { data: careerPathsData } = useQuery<{ paths: { title: string; description: string; required_skills: string[]; match_percent: number; timeline: string }[] }>({
    queryKey: ['career-paths'],
    queryFn: () => featuresApi.careerPaths() as Promise<{ paths: { title: string; description: string; required_skills: string[]; match_percent: number; timeline: string }[] }>,
    staleTime: 600_000,
  })

  const searchNow = useMutation({
    mutationFn: () => agentsApi.search() as Promise<unknown>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      refetchStatus()
      // تحديث كل 5 ثوانٍ لمدة دقيقة عشان تظهر الوظائف الجديدة
      let count = 0
      const iv = setInterval(() => {
        qc.invalidateQueries({ queryKey: ['jobs'] })
        if (++count >= 12) clearInterval(iv)
      }, 5000)
    },
  })

  const demoSearch = useMutation({
    mutationFn: () => agentsApi.demoSearch() as Promise<{ jobs_added: number }>,
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const approveAll = useMutation({
    mutationFn: jobsApi.approveAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const approveJob = useMutation({
    mutationFn: (id: string) => jobsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const rejectJob = useMutation({
    mutationFn: (id: string) => jobsApi.reject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const toggle1 = useMutation({
    mutationFn: (a: boolean) => agentsApi.toggle1(a),
    onSuccess: () => refetchStatus(),
  })

  const toggle2 = useMutation({
    mutationFn: (a: boolean) => agentsApi.toggle2(a),
    onSuccess: () => refetchStatus(),
  })

  const a1 = status?.agent1
  const a2 = status?.agent2
  const todaySent = Object.values(a2?.sent_today ?? {}).reduce((a, b) => a + b, 0)

  const cityChartData = Object.entries(a2?.sent_today ?? {}).map(([city, count]) => ({
    name: cityLabels[city as keyof typeof cityLabels] ?? city,
    value: count,
    fill: CITY_COLORS[city] ?? '#6b7280',
  }))

  const goalProgress = Math.min(100, Math.round((todaySent / dailyGoal) * 100))

  // Achievements
  const totalApps = (stats as unknown as Record<string, number> | undefined)?.total_applications ?? 0
  const interviews = (stats as unknown as Record<string, number> | undefined)?.interviews ?? 0
  const BADGES = [
    { id: 'first', icon: '🎯', label: 'أول تقديم', unlocked: totalApps >= 1 },
    { id: 'five', icon: '🔥', label: '5 تقديمات', unlocked: totalApps >= 5 },
    { id: 'ten', icon: '⭐', label: 'محترف (10)', unlocked: totalApps >= 10 },
    { id: 'twenty', icon: '🏅', label: 'متميز (20)', unlocked: totalApps >= 20 },
    { id: 'interview', icon: '🏆', label: 'مقابلة', unlocked: interviews >= 1 },
    { id: 'cv', icon: '💎', label: 'CV محلَّل', unlocked: true },
  ]

  function saveGoal() {
    const n = Math.max(1, parseInt(goalInput) || 3)
    setDailyGoal(n)
    localStorage.setItem('dailyGoal', String(n))
    setEditGoal(false)
  }

  // Suppress unused warning
  void agentStatus; void setAgentStatus

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Hero Banner ── */}
      <div className="hero-banner p-6 md:p-8 text-white relative">
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-sky-300/80 font-medium mb-1">مرحباً بعودتكِ</p>
              <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">
                مرحباً إيمان <span className="animate-float inline-block">👋</span>
              </h1>
              <p className="text-slate-300/80 text-sm max-w-md">
                لوحة التحكم الذكية لمسيرتكِ المهنية — كل شيء في مكانٍ واحد
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => searchNow.mutate()}
                disabled={searchNow.isPending || pauseMode}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-sky-500/30"
              >
                {searchNow.isPending
                  ? <><RefreshCw size={15} className="animate-spin" />جاري البحث...</>
                  : <><Search size={15} />ابحثي الآن</>}
              </button>
              <button
                onClick={() => demoSearch.mutate()}
                disabled={demoSearch.isPending || pauseMode}
                title="أضيفي 5 وظائف تجريبية فوراً"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-violet-500/30"
              >
                {demoSearch.isPending ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
                وظائف تجريبية
              </button>
              <button
                onClick={() => setPauseMode(v => !v)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all',
                  pauseMode
                    ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                )}
              >
                {pauseMode ? <><Play size={15} />استئنافي</> : <><Pause size={15} />إيقاف</>}
              </button>
            </div>
          </div>

          {/* Search started notice */}
          {searchNow.isSuccess && (
            <div className="mt-4 flex items-center gap-2 bg-sky-500/20 border border-sky-400/30 rounded-xl px-4 py-2.5">
              <RefreshCw size={15} className="text-sky-300 shrink-0 animate-spin" />
              <p className="text-sky-200 text-sm">البحث بدأ — ستظهر الوظائف الجديدة خلال دقيقة تلقائياً ✓</p>
            </div>
          )}
          {demoSearch.isSuccess && (
            <div className="mt-4 flex items-center gap-2 bg-violet-500/20 border border-violet-400/30 rounded-xl px-4 py-2.5">
              <CheckCircle2 size={15} className="text-violet-300 shrink-0" />
              <p className="text-violet-200 text-sm">أُضيفت 5 وظائف تجريبية — راجعيها أدناه وافعلي "وافقت" ✓</p>
            </div>
          )}

          {/* Inline pause mode notice */}
          {pauseMode && (
            <div className="mt-4 flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 rounded-xl px-4 py-2.5">
              <Pause size={15} className="text-amber-300 shrink-0" />
              <p className="text-amber-200 text-sm">وضع الإيقاف المؤقت — جميع العمليات الآلية متوقفة</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Today applications */}
        <div className="stat-card" style={{ '--gradient-start': '#0ea5e9', '--gradient-end': '#6366f1' } as React.CSSProperties}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center icon-gradient-blue">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">+2 ↑</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white mb-0.5">{stats?.today ?? '—'}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">تقديمات اليوم</p>
        </div>

        {/* Week applications */}
        <div className="stat-card" style={{ '--gradient-start': '#10b981', '--gradient-end': '#0ea5e9' } as React.CSSProperties}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center icon-gradient-emerald">
              <BarChart2 size={18} className="text-white" />
            </div>
            <span className="text-xs font-medium text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full">هذا الأسبوع</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white mb-0.5">{stats?.this_week ?? '—'}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">مجموع الأسبوع</p>
        </div>

        {/* Response rate */}
        <div className="stat-card" style={{ '--gradient-start': '#f59e0b', '--gradient-end': '#ef4444' } as React.CSSProperties}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center icon-gradient-amber">
              <Trophy size={18} className="text-white" />
            </div>
            <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">معدل</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white mb-0.5">{stats?.response_rate ?? '—'}%</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">معدل الاستجابة</p>
        </div>

        {/* Pending jobs */}
        <div className="stat-card" style={{ '--gradient-start': '#8b5cf6', '--gradient-end': '#ec4899' } as React.CSSProperties}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center icon-gradient-purple">
              <Briefcase size={18} className="text-white" />
            </div>
            {pendingJobs.length > 0 && (
              <span className="text-xs font-medium text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">جديد</span>
            )}
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white mb-0.5">{pendingJobs.length}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">تنتظر موافقتك</p>
        </div>
      </div>

      {/* ── Agent Status ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agent 1 — Searcher */}
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                a1?.state === 'running' ? 'icon-gradient-emerald' : 'bg-gray-100 dark:bg-white/[0.06]'
              )}>
                <Search size={17} className={a1?.state === 'running' ? 'text-white' : 'text-gray-400'} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn(
                    'w-2 h-2 rounded-full shrink-0 pulse-ring',
                    a1?.state === 'running' ? 'bg-emerald-400 text-emerald-400' : 'bg-gray-400 text-gray-400'
                  )} />
                  <h3 className="font-bold text-sm">Agent 1 — الباحث</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  آخر بحث: {a1?.last_run ? timeAgo(a1.last_run) : 'لم يبحث بعد'}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  وجد اليوم: <span className="font-bold text-gray-800 dark:text-slate-200">{a1?.jobs_found_today ?? 0} وظيفة</span>
                </p>
                {a1?.next_run && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock size={11} />البحث القادم: {timeAgo(a1.next_run)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => searchNow.mutate()}
                disabled={searchNow.isPending || a1?.state === 'running' || pauseMode}
                className="btn-primary text-xs px-3 py-1.5"
              >
                {searchNow.isPending || a1?.state === 'running'
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <Search size={14} />}
                ابحث الآن
              </button>
              <button
                onClick={() => toggle1.mutate(a1?.state !== 'running')}
                disabled={pauseMode}
                className={cn('p-2 rounded-xl transition-colors',
                  a1?.state === 'running'
                    ? 'bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 hover:bg-emerald-100'
                )}
              >
                {a1?.state === 'running' ? <ZapOff size={16} /> : <Zap size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Agent 2 — Applicant */}
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                a2?.state === 'running' ? 'icon-gradient-blue' : 'bg-gray-100 dark:bg-white/[0.06]'
              )}>
                <Zap size={17} className={a2?.state === 'running' ? 'text-white' : 'text-gray-400'} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn(
                    'w-2 h-2 rounded-full shrink-0 pulse-ring',
                    a2?.state === 'running' ? 'bg-sky-400 text-sky-400' : 'bg-gray-400 text-gray-400'
                  )} />
                  <h3 className="font-bold text-sm">Agent 2 — المقدّم</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  أرسل اليوم: <span className="font-bold text-gray-800 dark:text-slate-200">{todaySent} تقديم</span>
                </p>
                {a2?.sent_today && Object.entries(a2.sent_today).map(([city, count]) => (
                  <p key={city} className="text-xs text-gray-400">
                    {cityLabels[city as keyof typeof cityLabels] ?? city}: {count} / {(a2.limits as Record<string, number>)[city] ?? '—'}
                  </p>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPauseMode(v => !v)}
                className={cn('p-2 rounded-xl transition-colors',
                  pauseMode
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500'
                    : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 hover:bg-gray-200'
                )}
                title={pauseMode ? 'استئناف الكل' : 'إيقاف مؤقت للكل'}
              >
                <Pause size={16} />
              </button>
              <button
                onClick={() => toggle2.mutate(a2?.state !== 'running' as never)}
                disabled={pauseMode}
                className={cn('p-2 rounded-xl transition-colors',
                  a2?.state === 'running'
                    ? 'bg-red-50 dark:bg-red-500/10 text-red-500'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'
                )}
              >
                {a2?.state === 'running' ? <ZapOff size={16} /> : <Zap size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Daily Goal + Tip ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Goal */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg icon-gradient-blue flex items-center justify-center">
                <Target size={14} className="text-white" />
              </div>
              هدف اليوم
            </h3>
            {!editGoal ? (
              <button
                onClick={() => { setEditGoal(true); setGoalInput(String(dailyGoal)) }}
                className="text-xs text-sky-500 hover:text-sky-400 font-medium transition-colors"
              >تعديل</button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={20}
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  className="input w-16 text-sm py-1 text-center"
                />
                <button onClick={saveGoal} className="btn-primary text-xs px-2 py-1">حفظ</button>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">{todaySent} من {dailyGoal} تقديم</span>
              <span className={cn('font-black text-base', goalProgress >= 100 ? 'text-emerald-500' : 'text-sky-500')}>{goalProgress}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700',
                  goalProgress >= 100
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                    : 'bg-gradient-to-r from-sky-400 to-blue-500'
                )}
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            {goalProgress >= 100 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 size={13} />أنجزتِ هدف اليوم! 🎉
              </p>
            )}
          </div>
        </div>

        {/* Tip of the day */}
        <div className="card p-5 border-amber-200/60 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-400">
            <div className="w-7 h-7 rounded-lg icon-gradient-amber flex items-center justify-center">
              <Lightbulb size={14} className="text-white" />
            </div>
            نصيحة اليوم
          </h3>
          <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{TIPS[tipIdx]}</p>
          <Link to="/reports" className="text-xs text-sky-500 hover:text-sky-400 flex items-center gap-1 mt-3 font-medium transition-colors">
            <BarChart2 size={12} />عرض التقرير الأسبوعي
          </Link>
        </div>
      </div>

      {/* ── Pending Jobs ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-base">وظائف تنتظر موافقتك</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{pendingJobs.length} وظيفة جديدة</p>
          </div>
          <div className="flex gap-2">
            {pendingJobs.length > 0 && (
              <button
                onClick={() => approveAll.mutate()}
                disabled={approveAll.isPending || pauseMode}
                className="btn-primary text-xs px-3 py-1.5"
              >
                <CheckCheck size={14} />
                اعتمد الكل ({pendingJobs.length})
              </button>
            )}
            <Link to="/jobs" className="btn-secondary text-xs px-3 py-1.5">
              عرض الكل
              <ChevronRight size={14} className="rotate-180" />
            </Link>
          </div>
        </div>

        {pendingJobs.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <Briefcase size={28} className="text-gray-300 dark:text-slate-600" />
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">لا وظائف جديدة الآن</p>
            <button onClick={() => searchNow.mutate()} disabled={pauseMode} className="btn-secondary text-xs px-4">
              ابحث الآن
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {pendingJobs.slice(0, 6).map(job => (
              <PendingJobCard
                key={job.id}
                job={job}
                onApprove={() => approveJob.mutate(job.id)}
                onReject={() => rejectJob.mutate(job.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* City distribution pie */}
        <div className="card p-5">
          <h3 className="font-bold mb-4 text-sm flex items-center gap-2">
            <MapPin size={15} className="text-sky-500" />
            توزيع تقديمات اليوم حسب المدينة
          </h3>
          {cityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={cityChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={72}
                  innerRadius={36}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {cityChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">لا بيانات اليوم</div>
          )}
        </div>

        {/* Daily tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Calendar size={15} className="text-purple-500" />
              مهام اليوم
            </h3>
          </div>
          <div className="space-y-2">
            {pendingJobs.slice(0, 4).map(job => (
              <div key={job.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                <div className="w-8 h-8 rounded-xl icon-gradient-blue flex items-center justify-center shrink-0">
                  <Briefcase size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{job.title}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{job.company}</p>
                </div>
                <span className={cn('badge text-xs', matchScoreBg(job.match_score))}>
                  {job.match_score}%
                </span>
              </div>
            ))}
            {pendingJobs.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-6">
                <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400" />
                أنجزتِ كل مهام اليوم!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Best Time + Reminders ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Time */}
        <div className="card p-5">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg icon-gradient-teal flex items-center justify-center">
              <Clock size={13} className="text-white" />
            </div>
            أفضل وقت للتقديم
          </h3>
          {bestTimeData ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black gradient-text-emerald">{bestTimeData.time}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">{bestTimeData.day}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{bestTimeData.tip}</p>
            </div>
          ) : (
            <div className="space-y-2 shimmer">
              <div className="h-8 bg-gray-100 dark:bg-white/[0.06] rounded w-32" />
              <div className="h-4 bg-gray-100 dark:bg-white/[0.06] rounded w-48" />
            </div>
          )}
        </div>

        {/* Smart Reminders */}
        <div className="card p-5">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg icon-gradient-amber flex items-center justify-center">
              <Bell size={13} className="text-white" />
            </div>
            تذكيرات ذكية
          </h3>
          <div className="space-y-2">
            {(remindersData?.reminders ?? []).slice(0, 3).map((r, i) => (
              <Link to={r.link} key={i} className={cn(
                'flex items-start gap-2 p-2.5 rounded-xl text-xs transition-colors hover:opacity-90',
                r.urgency === 'high'   ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-500/20' :
                r.urgency === 'medium' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-500/20' :
                'bg-gray-50 dark:bg-white/[0.03] text-gray-600 dark:text-slate-400 border border-gray-100 dark:border-white/[0.06]'
              )}>
                <span className="mt-0.5 shrink-0">{r.urgency === 'high' ? '🔴' : r.urgency === 'medium' ? '🟡' : 'ℹ️'}</span>
                <p>{r.message}</p>
              </Link>
            ))}
            {!remindersData && (
              <div className="space-y-2">
                {[1,2].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-white/[0.06] rounded-xl shimmer" />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Achievement Badges ── */}
      <div className="card p-5">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg icon-gradient-amber flex items-center justify-center">
            <Trophy size={13} className="text-white" />
          </div>
          الإنجازات
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {BADGES.map(badge => (
            <div key={badge.id} className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all duration-200',
              badge.unlocked
                ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 shadow-sm'
                : 'bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] opacity-40'
            )}>
              <span className="text-2xl">{badge.icon}</span>
              <p className="text-[10px] font-semibold text-gray-700 dark:text-slate-300 leading-tight">{badge.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Career Paths ── */}
      {careerPathsData && (
        <div className="card p-5">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg icon-gradient-purple flex items-center justify-center">
              <Route size={13} className="text-white" />
            </div>
            مساراتي المهنية المقترحة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {careerPathsData.paths.slice(0, 4).map((path, i) => (
              <div key={i} className="p-4 rounded-2xl border border-gray-100 dark:border-white/[0.07] bg-gray-50/50 dark:bg-white/[0.02] hover:border-sky-300 dark:hover:border-sky-500/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-bold text-sm">{path.title}</p>
                  <span className={cn('badge shrink-0', path.match_percent >= 80 ? 'badge-green' : 'badge-amber')}>{path.match_percent}%</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-2 leading-relaxed">{path.description}</p>
                <div className="flex flex-wrap gap-1">
                  {(path.required_skills ?? []).slice(0, 3).map(s => (
                    <span key={s} className="badge-blue text-xs">{s}</span>
                  ))}
                  {path.timeline && <span className="badge-gray text-xs">{path.timeline}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Todo List ── */}
      <div className="card p-5">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg icon-gradient-emerald flex items-center justify-center">
            <CheckCheck size={13} className="text-white" />
          </div>
          قائمة مهام البحث الوظيفي
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            className="input text-sm flex-1 py-2"
            placeholder="أضيفي مهمة جديدة..."
            value={todoInput}
            onChange={e => setTodoInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
          />
          <button onClick={addTodo} disabled={!todoInput.trim()} className="btn-primary px-3 py-2">
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {todos.length === 0 && (
            <p className="text-center text-xs text-gray-400 dark:text-slate-500 py-4">لا مهام — أضيفي مهمة للبدء!</p>
          )}
          {todos.map(t => (
            <div key={t.id} className={cn(
              'flex items-center gap-3 p-2.5 rounded-xl transition-colors border',
              t.done
                ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/15'
                : 'bg-gray-50 dark:bg-white/[0.03] border-gray-100 dark:border-white/[0.05]'
            )}>
              <button
                onClick={() => toggleTodo(t.id)}
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  t.done ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 dark:border-slate-600'
                )}
              >
                {t.done && <CheckCircle2 size={11} className="text-white" />}
              </button>
              <p className={cn('text-sm flex-1', t.done && 'line-through text-gray-400 dark:text-slate-500')}>{t.text}</p>
              <button onClick={() => deleteTodo(t.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Applications ── */}
      {recentApps.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base">آخر التقديمات المرسلة</h3>
            <Link to="/applications" className="text-sky-500 text-sm hover:text-sky-400 flex items-center gap-1 font-medium transition-colors">
              عرض الكل <ChevronRight size={14} className="rotate-180" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentApps.slice(0, 4).map((job: Job) => (
              <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors border border-transparent hover:border-gray-100 dark:hover:border-white/[0.05]">
                <div className="w-9 h-9 rounded-xl icon-gradient-blue flex items-center justify-center shrink-0">
                  <TrendingUp size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{job.title}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin size={10} /> {cityLabels[job.city] ?? job.city} — {job.company}
                  </p>
                </div>
                <div className="text-left">
                  <span className="badge-sky">مرسلة</span>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{timeAgo(job.discovered_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PendingJobCard({ job, onApprove, onReject }: { job: Job; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="card-hover p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{job.title}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">{job.company}</p>
        </div>
        {/* Match score ring */}
        <div
          className="match-ring shrink-0 text-gray-700 dark:text-white"
          style={{
            '--ring-color': job.match_score >= 80 ? '#10b981' : job.match_score >= 60 ? '#0ea5e9' : '#f59e0b',
            '--ring-pct': `${job.match_score}%`,
          } as React.CSSProperties}
        >
          {job.match_score}%
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
        <span className="flex items-center gap-1"><MapPin size={11} />{cityLabels[job.city] ?? job.city}</span>
        <span className={cn('badge', platformColors[job.platform])}>{platformLabels[job.platform]}</span>
      </div>
      <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{job.description}</p>
      <div className="flex gap-2 mt-auto">
        <button onClick={onApprove} className="btn-primary text-xs flex-1 justify-center py-1.5">
          <CheckCircle2 size={13} /> وافقت
        </button>
        <button onClick={onReject} className="btn-danger text-xs flex-1 justify-center py-1.5">
          رفض
        </button>
      </div>
    </div>
  )
}
