import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { chatApi } from '@/lib/api'
import { ChatMessage } from '@/types'
import { MessageCircle, X, Send, Trash2, Bot, User } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'

export default function FloatingChat() {
  const { chatOpen, setChatOpen, chatMessages, addChatMessage, clearChat } = useStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatOpen])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    }
    addChatMessage(userMsg)
    setLoading(true)

    try {
      const res = await chatApi.send(msg, chatMessages) as { reply: string }
      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      })
    } catch {
      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'عذراً، حدث خطأ. تأكدي من اتصال الخادم.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Chat window */}
      {chatOpen && (
        <div className="fixed bottom-20 left-4 z-50 w-80 md:w-96 card shadow-xl flex flex-col animate-slide-up overflow-hidden"
          style={{ height: '480px' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary-500 text-white shrink-0">
            <Bot size={20} />
            <div className="flex-1">
              <p className="font-semibold text-sm">مساعد Job Agents</p>
              <p className="text-xs text-primary-100">اسأليني أي شيء عن وظائفك أو CV</p>
            </div>
            <button onClick={() => clearChat()} className="hover:text-primary-200 ml-1" title="مسح المحادثة">
              <Trash2 size={16} />
            </button>
            <button onClick={() => setChatOpen(false)} className="hover:text-primary-200">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8 space-y-2">
                <Bot size={32} className="mx-auto text-primary-400" />
                <p className="font-medium">كيف أساعدك؟</p>
                <div className="space-y-1.5 mt-4">
                  {['كم وظيفة وجدنا اليوم؟', 'ما نسبة الردود هذا الشهر؟', 'اقترح تحسينات على الـ CV'].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q) }}
                      className="block w-full text-right text-xs bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-3 py-2 rounded-xl transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map(msg => (
              <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1',
                  msg.role === 'user' ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                )}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} className="text-primary-500" />}
                </div>
                <div className={cn(
                  'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-tr-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className={cn('text-xs mt-1', msg.role === 'user' ? 'text-primary-100' : 'text-gray-400')}>
                    {timeAgo(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Bot size={14} className="text-primary-500" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex gap-2 shrink-0">
            <input
              className="input text-sm py-2"
              placeholder="اكتبي رسالتك..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="btn-primary px-3 py-2 shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-4 left-4 z-50 w-14 h-14 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white shadow-lg transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
      >
        {chatOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  )
}
