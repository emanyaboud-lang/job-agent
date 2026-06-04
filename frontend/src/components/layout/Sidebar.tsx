import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import {
  LayoutDashboard, Briefcase, SendHorizonal, Mail,
  FileText, PenLine, BarChart2, Settings, ScrollText,
  XCircle, ChevronRight, TrendingUp, Users, Sparkles,
} from 'lucide-react'

const nav = [
  { to: '/',             icon: LayoutDashboard, label: 'الرئيسية',       color: 'from-sky-400 to-blue-600' },
  { to: '/jobs',         icon: Briefcase,       label: 'الوظائف',        color: 'from-emerald-400 to-teal-600' },
  { to: '/applications', icon: SendHorizonal,   label: 'التقديمات',      color: 'from-violet-400 to-purple-600' },
  { to: '/emails',       icon: Mail,            label: 'الإيميلات',      color: 'from-pink-400 to-rose-600' },
  { to: '/cv',           icon: FileText,        label: 'السيرة الذاتية', color: 'from-amber-400 to-orange-600' },
  { to: '/letter',       icon: PenLine,         label: 'رسالة التقديم',  color: 'from-teal-400 to-cyan-600' },
  { to: '/skills',       icon: Sparkles,        label: 'مهاراتي',        color: 'from-fuchsia-400 to-pink-600' },
  { to: '/reports',      icon: TrendingUp,      label: 'التقارير',       color: 'from-sky-400 to-indigo-600' },
  { to: '/contacts',     icon: Users,           label: 'جهات الاتصال',   color: 'from-green-400 to-emerald-600' },
  { to: '/stats',        icon: BarChart2,       label: 'الإحصائيات',     color: 'from-blue-400 to-sky-600' },
  { to: '/log',          icon: ScrollText,      label: 'سجل الأحداث',    color: 'from-gray-400 to-slate-600' },
  { to: '/settings',     icon: Settings,        label: 'الإعدادات',      color: 'from-slate-400 to-gray-600' },
]

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useStore()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        'fixed top-0 right-0 h-full z-30 flex flex-col',
        // Light mode: white with subtle border. Dark mode: glass effect.
        'bg-white dark:bg-[rgba(8,13,26,0.85)] dark:backdrop-blur-xl dark:backdrop-saturate-150',
        'border-l border-gray-100/80 dark:border-white/[0.07]',
        'transition-all duration-300 ease-in-out',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'w-60' : 'lg:w-16',
        !sidebarOpen ? 'max-lg:translate-x-full max-lg:w-60' : 'max-lg:w-72',
      )}>

        {/* ── Logo / Brand ── */}
        <div className={cn(
          'h-16 flex items-center px-4 border-b border-gray-100/80 dark:border-white/[0.06] shrink-0',
        )}>
          <div className={cn('flex items-center gap-3 overflow-hidden', !sidebarOpen && 'lg:justify-center')}>
            {/* Gradient logo mark */}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30">
              <span className="text-white font-black text-sm leading-none">JA</span>
            </div>
            {sidebarOpen && (
              <span className="font-black text-lg text-gray-900 dark:text-white whitespace-nowrap tracking-tight">
                Job <span className="gradient-text">Agents</span>
              </span>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="mr-auto text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 lg:flex hidden transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06]"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {nav.map(({ to, icon: Icon, label, color }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={!sidebarOpen ? label : undefined}
              className={({ isActive }) => cn(
                'group flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'nav-active'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-slate-200',
                !sidebarOpen && 'lg:justify-center lg:px-0',
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200',
                    isActive
                      ? `bg-gradient-to-br ${color} shadow-sm`
                      : 'bg-gray-100 dark:bg-white/[0.06] group-hover:bg-gray-200 dark:group-hover:bg-white/[0.1]',
                  )}>
                    <Icon size={15} className={isActive ? 'text-white' : 'text-gray-500 dark:text-slate-400'} />
                  </div>
                  {sidebarOpen && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}

          {/* Rejected jobs */}
          <NavLink
            to="/jobs/rejected"
            title={!sidebarOpen ? 'الوظائف المرفوضة' : undefined}
            className={({ isActive }) => cn(
              'group flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-red-50 dark:bg-red-500/15 border border-red-200/60 dark:border-red-500/20 text-red-600 dark:text-red-400'
                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-slate-200',
              !sidebarOpen && 'lg:justify-center lg:px-0',
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-br from-red-400 to-rose-600 shadow-sm'
                    : 'bg-gray-100 dark:bg-white/[0.06] group-hover:bg-gray-200 dark:group-hover:bg-white/[0.1]',
                )}>
                  <XCircle size={15} className={isActive ? 'text-white' : 'text-gray-500 dark:text-slate-400'} />
                </div>
                {sidebarOpen && <span className="truncate">المرفوضة</span>}
              </>
            )}
          </NavLink>
        </nav>

        {/* ── Profile section (expanded) ── */}
        {sidebarOpen && (
          <div className="px-3 pb-3 shrink-0">
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] flex items-center gap-3">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-400 to-violet-600 shadow-md shadow-sky-500/20">
                <span className="text-white font-black text-sm leading-none">إ</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">إيمان العبود</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">مديرة مشاريع</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Collapse button (desktop collapsed) ── */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden lg:flex items-center justify-center p-4 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            <ChevronRight size={16} className="rotate-180" />
          </button>
        )}
      </aside>
    </>
  )
}
