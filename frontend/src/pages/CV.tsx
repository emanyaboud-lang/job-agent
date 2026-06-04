import React, { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cvApi, jobsApi, featuresApi } from '@/lib/api'
import { CVFile, Job, CVHints } from '@/types'
import { cn, formatDate } from '@/lib/utils'
import {
  Upload, FileText, Star, Trash2, Download, Send,
  CheckCircle2, ChevronDown, ChevronUp, Bot, User,
  RefreshCw, TrendingUp, AlertCircle, Lightbulb, Wand2, Sparkles, GitCompare,
} from 'lucide-react'

export default function CV() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'files' | 'analysis' | 'chat' | 'skills' | 'hints' | 'improve' | 'compare'>('files')
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { data: cvFiles = [], isLoading } = useQuery<CVFile[]>({
    queryKey: ['cv'],
    queryFn: () => cvApi.list() as Promise<CVFile[]>,
  })

  const primary = cvFiles.find(f => f.is_primary)

  const { data: skillGap = [] } = useQuery({
    queryKey: ['skill-gap'],
    queryFn: () => cvApi.skillGap() as Promise<{ skill: string; demand_level: string; you_have: boolean; suggestion?: string }[]>,
    enabled: activeTab === 'skills',
  })

  const uploadMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return cvApi.upload(fd)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cv'] }),
  })

  const analyzeMut = useMutation({
    mutationFn: (id: string) => cvApi.analyze(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cv'] }),
  })

  const setPrimary = useMutation({
    mutationFn: (id: string) => cvApi.setPrimary(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cv'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => cvApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cv'] }),
  })

  const handleFile = useCallback((file: File) => {
    if (!file) return
    uploadMut.mutate(file)
  }, [uploadMut])

  const sendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    const history = [...chatHistory, { role: 'user' as const, content: msg }]
    setChatHistory(history)
    setChatLoading(true)
    try {
      const res = await cvApi.chat(msg, chatHistory) as { reply: string }
      setChatHistory([...history, { role: 'assistant', content: res.reply }])
    } catch {
      setChatHistory([...history, { role: 'assistant', content: 'حدث خطأ، حاولي مرة أخرى.' }])
    } finally {
      setChatLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  const [hintsJobId, setHintsJobId] = useState('')
  const [hintsResult, setHintsResult] = useState<CVHints | null>(null)

  const { data: allJobs = [] } = useQuery<Job[]>({
    queryKey: ['jobs', { status: 'pending' }],
    queryFn: () => jobsApi.list({ status: 'pending' }) as Promise<Job[]>,
    enabled: activeTab === 'hints',
  })

  const hintsMut = useMutation({
    mutationFn: () => featuresApi.cvHints({
      job_id: hintsJobId,
      cv_text: primary?.analysis ? JSON.stringify(primary.analysis) : '',
    }) as Promise<CVHints>,
    onSuccess: (data) => setHintsResult(data),
  })

  const [improveResult, setImproveResult] = useState<{ improved_sections: { section: string; original: string; improved: string; reason: string }[] } | null>(null)
  const [improvingCV, setImprovingCV] = useState(false)

  async function runCVImprove() {
    if (!primary) return
    setImprovingCV(true)
    setImproveResult(null)
    try {
      const cvText = primary.analysis ? JSON.stringify(primary.analysis) : primary.file_name
      const res = await featuresApi.cvImprove({ cv_text: cvText }) as { improved_sections: { section: string; original: string; improved: string; reason: string }[] }
      setImproveResult(res)
    } catch {}
    setImprovingCV(false)
  }

  const TABS = [
    { id: 'files',    label: 'الملفات' },
    { id: 'analysis', label: 'التحليل' },
    { id: 'chat',     label: 'شات AI' },
    { id: 'skills',   label: 'فجوة المهارات' },
    { id: 'hints',    label: 'تلميحات AI' },
    { id: 'improve',  label: 'تحسين AI' },
    { id: 'compare',  label: 'مقارنة النسخ' },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-black text-xl gradient-text">السيرة الذاتية</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {primary ? `الملف الأساسي: ${primary.version_name || primary.file_name}` : 'لم يُرفع ملف بعد'}
          </p>
        </div>
        {primary?.analysis && (
          <div className="flex items-center gap-3">
            {/* Score circle */}
            <div className="flex items-center gap-2 card px-4 py-2">
              <div className="match-ring text-gray-700 dark:text-white"
                style={{
                  '--ring-color': '#10b981',
                  '--ring-pct': '82%',
                } as React.CSSProperties}>
                82%
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800 dark:text-white">قوة CV</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500">ممتاز</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/80 dark:bg-white/[0.05] p-1 rounded-2xl w-fit border border-gray-200/50 dark:border-white/[0.06] overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
              activeTab === t.id
                ? 'bg-white dark:bg-[rgba(15,23,42,0.8)] text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-white/[0.08]'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          {/* Upload zone */}
          <div
            className={cn('border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
              dragging ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:bg-gray-50 dark:hover:bg-gray-800/50')}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
            {uploadMut.isPending ? (
              <div className="flex items-center justify-center gap-2 text-primary-500">
                <RefreshCw size={24} className="animate-spin" />
                <span>جاري الرفع والتحليل...</span>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-gray-400" />
                <p className="font-medium text-gray-700 dark:text-gray-300">اسحبي الملف هنا أو انقري للاختيار</p>
                <p className="text-sm text-gray-400 mt-1">PDF, Word, صورة (الجديد يصبح الأساسي)</p>
              </>
            )}
          </div>

          {/* CV files list */}
          {isLoading ? <div className="card h-32 shimmer" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cvFiles.map(cv => (
                <div key={cv.id} className={cn('card p-4 space-y-3', cv.is_primary && 'border-sky-200/60 dark:border-sky-500/20 bg-sky-50/20 dark:bg-sky-500/5')}>
                  <div className="flex items-start gap-3">
                    <FileText size={24} className={cn('shrink-0 mt-0.5', cv.is_primary ? 'text-primary-500' : 'text-gray-400')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{cv.version_name || cv.file_name}</p>
                        {cv.is_primary && <span className="badge-sky text-xs flex items-center gap-1"><Star size={10} />أساسي</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(cv.uploaded_at)}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {!cv.is_primary && (
                        <button onClick={() => setPrimary.mutate(cv.id)} className="btn-ghost p-1.5 text-xs" title="تعيين كأساسي">
                          <Star size={14} />
                        </button>
                      )}
                      <button onClick={() => analyzeMut.mutate(cv.id)} disabled={analyzeMut.isPending} className="btn-ghost p-1.5" title="تحليل">
                        <RefreshCw size={14} className={analyzeMut.isPending ? 'animate-spin' : ''} />
                      </button>
                      <button onClick={() => deleteMut.mutate(cv.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600" title="حذف">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {cv.analysis && (
                    <div className="space-y-2 bg-white dark:bg-gray-900 rounded-xl p-3">
                      <AnalysisBit label="المهارات" items={cv.analysis.skills?.slice(0, 5)} color="badge-blue" />
                      <AnalysisBit label="الشهادات" items={cv.analysis.certifications} color="badge-green" />
                      <AnalysisBit label="نقاط القوة" items={cv.analysis.strengths?.slice(0, 3)} color="badge-amber" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analysis tab */}
      {activeTab === 'analysis' && primary?.analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'المهارات التقنية', items: primary.analysis.tech_skills, color: 'badge-blue' as const, iconClass: 'icon-gradient-blue' },
            { title: 'المهارات العامة', items: primary.analysis.skills, color: 'badge-sky' as const, iconClass: 'icon-gradient-teal' },
            { title: 'الشهادات', items: primary.analysis.certifications, color: 'badge-green' as const, iconClass: 'icon-gradient-emerald' },
            { title: 'المشاريع البارزة', items: primary.analysis.projects, color: 'badge-amber' as const, iconClass: 'icon-gradient-amber' },
          ].map(s => s.items?.length ? (
            <div key={s.title} className="card p-5">
              <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
                <div className={`w-6 h-6 rounded-lg ${s.iconClass} flex items-center justify-center`}>
                  <CheckCircle2 size={12} className="text-white" />
                </div>
                {s.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {s.items.map(i => (
                  <span key={i} className={cn(s.color, 'transition-transform hover:scale-105 cursor-default')}>
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ) : null)}

          <div className="card p-5">
            <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg icon-gradient-blue flex items-center justify-center">
                <TrendingUp size={12} className="text-white" />
              </div>
              مقارنة سوق العمل
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{primary.analysis.market_comparison || 'سيتم تحليله عند رفع الـ CV'}</p>
          </div>

          {primary.analysis.improvements?.length ? (
            <div className="card p-5 border-amber-200/60 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5">
              <h3 className="font-bold mb-3 text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <div className="w-6 h-6 rounded-lg icon-gradient-amber flex items-center justify-center">
                  <Lightbulb size={12} className="text-white" />
                </div>
                اقتراحات التحسين
              </h3>
              <ul className="space-y-2">
                {primary.analysis.improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-300">
                    <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
      {activeTab === 'analysis' && !primary?.analysis && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
            <FileText size={28} className="text-gray-300 dark:text-slate-600" />
          </div>
          <p className="text-gray-500 dark:text-slate-400">ارفعي السيرة الذاتية ليتم تحليلها تلقائياً</p>
        </div>
      )}

      {/* Chat tab */}
      {activeTab === 'chat' && (
        <div className="card flex flex-col" style={{ height: '500px' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatHistory.length === 0 && (
              <div className="text-center text-gray-500 mt-8 space-y-3">
                <Bot size={32} className="mx-auto text-primary-400" />
                <p className="font-medium">اسأليني عن الـ CV</p>
                <div className="space-y-2">
                  {['ما أقوى نقاط CV إيمان؟', 'ما المهارات التي تحتاج تطوير؟', 'كيف أقارن بسوق العمل السعودي؟'].map(q => (
                    <button key={q} onClick={() => setChatInput(q)} className="block w-full text-right text-xs bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-3 py-2 rounded-xl transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                  m.role === 'user' ? 'icon-gradient-blue' : 'bg-gray-100 dark:bg-white/[0.08]'
                )}>
                  {m.role === 'user'
                    ? <User size={14} className="text-white" />
                    : <Bot size={14} className="text-sky-500" />}
                </div>
                <div className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-tr-sm'
                    : 'bg-white dark:bg-white/[0.05] border border-gray-100 dark:border-white/[0.08] text-gray-800 dark:text-slate-200 rounded-tl-sm'
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
            {chatLoading && <div className="text-sm text-gray-400 animate-pulse">يكتب...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
            <input className="input text-sm py-2" placeholder="اسأليني عن الـ CV..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChat() }} />
            <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading} className="btn-primary px-3 py-2 shrink-0">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Skill gap tab */}
      {activeTab === 'skills' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><TrendingUp size={18} className="text-primary-500" />تحليل فجوة المهارات مقارنةً بسوق العمل السعودي</h3>
          {skillGap.length === 0 ? (
            <p className="text-gray-500 text-sm">سيظهر التحليل بعد رفع الـ CV</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {skillGap.map((s, i) => (
                <div key={i} className={cn('flex items-start gap-3 p-3 rounded-xl', s.you_have ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10')}>
                  <CheckCircle2 size={16} className={s.you_have ? 'text-green-500 mt-0.5 shrink-0' : 'text-red-400 mt-0.5 shrink-0'} />
                  <div>
                    <p className="text-sm font-medium">{s.skill}</p>
                    <p className="text-xs text-gray-500">{s.demand_level === 'high' ? 'طلب عالٍ جداً' : s.demand_level === 'medium' ? 'طلب متوسط' : 'طلب منخفض'}</p>
                    {s.suggestion && !s.you_have && <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">{s.suggestion}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hints tab */}
      {activeTab === 'hints' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Wand2 size={18} className="text-primary-500" />تلميحات تخصيص الـ CV للوظيفة</h3>
            <div className="flex gap-3">
              <select
                className="input flex-1 text-sm"
                value={hintsJobId}
                onChange={e => { setHintsJobId(e.target.value); setHintsResult(null) }}
              >
                <option value="">اختاري وظيفة...</option>
                {allJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title} — {j.company}</option>
                ))}
              </select>
              <button
                onClick={() => hintsMut.mutate()}
                disabled={!hintsJobId || hintsMut.isPending}
                className="btn-primary px-4"
              >
                {hintsMut.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                تحليل
              </button>
            </div>

            {hintsResult && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">التطابق الحالي</p>
                    <p className="text-2xl font-bold text-amber-500">{hintsResult.score_before}%</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">بعد التطبيق</p>
                    <p className="text-2xl font-bold text-green-500">{hintsResult.score_after}%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {hintsResult.hints.map((hint, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                      <div className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{hint}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hintsResult && !hintsMut.isPending && (
              <div className="text-center py-8 text-gray-500">
                <Wand2 size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">اختاري وظيفة لتحصلي على تلميحات تخصيص الـ CV</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* CV Improve tab */}
      {activeTab === 'improve' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Sparkles size={18} className="text-violet-500" />تحسين السيرة الذاتية بالذكاء الاصطناعي</h3>
              <button onClick={runCVImprove} disabled={improvingCV || !primary} className="btn-primary text-sm px-4">
                {improvingCV ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {improvingCV ? 'جارٍ التحليل...' : 'تحسين الآن'}
              </button>
            </div>
            {!primary && <p className="text-sm text-gray-400 text-center py-4">ارفعي السيرة الذاتية أولاً</p>}
            {improveResult && (
              <div className="space-y-4 animate-fade-in">
                {improveResult.improved_sections.map((s, i) => (
                  <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-2 bg-violet-50 dark:bg-violet-900/20 flex items-center gap-2">
                      <Sparkles size={13} className="text-violet-500" />
                      <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">{s.section}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800">
                      <div className="p-4">
                        <p className="text-xs font-medium text-gray-400 mb-2">الأصلي</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{s.original}</p>
                      </div>
                      <div className="p-4 bg-green-50/50 dark:bg-green-900/10">
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">المُحسَّن</p>
                        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{s.improved}</p>
                        {s.reason && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1">
                            <Lightbulb size={11} className="mt-0.5 shrink-0" />{s.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!improveResult && !improvingCV && primary && (
              <div className="text-center py-8 text-gray-400">
                <Sparkles size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm">اضغطي "تحسين الآن" للحصول على اقتراحات تحسين مفصّلة</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compare tab */}
      {activeTab === 'compare' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><GitCompare size={18} className="text-primary-500" />مقارنة نسخ السيرة الذاتية</h3>
          {cvFiles.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">لا توجد نسخ مرفوعة بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {['النسخة', 'تاريخ الرفع', 'الحالة', 'المهارات', 'الشهادات', 'الملاحظات'].map(h => (
                      <th key={h} className="text-right px-4 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {cvFiles.map(cv => (
                    <tr key={cv.id} className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/50', cv.is_primary && 'bg-primary-50/30 dark:bg-primary-900/10')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className={cv.is_primary ? 'text-primary-500' : 'text-gray-400'} />
                          <span className="font-medium">{cv.version_name || cv.file_name}</span>
                          {cv.is_primary && <span className="badge-sky text-xs">أساسي</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(cv.uploaded_at)}</td>
                      <td className="px-4 py-3">
                        {cv.analysis ? <span className="badge-green">محلَّل</span> : <span className="badge-gray">بدون تحليل</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{cv.analysis?.skills?.slice(0, 3).join(', ') || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{cv.analysis?.certifications?.join(', ') || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{cv.analysis?.improvements?.length ? `${cv.analysis.improvements.length} اقتراح` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AnalysisBit({ label, items, color }: { label: string; items?: string[]; color: string }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(i => <span key={i} className={color}>{i}</span>)}
      </div>
    </div>
  )
}
