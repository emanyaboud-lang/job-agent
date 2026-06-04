import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, SendHorizonal, Mail, Settings, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'

const mainNav = [
  { to: '/',             icon: LayoutDashboard, label: 'الرئيسية' },
  { to: '/jobs',         icon: Briefcase,       label: 'الوظائف' },
  { to: '/applications', icon: SendHorizonal,   label: 'التقديمات' },
  { to: '/emails',       icon: Mail,            label: 'الإيميلات' },
  { to: '/settings',     icon: Settings,        label: 'الإعدادات' },
]

const moreNav = [
  { to: '/cv',            label: 'السيرة الذاتية' },
  { to: '/letter',        label: 'رسالة التقديم' },
  { to: '/skills',        label: 'مهاراتي وأدواتي' },
  { to: '/reports',       label: 'التقارير' },
  { to: '/contacts',      label: 'جهات الاتصال' },
  { to: '/stats',         label: 'الإحصائيات' },
  { to: '/log',           label: 'سجل الأحداث' },
  { to: '/jobs/rejected', label: 'الوظائف المرفوضة' },
]

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { setSidebarOpen } = useStore()

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMoreOpen(false)} />
      )}

      {/* More menu */}
      {moreOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-50 lg:hidden mx-3 mb-1 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-slide-down">
          {moreNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center px-5 py-3.5 text-sm font-medium border-b border-gray-50 dark:border-gray-800 last:border-0',
                isActive
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center px-1 safe-bottom"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mainNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => { setMoreOpen(false); setSidebarOpen(false) }}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
              isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
            moreOpen ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
          )}
        >
          <MoreHorizontal size={22} />
          <span className="text-[10px] font-medium">المزيد</span>
        </button>
      </nav>
    </>
  )
}
