import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesApi, emailsApi, applicationsApi, interviewApi } from '@/lib/api'
import { Company, Email, Application } from '@/types'
import { cn, statusColors, statusLabels, formatDateTime, timeAgo } from '@/lib/utils'
import { Send, Mail, Reply, Building2, ArrowRight, Brain, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [replyId, setReplyId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [showInterviewPrep, setShowInterviewPrep] = useState<string | null>(null)

  const { data: company } = useQuery<Company>({
    queryKey: ['company', id],
    queryFn: () => companiesApi.get(id!) as Promise<Company>,
    enabled: !!id,
  })

  const { data: emails = [] } = useQuery<Email[]>({
    queryKey: ['emails', 'thread', id],
    queryFn: () => emailsApi.thread(id!) as Promise<Email[]>,
    enabled: !!id,
    refetchInterval: 30000,
  })

  const { data: apps = [] } = useQuery<Application[]>({
    queryKey: ['applications', 'company', id],
    queryFn: () => applicationsApi.list({ company_id: id! }) as Promise<Application[]>,
    enabled: !!id,
  })

  const replyMut = useMutation({
    mutationFn: ({ eid, body }: { eid: string; body: string }) => emailsApi.reply(eid, body),
    onSuccess: () => { setReplyId(null); setReplyText(''); qc.invalidateQueries({ queryKey: ['emails', 'thread', id] }) },
  })

  const { data: interviewPrep } = useQuery({
    queryKey: ['interview-prep', showInterviewPrep],
    queryFn: () => interviewApi.get(showInterviewPrep!),
    enabled: !!showInterviewPrep,
  })

  const genInterviewPrep = useMutation({
    mutationFn: (appId: string) => interviewApi.generate(appId),
    onSuccess: (_, appId) => setShowInterviewPrep(appId),
  })

  if (!company) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/applications" className="btn-ghost p-2"><ArrowRight size={18} /></Link>
        <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <Building2 size={24} className="text-primary-500" />
        </div>
        <div>
          <h1 className="font-bold text-xl">{company.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {company.applications_count} تقديم — آخر تواصل: {timeAgo(company.last_contact)}
          </p>
        </div>
      </div>

      {/* Applications */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold">التقديمات</h2>
        {apps.length === 0 ? (
          <p className="text-sm text-gray-500">لا تقديمات</p>
        ) : apps.map(app => (
          <div key={app.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{app.job?.title}</p>
              <p className="text-xs text-gray-400">{formatDateTime(app.sent_at)}</p>
            </div>
            <span className={cn('badge', statusColors[app.status])}>{statusLabels[app.status]}</span>
            {app.status === 'interview' && (
              <button
                onClick={() => genInterviewPrep.mutate(app.id)}
                disabled={genInterviewPrep.isPending}
                className="btn-primary text-xs px-3 py-1.5"
                title="مساعد المقابلة"
              >
                {genInterviewPrep.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Brain size={13} />}
                تحضير مقابلة
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Interview Prep */}
      {showInterviewPrep && interviewPrep && (
        <div className="card p-5 space-y-4 border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-primary-500" />
            <h2 className="font-semibold">مساعد المقابلة — {(interviewPrep as { job_title: string }).job_title}</h2>
          </div>
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4">
            <p className="text-sm font-medium mb-2">معلومات الشركة:</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{(interviewPrep as { company_info: string }).company_info}</p>
          </div>
          <div>
            <p className="text-sm font-medium mb-3">نقاط التركيز:</p>
            <div className="flex flex-wrap gap-2">
              {(interviewPrep as { key_points: string[] }).key_points?.map((p: string, i: number) => (
                <span key={i} className="badge-sky">{p}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-3">أسئلة متوقعة:</p>
            <div className="space-y-3">
              {(interviewPrep as { questions: { question: string; tip: string; focus: string }[] }).questions?.map((q, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-sm font-medium flex items-start gap-2">
                    <span className="badge-blue shrink-0">{i + 1}</span>
                    {q.question}
                  </p>
                  <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">💡 {q.tip}</p>
                  <p className="text-xs text-gray-400 mt-1">التركيز: {q.focus}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Email thread */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Mail size={18} />محادثة الإيميل</h2>
        {emails.length === 0 ? (
          <p className="text-sm text-gray-500">لا إيميلات مع هذه الشركة</p>
        ) : (
          <div className="space-y-4 relative">
            <div className="absolute right-5 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-800 -z-0" />
            {emails.map(email => (
              <div key={email.id} className="flex gap-4 relative z-10">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                  email.direction === 'outgoing' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30')}>
                  {email.direction === 'outgoing' ? <Send size={16} className="text-blue-500" /> : <Mail size={16} className="text-green-500" />}
                </div>
                <div className="flex-1 card p-4 space-y-2">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-medium text-sm">{email.subject}</p>
                      <p className="text-xs text-gray-500">{email.direction === 'outgoing' ? `إلى: ${email.to_email}` : `من: ${email.from_email}`} • {timeAgo(email.sent_at)}</p>
                    </div>
                    {email.status === 'opened' && <span className="badge-green text-xs">✓ فُتح</span>}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{email.body}</p>
                  {email.ai_summary && (
                    <div className="text-xs text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg">
                      <span className="font-medium">ملخص: </span>{email.ai_summary}
                    </div>
                  )}
                  {email.direction === 'incoming' && replyId !== email.id && (
                    <button onClick={() => { setReplyId(email.id); setReplyText('') }} className="btn-ghost text-xs px-2 py-1 self-start">
                      <Reply size={13} />رد
                    </button>
                  )}
                  {replyId === email.id && (
                    <div className="space-y-2">
                      <textarea className="input text-sm resize-none" rows={4} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="اكتبي ردك..." />
                      <div className="flex gap-2">
                        <button onClick={() => setReplyId(null)} className="btn-secondary text-xs">إلغاء</button>
                        <button onClick={() => replyMut.mutate({ eid: email.id, body: replyText })} disabled={!replyText.trim()} className="btn-primary text-xs">
                          <Send size={13} />إرسال
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
