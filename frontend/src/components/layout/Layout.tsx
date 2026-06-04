import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import FloatingChat from '@/components/chat/FloatingChat'
import KeyboardShortcuts from './KeyboardShortcuts'

export default function Layout() {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f4ff] dark:bg-[#080d1a]">
      {/* Sidebar — desktop only */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main
          key={location.pathname}
          className="flex-1 overflow-y-auto p-3 md:p-6 page-enter pb-20 lg:pb-6"
        >
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />

      <FloatingChat />
      <KeyboardShortcuts />
    </div>
  )
}
