import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/store/useStore'
import { agentsApi, notificationsApi } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import {
  Menu, Search, Bell, Sun, Moon, Zap, ZapOff,
  CheckCheck, ChevronDown,
} from 'lucide-react'

export default function Header() {
  const { theme, setTheme, sidebarOpen, setSidebarOpen, unreadCount, notifications, markAllRead, agentStatus, setAgentStatus, globalSearch, setGlobalSearch } = useStore()
  const [bellOpen, setBellOpen] = useState(false)
  const [searchFocus, setSearchFocus] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: status } = useQuery({
    queryKey: ['agent-status'],
    queryFn: agentsApi.status as () => Promise<typeof agentStatus>,
    refetchInterval: 15000,
  })

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list as () => Promise<typeof notifications>,
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (status) setAgentStatus(status as typeof agentStatus)
  }, [status])

  useEffect(() => {
    if (notifs) useStore.getState().setNotifications(notifs as typeof notifications)
  }, [notifs])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const agent1Running = agentStatus?.agent1.state === 'running'
  const todayTotal = Object.values(agentStatus?.agent2.sent_today ?? {}).reduce((a, b) => a + b, 0)

  return (
    <header className="h-14 md:h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-3 md:px-4 gap-2 md:gap-3 shrink-0 z-10">
      {/* Logo — mobile only (no sidebar) */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-7 h-7 rounded-xl bg-primary-500 flex items-center justify-center shrink-0">
          <span className="text-white font-black text-xs">JA</span>
        </div>
        <span className="font-black text-base text-gray-900 dark:text-white">Job Agents</span>
      </div>

      {/* Global search — desktop only */}
      <div className={`relative hidden md:block flex-1 max-w-md transition-all duration-200 ${searchFocus ? 'max-w-lg' : ''}`}>
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="ابحث عن وظيفة، شركة، أو حالة..."
          className="input pr-9 py-2 text-sm"
          value={globalSearch}
          onChange={e => setGlobalSearch(e.target.value)}
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
          onKeyDown={e => { if (e.key === 'Enter' && globalSearch) navigate(`/jobs?q=${globalSearch}`) }}
        />
      </div>

      <div className="flex items-center gap-1 md:gap-2 mr-auto">
        {/* Today's applications count */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm font-medium">
          <span>{todayTotal}</span>
          <span className="text-primary-500">تقديم اليوم</span>
        </div>

        {/* Agent 1 status */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
          <span className={`w-2 h-2 rounded-full animate-pulse-dot ${agent1Running ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-gray-600 dark:text-gray-400 text-xs">
            {agent1Running ? 'Agent 1 يبحث' : 'Agent 1 موقوف'}
          </span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            className="btn-ghost p-2 relative"
            onClick={() => setBellOpen(!bellOpen)}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 card shadow-lg z-50 overflow-hidden animate-slide-down">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="font-semibold text-sm">الإشعارات</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => { markAllRead(); notificationsApi.markAll() }}
                    className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                  >
                    <CheckCheck size={14} />
                    تعليم الكل كمقروء
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">لا إشعارات</div>
                ) : notifications.slice(0, 20).map(n => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${!n.is_read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                    onClick={() => { useStore.getState().markRead(n.id); if (n.link) navigate(n.link) }}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          className="btn-ghost p-2"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'وضع فاتح' : 'وضع مظلم'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  )
}
