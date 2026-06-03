import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { emailsApi, companiesApi } from '@/lib/api'
import { Email, Company } from '@/types'
import { cn, formatDateTime, timeAgo } from '@/lib/utils'
import { Mail, Send, Eye, ChevronRight, Reply, Building2, Search, Filter } from 'lucide-react'

export default function Emails() {
  const qc = useQueryClient()
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [filterDir, setFilterDir] = useState<'' | 'outgoing' | 'incoming'>('')
  const [replyTarget, setReplyTarget] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [search, setSearch] = useState('')

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list() as Promise<Company[]>,
  })

  const emailParams: Record<string, string> = {}
  if (filterDir) emailParams.direction = filterDir

  const { data: emails = [] } = useQuery<Email[]>({
    queryKey: ['emails', selectedCompany, emailParams],
    queryFn: () => selectedCompany
      ? emailsApi.thread(selectedCompany) as Promise<Email[]>
      : emailsApi.list(emailParams) as Promise<Email[]>,
    refetchInterval: 30000,
  })

  const reply = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => emailsApi.reply(id, body),
    onSuccess: () => { setReplyTarget(null); setReplyText(''); qc.invalidateQueries({ queryKey: ['emails'] }) },
  })

  const filtered = emails.filter(e =>
    !search ||
    e.subject.toLowerCase().includes(search.toLowerCase()) ||
    e.from_email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-bold text-xl">الإيميلات</h1>

        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input text-sm pr-8 py-2 w-56" placeholder="بحث في الإيميلات..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="flex gap-1">
          {[{ v: '', l: 'الكل' }, { v: 'outgoing', l: 'صادرة' }, { v: 'incoming', l: 'واردة' }].map(o => (
            <button key={o.v} onClick={() => setFilterDir(o.v as typeof filterDir)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                filterDir === o.v ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'badge-gray hover:bg-gray-200 dark:hover:bg-gray-700')}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Companies sidebar */}
        <div className="lg:col-span-1 card p-3 space-y-1 h-fit">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 mb-2">الشركات</p>
          <button
            onClick={() => setSelectedCompany(null)}
            className={cn('w-full text-right px-3 py-2 rounded-xl text-sm transition-all',
              !selectedCompany ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800')}
          >
            جميع الشركات
          </button>
          {companies.map(c => (
            <button key={c.id} onClick={() => setSelectedCompany(c.id)}
              className={cn('w-full text-right px-3 py-2 rounded-xl text-sm transition-all flex items-center gap-2',
                selectedCompany === c.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800')}>
              <Building2 size={14} className="shrink-0 text-gray-400" />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>

        {/* Emails list */}
        <div className="lg:col-span-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="card p-12 text-center text-gray-500">
              <Mail size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>لا إيميلات</p>
            </div>
          ) : filtered.map(email => (
            <div key={email.id} className="card p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  email.direction === 'outgoing' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30')}>
                  {email.direction === 'outgoing'
                    ? <Send size={16} className="text-blue-500" />
                    : <Mail size={16} className="text-green-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{email.subject}</p>
                    {email.status === 'opened' && (
                      <span className="badge-green text-xs flex items-center gap-1"><Eye size={10} />فُتح</span>
                    )}
                    {email.status === 'failed' && <span className="badge-red text-xs">فشل</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {email.direction === 'outgoing' ? `إلى: ${email.to_email}` : `من: ${email.from_email}`}
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-xs text-gray-400">{timeAgo(email.sent_at)}</p>
                  {email.opened_at && (
                    <p className="text-xs text-green-500 mt-0.5">{formatDateTime(email.opened_at)}</p>
                  )}
                </div>
              </div>

              {/* Body preview */}
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                {email.body}
              </p>

              {/* AI summary */}
              {email.ai_summary && (
                <div className="flex items-start gap-2 text-xs text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 p-3 rounded-xl">
                  <span className="font-medium shrink-0">ملخص AI:</span>
                  <span>{email.ai_summary}</span>
                </div>
              )}

              {/* Reply */}
              {replyTarget === email.id ? (
                <div className="space-y-2">
                  <textarea
                    className="input resize-none text-sm"
                    rows={4}
                    placeholder="اكتبي ردك هنا..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setReplyTarget(null)} className="btn-secondary text-xs">إلغاء</button>
                    <button
                      onClick={() => reply.mutate({ id: email.id, body: replyText })}
                      disabled={!replyText.trim() || reply.isPending}
                      className="btn-primary text-xs"
                    >
                      <Send size={13} />إرسال الرد
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {email.direction === 'incoming' && (
                    <button onClick={() => { setReplyTarget(email.id); setReplyText('') }} className="btn-secondary text-xs px-3 py-1.5">
                      <Reply size={13} />رد
                    </button>
                  )}
                  {email.thread_id && (
                    <Link to={`/company/${email.company_id}`} className="btn-ghost text-xs px-3 py-1.5">
                      <Building2 size={13} />ملف الشركة
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
