import { useState, useEffect } from 'react'
import { ExternalLink, Star, Zap, Code2, Palette, Search, Cpu, Globe, BookOpen, Layers, Sparkles, Brain, TrendingUp, Settings2 } from 'lucide-react'

type Skill = {
  name: string
  nameAr: string
  category: string
  level: 1 | 2 | 3 | 4 | 5
  description: string
  icon: React.ElementType
  color: string
  link?: string
  tags: string[]
}

const SKILLS: Skill[] = [
  {
    name: 'Emil Kowalski Design',
    nameAr: 'تصميم بأسلوب Emil',
    category: 'design',
    level: 4,
    description: 'فلسفة تصميم تركّز على التفاصيل غير المرئية — الرسوم المتحركة المضبوطة، تجربة المستخدم الراقية، والانتقالات الطبيعية',
    icon: Sparkles,
    color: 'from-pink-500 to-rose-500',
    link: 'https://animations.dev',
    tags: ['animations', 'UI polish', 'micro-interactions'],
  },
  {
    name: 'Frontend Design',
    nameAr: 'تصميم الواجهات',
    category: 'design',
    level: 4,
    description: 'بناء واجهات مستخدم احترافية باستخدام React، Tailwind، shadcn/ui مع دعم RTL للعربية',
    icon: Palette,
    color: 'from-violet-500 to-purple-500',
    tags: ['React', 'Tailwind', 'RTL', 'shadcn/ui'],
  },
  {
    name: 'Debugging',
    nameAr: 'تصحيح الأخطاء',
    category: 'dev',
    level: 5,
    description: 'تحليل وإصلاح الأخطاء في الـ Frontend والـ Backend، استخدام DevTools بكفاءة عالية',
    icon: Code2,
    color: 'from-orange-500 to-amber-500',
    tags: ['DevTools', 'TypeScript', 'Python', 'logs'],
  },
  {
    name: 'Canvas Design',
    nameAr: 'تصميم الكانفاس',
    category: 'design',
    level: 3,
    description: 'تصميم على Figma وFigJam والـ Canvas-based tools لبناء نماذج أولية احترافية',
    icon: Layers,
    color: 'from-cyan-500 to-blue-500',
    tags: ['Figma', 'FigJam', 'Wireframes'],
  },
  {
    name: 'Theme Factory',
    nameAr: 'مصنع الثيمات',
    category: 'design',
    level: 4,
    description: 'بناء أنظمة تصميم كاملة مع متغيرات CSS، أوضاع داكنة/فاتحة، وألوان ديناميكية',
    icon: Settings2,
    color: 'from-emerald-500 to-teal-500',
    tags: ['CSS Variables', 'Dark Mode', 'Design System'],
  },
  {
    name: 'Web Artifacts',
    nameAr: 'منتجات الويب',
    category: 'ai',
    level: 4,
    description: 'بناء تطبيقات ويب كاملة باستخدام Claude Artifacts — من الفكرة للمنتج في دقائق',
    icon: Globe,
    color: 'from-sky-500 to-blue-500',
    tags: ['Claude', 'Artifacts', 'Rapid Prototyping'],
  },
  {
    name: 'NotebookLM',
    nameAr: 'نوتبوك LM',
    category: 'ai',
    level: 4,
    description: 'استخدام Google NotebookLM لتحليل الوثائق، توليد الملخصات، وإنشاء podcasts من المحتوى',
    icon: BookOpen,
    color: 'from-blue-500 to-indigo-500',
    link: 'https://notebooklm.google.com',
    tags: ['Google AI', 'Documents', 'Research'],
  },
  {
    name: 'Superpowers',
    nameAr: 'القدرات الفائقة',
    category: 'ai',
    level: 5,
    description: 'دمج أدوات الذكاء الاصطناعي المتعددة لإنجاز مهام معقدة بسرعة فائقة',
    icon: Zap,
    color: 'from-yellow-500 to-orange-500',
    tags: ['AI Tools', 'Automation', 'Productivity'],
  },
  {
    name: 'File Search',
    nameAr: 'البحث في الملفات',
    category: 'ai',
    level: 4,
    description: 'استخدام Claude File Search وRAG للبحث الذكي في الوثائق والملفات الكبيرة',
    icon: Search,
    color: 'from-teal-500 to-green-500',
    tags: ['RAG', 'Vector Search', 'Claude API'],
  },
  {
    name: 'Optimization',
    nameAr: 'التحسين والأداء',
    category: 'dev',
    level: 4,
    description: 'تحسين أداء التطبيقات — bundle size، lazy loading، caching، وقياس Core Web Vitals',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-500',
    tags: ['Performance', 'Vite', 'Lighthouse', 'Caching'],
  },
  {
    name: 'Skill Creator',
    nameAr: 'منشئ المهارات',
    category: 'ai',
    level: 4,
    description: 'بناء skills مخصصة لـ Claude Code تضيف قدرات جديدة وتؤتمت المهام المتكررة',
    icon: Brain,
    color: 'from-purple-500 to-violet-500',
    tags: ['Claude Code', 'Skills', 'Automation'],
  },
  {
    name: 'Remotion',
    nameAr: 'ريموشن',
    category: 'dev',
    level: 3,
    description: 'إنشاء فيديوهات احترافية باستخدام React — مثالي للـ explainers والـ demos',
    icon: Cpu,
    color: 'from-red-500 to-pink-500',
    link: 'https://remotion.dev',
    tags: ['React', 'Video', 'Animation'],
  },
  {
    name: 'Claude SEO',
    nameAr: 'سيو بالذكاء',
    category: 'ai',
    level: 4,
    description: 'استخدام Claude لتحليل وتحسين SEO — كتابة المحتوى، الكلمات المفتاحية، والمحتوى التقني',
    icon: Globe,
    color: 'from-indigo-500 to-blue-500',
    tags: ['SEO', 'Content', 'Claude', 'Keywords'],
  },
  {
    name: 'Brand Guideline',
    nameAr: 'دليل الهوية',
    category: 'design',
    level: 3,
    description: 'تصميم وتوثيق هويات بصرية كاملة — الألوان، الخطوط، الـ logo، وقواعد الاستخدام',
    icon: Palette,
    color: 'from-rose-500 to-pink-500',
    tags: ['Branding', 'Identity', 'Style Guide'],
  },
  {
    name: 'Marketing Skills',
    nameAr: 'مهارات التسويق',
    category: 'business',
    level: 4,
    description: 'تسويق رقمي، كتابة محتوى مقنع، تحليل الجمهور، واستراتيجيات النمو',
    icon: TrendingUp,
    color: 'from-amber-500 to-yellow-500',
    tags: ['Digital Marketing', 'Content', 'Growth'],
  },
  {
    name: 'MCP Server',
    nameAr: 'سيرفر MCP',
    category: 'dev',
    level: 3,
    description: 'بناء Model Context Protocol servers لتوسيع قدرات Claude بأدوات مخصصة',
    icon: Cpu,
    color: 'from-slate-500 to-gray-600',
    link: 'https://modelcontextprotocol.io',
    tags: ['MCP', 'Claude', 'Tools', 'API'],
  },
  {
    name: 'Obsidian Skills',
    nameAr: 'أوبسيديان',
    category: 'productivity',
    level: 4,
    description: 'إدارة المعرفة الشخصية باستخدام Obsidian — شبكة الأفكار، PKM، والـ second brain',
    icon: BookOpen,
    color: 'from-purple-600 to-indigo-600',
    link: 'https://obsidian.md',
    tags: ['PKM', 'Note-taking', 'Knowledge Graph'],
  },
]

const CATEGORIES = [
  { id: 'all',          label: 'الكل' },
  { id: 'ai',           label: 'ذكاء اصطناعي' },
  { id: 'design',       label: 'تصميم' },
  { id: 'dev',          label: 'تطوير' },
  { id: 'business',     label: 'أعمال' },
  { id: 'productivity', label: 'إنتاجية' },
]

// Floating bubble positions for constellation
const BUBBLES = [
  { label: 'React', x: '12%',  y: '20%', size: 'text-xs', delay: '0s' },
  { label: 'AI',    x: '75%',  y: '15%', size: 'text-sm', delay: '1s' },
  { label: 'UX',    x: '88%',  y: '55%', size: 'text-xs', delay: '2s' },
  { label: 'PMP',   x: '20%',  y: '70%', size: 'text-xs', delay: '0.5s' },
  { label: 'CSS',   x: '60%',  y: '75%', size: 'text-xs', delay: '1.5s' },
  { label: 'Claude',x: '45%',  y: '25%', size: 'text-xs', delay: '2.5s' },
]

function SkillBar({ level, color }: { level: number; color: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(level * 20), 100)
    return () => clearTimeout(t)
  }, [level])
  return (
    <div className="skill-bar">
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full`}
        style={{ width: `${width}%`, transition: 'width 700ms cubic-bezier(0.23, 1, 0.32, 1)' }}
      />
    </div>
  )
}

function SkillCard({ skill }: { skill: Skill }) {
  const Icon = skill.icon
  return (
    <div className="card-hover p-5 space-y-3 stagger-item relative overflow-hidden">
      {/* Subtle gradient accent top-right */}
      <div
        className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${skill.color} opacity-5 rounded-full -translate-x-8 -translate-y-8 pointer-events-none`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${skill.color} flex items-center justify-center shrink-0 shadow-lg`}>
            <Icon size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">{skill.nameAr}</h3>
              {skill.link && (
                <a href={skill.link} target="_blank" rel="noopener noreferrer"
                  className="text-gray-400 hover:text-sky-500 transition-colors">
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500">{skill.name}</p>
          </div>
        </div>
        {/* Star rating */}
        <div className="flex gap-0.5 shrink-0">
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={12}
              className={i <= skill.level
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700'} />
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{skill.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {skill.tags.map(tag => (
          <span key={tag} className="badge-gray text-[10px] px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <SkillBar level={skill.level} color={skill.color} />
    </div>
  )
}

export default function Skills() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = SKILLS.filter(s => {
    const matchCat = activeCategory === 'all' || s.category === activeCategory
    const matchSearch = !search ||
      s.nameAr.includes(search) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  const totalLevel = Math.round(SKILLS.reduce((a, s) => a + s.level, 0) / SKILLS.length * 20)

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Constellation Hero ── */}
      <div className="hero-banner p-6 md:p-8 text-white relative overflow-hidden" style={{ minHeight: 140 }}>
        {/* Floating skill bubbles */}
        {BUBBLES.map((b, i) => (
          <div
            key={i}
            className="absolute pointer-events-none select-none"
            style={{
              left: b.x, top: b.y,
              animation: `float 6s ease-in-out ${b.delay} infinite`,
            }}
          >
            <div className="bg-white/10 border border-white/20 rounded-full px-2.5 py-1 backdrop-blur-sm">
              <span className={`${b.size} font-bold text-white/80`}>{b.label}</span>
            </div>
          </div>
        ))}

        {/* Content */}
        <div className="relative z-10">
          <p className="text-sky-300/80 text-sm font-medium mb-1">ترسانتي المهنية</p>
          <h1 className="text-2xl md:text-3xl font-black mb-2">مهاراتي وأدواتي</h1>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-2 w-32 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-500"
                  style={{ width: `${totalLevel}%` }}
                />
              </div>
              <span className="text-sm font-bold text-sky-300">{totalLevel}%</span>
            </div>
            <span className="text-white/60 text-sm">{SKILLS.length} مهارة</span>
          </div>
        </div>
      </div>

      {/* ── Category stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
          const catSkills = SKILLS.filter(s => s.category === cat.id)
          const avg = catSkills.length ? Math.round(catSkills.reduce((a, s) => a + s.level, 0) / catSkills.length * 20) : 0
          return (
            <div key={cat.id} className="card p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{cat.label}</p>
              <p className="text-xl font-black gradient-text">{avg}%</p>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{catSkills.length} مهارة</p>
            </div>
          )
        })}
      </div>

      {/* ── Search + Filter toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="input text-sm w-48"
          placeholder="ابحثي عن مهارة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
              <span className="mr-1 opacity-60 text-xs">
                {cat.id === 'all' ? SKILLS.length : SKILLS.filter(s => s.category === cat.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Skills grid ── */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 dark:text-slate-500">لا توجد مهارات مطابقة</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(skill => <SkillCard key={skill.name} skill={skill} />)}
        </div>
      )}
    </div>
  )
}
