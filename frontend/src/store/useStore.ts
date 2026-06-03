import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Notification, AgentStatus, Theme, PrimaryColor, ChatMessage } from '@/types'
import { applyPrimaryColor } from '@/lib/utils'

interface AppStore {
  // Theme
  theme: Theme
  primaryColor: PrimaryColor
  setTheme: (t: Theme) => void
  setPrimaryColor: (c: PrimaryColor) => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void

  // Notifications
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Notification) => void
  markRead: (id: string) => void
  markAllRead: () => void
  setNotifications: (ns: Notification[]) => void

  // Agent status
  agentStatus: AgentStatus | null
  setAgentStatus: (s: AgentStatus) => void

  // Global chat
  chatOpen: boolean
  chatMessages: ChatMessage[]
  setChatOpen: (v: boolean) => void
  addChatMessage: (m: ChatMessage) => void
  clearChat: () => void

  // Search
  globalSearch: string
  setGlobalSearch: (q: string) => void
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      primaryColor: 'sky',
      setTheme: (t) => {
        set({ theme: t })
        document.documentElement.classList.toggle('dark', t === 'dark')
      },
      setPrimaryColor: (c) => {
        set({ primaryColor: c })
        applyPrimaryColor(c)
      },

      sidebarOpen: true,
      setSidebarOpen: (v) => set({ sidebarOpen: v }),

      notifications: [],
      unreadCount: 0,
      addNotification: (n) => set(s => ({
        notifications: [n, ...s.notifications].slice(0, 100),
        unreadCount: s.unreadCount + 1,
      })),
      markRead: (id) => set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      })),
      markAllRead: () => set(s => ({
        notifications: s.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0,
      })),
      setNotifications: (ns) => set({
        notifications: ns,
        unreadCount: ns.filter(n => !n.is_read).length,
      }),

      agentStatus: null,
      setAgentStatus: (s) => set({ agentStatus: s }),

      chatOpen: false,
      chatMessages: [],
      setChatOpen: (v) => set({ chatOpen: v }),
      addChatMessage: (m) => set(s => ({ chatMessages: [...s.chatMessages, m] })),
      clearChat: () => set({ chatMessages: [] }),

      globalSearch: '',
      setGlobalSearch: (q) => set({ globalSearch: q }),
    }),
    {
      name: 'job-agents-store',
      partialize: (s) => ({
        theme: s.theme,
        primaryColor: s.primaryColor,
        sidebarOpen: s.sidebarOpen,
        chatMessages: s.chatMessages,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('dark', state.theme === 'dark')
          applyPrimaryColor(state.primaryColor)
        }
      },
    }
  )
)
