import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import {
  LayoutDashboard, Briefcase, SendHorizonal, Mail,
  FileText, PenLine, BarChart2, Settings, ScrollText,
  XCircle, ChevronRight, TrendingUp, Users, Sparkles,
} from 'lucide-react'

const nav = [
  { to: '/',             icon: LayoutDashboard, label: 'الرئيسية' },
  { to: '/jobs',         icon: Briefcase,       label: 'الوظائف' },
  { to: '/applications', icon: SendHorizonal,   label: 'التقديمات' },
  { to: '/emails',       icon: Mail,            label: 'الإيميلات' },
  { to: '/cv',           icon: FileText,        label: 'السيرة الذاتية' },
  { to: '/letter',       icon: PenLine,         label: 'رسالة التقديم' },
  { to: '/skills',       icon: Sparkles,        label: 'مهاراتي' },
  { to: '/reports',      icon: TrendingUp,      label: 'التقارير' },
  { to: '/contacts',     icon: Users,           label: 'جهات الاتصال' },
  { to: '/stats',        icon: BarChart2,       label: 'الإحصائيات' },
  { to: '/log',          icon: ScrollText,      label: 'سجل الأحداث' },
  { to: '/settings',     icon: Settings,        label: 'الإعدادات' },
]

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useStore()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        'fixed top-0 right-0 h-full z-30 flex flex-col',
        'bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800',
        'transition-all duration-300 ease-in-out',
        // desktop: show collapsed (w-16) or expanded (w-60)
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'w-60' : 'lg:w-16',
        // mobile: hidden by default, slide in from right when open
        !sidebarOpen ? 'max-lg:translate-x-full max-lg:w-60' : 'max-lg:w-72',
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className={cn('flex items-center gap-3 overflow-hidden', !sidebarOpen && 'lg:justify-center')}>
            <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-sm">JA</span>
            </div>
            {sidebarOpen && (
              <span className="font-black text-lg text-gray-900 dark:text-white whitespace-nowrap">
                Job Agents
              </span>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="mr-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 lg:flex hidden"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
                !sidebarOpen && 'lg:justify-center lg:px-0',
              )}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
          <NavLink
            to="/jobs/rejected"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
              !sidebarOpen && 'lg:justify-center lg:px-0',
            )}
            title={!sidebarOpen ? 'الوظائف المرفوضة' : undefined}
          >
            <XCircle size={20} className="shrink-0" />
            {sidebarOpen && <span className="truncate">المرفوضة</span>}
          </NavLink>
        </nav>

        {/* Collapse btn (desktop) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden lg:flex items-center justify-center p-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <ChevronRight size={18} className="rotate-180" />
          </button>
        )}
      </aside>
    </>
  )
}
