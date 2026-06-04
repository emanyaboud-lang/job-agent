import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { jobsApi, agentsApi, statsApi, featuresApi } from '@/lib/api'
import { Job, AgentStatus } from '@/types'
import { cn, cityLabels, platformColors, platformLabels, matchScoreBg, formatDateTime, timeAgo } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import {
  Search, Play, CheckCircle2, ChevronRight,
  Zap, ZapOff, MapPin, Calendar, Briefcase, TrendingUp,
  RefreshCw, CheckCheck, Clock, Pause, Target, Lightbulb,
  BarChart2, Bell, Plus, Trash2, Route, Trophy,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); refetchStatus() },
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pause Mode Banner */}
      {pauseMode && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pause size={20} className="text-amber-500" />
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-300">وضع الإيقاف المؤقت</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">جميع العمليات الآلية متوقفة مؤقتاً</p>
            </div>
          </div>
          <button onClick={() => setPauseMode(false)} className="btn-primary text-xs px-3 py-1.5">
            <Play size={13} />استئناف
          </button>
        </div>
      )}

      {/* Weekly quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary-500">{stats?.today ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-1">تقديمات اليوم</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{stats?.this_week ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-1">هذا الأسبوع</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{stats?.response_rate ?? '—'}%</p>
          <p className="text-xs text-gray-500 mt-1">معدل الاستجابة</p>
        </div>
      </div>

      {/* Top section: Agents status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agent 1 */}
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('w-2.5 h-2.5 rounded-full', a1?.state === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-400')} />
                <h3 className="font-semibold text-sm">Agent 1 — الباحث</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                آخر بحث: {a1?.last_run ? timeAgo(a1.last_run) : 'لم يبحث بعد'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                وجد اليوم: <span className="font-semibold text-gray-800 dark:text-gray-200">{a1?.jobs_found_today ?? 0} وظيفة</span>
              </p>
              {a1?.next_run && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                  <Clock size={11} />
                  البحث القادم: {timeAgo(a1.next_run)}
                </p>
              )}
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
                className={cn('p-2 rounded-xl transition-colors', a1?.state === 'running' ? 'bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100' : 'bg-green-50 dark:bg-green-900/20 text-green-500 hover:bg-green-100')}
                title={a1?.state === 'running' ? 'إيقاف' : 'تشغيل'}
              >
                {a1?.state === 'running' ? <ZapOff size={16} /> : <Zap size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Agent 2 */}
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('w-2.5 h-2.5 rounded-full', a2 ? 'bg-blue-500 animate-pulse' : 'bg-gray-400')} />
                <h3 className="font-semibold text-sm">Agent 2 — المقدّم</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                أرسل اليوم: <span className="font-semibold text-gray-800 dark:text-gray-200">{todaySent} تقديم</span>
              </p>
              {a2?.sent_today && Object.entries(a2.sent_today).map(([city, count]) => (
                <p key={city} className="text-xs text-gray-400">
                  {cityLabels[city as keyof typeof cityLabels] ?? city}: {count} / {(a2.limits as Record<string, number>)[city] ?? '—'}
                </p>
              ))}
            </div>
            <div className="flex gap-2">
              {/* Pause all */}
              <button
                onClick={() => setPauseMode(v => !v)}
                className={cn('p-2 rounded-xl transition-colors text-xs', pauseMode ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500 hover:bg-amber-100' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200')}
                title={pauseMode ? 'استئناف الكل' : 'إيقاف مؤقت للكل'}
              >
                <Pause size={16} />
              </button>
              <button
                onClick={() => toggle2.mutate(a2?.state !== 'running' as never)}
                disabled={pauseMode}
                className={cn('p-2 rounded-xl transition-colors', a2?.state === 'running' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-green-50 dark:bg-green-900/20 text-green-500')}
              >
                {a2?.state === 'running' ? <ZapOff size={16} /> : <Zap size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Goal + Tip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Goal */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Target size={16} className="text-primary-500" />
              هدف اليوم
            </h3>
            {!editGoal ? (
              <button onClick={() => { setEditGoal(true); setGoalInput(String(dailyGoal)) }} className="text-xs text-primary-500 hover:text-primary-600">تعديل</button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
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
              <span className="text-gray-600 dark:text-gray-400">{todaySent} من {dailyGoal} تقديم</span>
              <span className={cn('font-bold', goalProgress >= 100 ? 'text-green-500' : 'text-primary-500')}>{goalProgress}%</span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', goalProgress >= 100 ? 'bg-green-500' : 'bg-primary-500')}
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            {goalProgress >= 100 && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 size={12} />أنجزتِ هدف اليوم! 🎉
              </p>
            )}
          </div>
        </div>

        {/* Tip of the day */}
        <div className="card p-5 border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-300">
            <Lightbulb size={16} />
            نصيحة اليوم
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{TIPS[tipIdx]}</p>
          <Link to="/reports" className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1 mt-3">
            <BarChart2 size={12} />عرض التقرير الأسبوعي
          </Link>
        </div>
      </div>

      {/* Pending jobs */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">وظائف تنتظر موافقتك</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pendingJobs.length} وظيفة جديدة</p>
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
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Briefcase size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">لا وظائف جديدة الآن</p>
            <button onClick={() => searchNow.mutate()} disabled={pauseMode} className="btn-secondary text-xs mt-3 px-4">
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* City distribution */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4 text-sm">توزيع تقديمات اليوم حسب المدينة</h3>
          {cityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={cityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                  {cityChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">لا بيانات اليوم</div>
          )}
        </div>

        {/* Daily tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">مهام اليوم</h3>
            <Calendar size={16} className="text-gray-400" />
          </div>
          <div className="space-y-2">
            {pendingJobs.slice(0, 4).map(job => (
              <div key={job.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                  <Briefcase size={14} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{job.title}</p>
                  <p className="text-xs text-gray-500 truncate">{job.company}</p>
                </div>
                <span className={cn('badge text-xs', matchScoreBg(job.match_score))}>
                  {job.match_score}%
                </span>
              </div>
            ))}
            {pendingJobs.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-6">
                <CheckCircle2 size={24} className="mx-auto mb-2 text-green-400" />
                أنجزتِ كل مهام اليوم!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Best Time + Reminders row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Time to Apply */}
        <div className="card p-5">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Clock size={16} className="text-sky-500" />أفضل وقت للتقديم
          </h3>
          {bestTimeData ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-sky-500">{bestTimeData.time}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{bestTimeData.day}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{bestTimeData.tip}</p>
            </div>
          ) : (
            <div className="animate-pulse space-y-2">
              <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded w-32" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-48" />
            </div>
          )}
        </div>

        {/* Smart Reminders */}
        <div className="card p-5">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Bell size={16} className="text-amber-500" />تذكيرات ذكية
          </h3>
          <div className="space-y-2">
            {(remindersData?.reminders ?? []).slice(0, 3).map((r, i) => (
              <Link to={r.link} key={i} className={cn('flex items-start gap-2 p-2.5 rounded-xl text-xs transition-colors hover:opacity-80',
                r.urgency === 'high' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
                r.urgency === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' :
                'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              )}>
                <span className="mt-0.5 shrink-0">{r.urgency === 'high' ? '🔴' : r.urgency === 'medium' ? '🟡' : 'ℹ️'}</span>
                <p>{r.message}</p>
              </Link>
            ))}
            {!remindersData && <div className="animate-pulse h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />}
          </div>
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="card p-5">
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-amber-500" />الإنجازات
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {BADGES.map(badge => (
            <div key={badge.id} className={cn('flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all',
              badge.unlocked ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-800 opacity-40'
            )}>
              <span className="text-2xl">{badge.icon}</span>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{badge.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Career Paths */}
      {careerPathsData && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
            <Route size={16} className="text-primary-500" />مساراتي المهنية المقترحة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {careerPathsData.paths.slice(0, 4).map((path, i) => (
              <div key={i} className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-sm">{path.title}</p>
                  <span className={cn('badge shrink-0', path.match_percent >= 80 ? 'badge-green' : 'badge-amber')}>{path.match_percent}%</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{path.description}</p>
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

      {/* Todo List */}
      <div className="card p-5">
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
          <CheckCheck size={16} className="text-green-500" />قائمة مهام البحث الوظيفي
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
            <p className="text-center text-xs text-gray-400 py-4">لا مهام — أضيفي مهمة للبدء!</p>
          )}
          {todos.map(t => (
            <div key={t.id} className={cn('flex items-center gap-3 p-2.5 rounded-xl transition-colors', t.done ? 'bg-green-50 dark:bg-green-900/10' : 'bg-gray-50 dark:bg-gray-800')}>
              <button onClick={() => toggleTodo(t.id)} className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors', t.done ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-600')}>
                {t.done && <CheckCircle2 size={12} className="text-white" />}
              </button>
              <p className={cn('text-sm flex-1', t.done && 'line-through text-gray-400')}>{t.text}</p>
              <button onClick={() => deleteTodo(t.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent applications */}
      {recentApps.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">آخر التقديمات المرسلة</h3>
            <Link to="/applications" className="text-primary-500 text-sm hover:text-primary-600 flex items-center gap-1">
              عرض الكل <ChevronRight size={14} className="rotate-180" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentApps.slice(0, 4).map((job: Job) => (
              <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                  <TrendingUp size={16} className="text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.title}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin size={10} /> {cityLabels[job.city] ?? job.city} — {job.company}
                  </p>
                </div>
                <div className="text-left">
                  <span className={cn('badge-sky badge text-xs')}>مرسلة</span>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(job.discovered_at)}</p>
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
          <p className="font-semibold text-sm truncate">{job.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{job.company}</p>
        </div>
        <span className={cn('badge text-xs shrink-0', matchScoreBg(job.match_score))}>{job.match_score}%</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><MapPin size={11} />{cityLabels[job.city] ?? job.city}</span>
        <span className={cn('badge', platformColors[job.platform])}>{platformLabels[job.platform]}</span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{job.description}</p>
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
