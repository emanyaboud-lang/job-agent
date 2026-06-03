import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import FloatingChat from '@/components/chat/FloatingChat'

export default function Layout() {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main
          key={location.pathname}
          className="flex-1 overflow-y-auto p-4 md:p-6 page-enter"
        >
          <Outlet />
        </main>
      </div>
      <FloatingChat />
    </div>
  )
}
