import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Keyboard } from 'lucide-react'
import QuickSearch from './QuickSearch'

const SHORTCUTS = [
  { keys: 'Ctrl + K', label: 'البحث السريع' },
  { keys: 'Ctrl + 1', label: 'لوحة التحكم' },
  { keys: 'Ctrl + 2', label: 'الوظائف' },
  { keys: 'Ctrl + 3', label: 'التقديمات' },
  { keys: 'Ctrl + 4', label: 'السيرة الذاتية' },
  { keys: 'Ctrl + 5', label: 'التقارير' },
  { keys: 'Ctrl + 6', label: 'جهات الاتصال' },
  { keys: 'Ctrl + 7', label: 'الإعدادات' },
  { keys: 'Ctrl + S', label: 'حفظ الإعدادات (في صفحة الإعدادات)' },
  { keys: '?', label: 'عرض اختصارات لوحة المفاتيح' },
  { keys: 'Esc', label: 'إغلاق النافذة المنبثقة' },
]

const PAGE_MAP: Record<string, string> = {
  '1': '/', '2': '/jobs', '3': '/applications',
  '4': '/cv', '5': '/reports', '6': '/contacts', '7': '/settings',
}

export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)

      // Ctrl+K — Quick search
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
        return
      }

      // Ctrl+1-9 — Navigate
      if (e.ctrlKey && PAGE_MAP[e.key]) {
        e.preventDefault()
        navigate(PAGE_MAP[e.key])
        return
      }

      // ? — Show shortcuts help
      if (!isInput && e.key === '?' && !e.ctrlKey && !e.altKey) {
        setShowHelp(true)
        return
      }

      // Esc — Close modals
      if (e.key === 'Escape') {
        setShowHelp(false)
        setShowSearch(false)
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  return (
    <>
      {/* Quick Search Modal */}
      <QuickSearch open={showSearch} onClose={() => setShowSearch(false)} />

      {/* Shortcuts Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold flex items-center gap-2"><Keyboard size={18} />اختصارات لوحة المفاتيح</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {SHORTCUTS.map(s => (
                <div key={s.keys} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{s.label}</span>
                  <kbd className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg font-mono font-medium">{s.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick search trigger button in corner */}
      <button
        onClick={() => setShowSearch(true)}
        className="fixed bottom-20 left-4 lg:bottom-6 lg:left-6 z-40 w-10 h-10 rounded-full bg-primary-500 text-white shadow-lg flex items-center justify-center hover:bg-primary-600 transition-colors"
        title="بحث سريع (Ctrl+K)"
      >
        <Keyboard size={16} />
      </button>
    </>
  )
}
