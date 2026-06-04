import { useState } from 'react'
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
  { id: 'all',         label: 'الكل' },
  { id: 'ai',          label: 'ذكاء اصطناعي' },
  { id: 'design',      label: 'تصميم' },
  { id: 'dev',         label: 'تطوير' },
  { id: 'business',    label: 'أعمال' },
  { id: 'productivity',label: 'إنتاجية' },
]

function SkillCard({ skill }: { skill: Skill }) {
  const Icon = skill.icon
  return (
    <div className="card p-5 space-y-3 stagger-item group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${skill.color} flex items-center justify-center shrink-0 shadow-sm`}>
            <Icon size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{skill.nameAr}</h3>
              {skill.link && (
                <a href={skill.link} target="_blank" rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary-500 transition-colors">
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400">{skill.name}</p>
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={12}
              className={i <= skill.level ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'} />
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{skill.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {skill.tags.map(tag => (
          <span key={tag} className="badge-gray text-[10px] px-2 py-0.5">{tag}</span>
        ))}
      </div>
      {/* Skill level bar */}
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${skill.color} rounded-full`}
          style={{ width: `${skill.level * 20}%`, transition: 'width 600ms var(--ease-out)' }} />
      </div>
    </div>
  )
}

export default function Skills() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = SKILLS.filter(s => {
    const matchCat = activeCategory === 'all' || s.category === activeCategory
    const matchSearch = !search || s.nameAr.includes(search) || s.name.toLowerCase().includes(search.toLowerCase()) || s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  const totalLevel = Math.round(SKILLS.reduce((a, s) => a + s.level, 0) / SKILLS.length * 20)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-bold text-xl">مهاراتي وأدواتي</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{SKILLS.length} مهارة • مستوى عام {totalLevel}%</p>
        </div>
        <input
          className="input text-sm w-48"
          placeholder="ابحثي عن مهارة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Overall progress */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">المستوى العام</span>
          <span className="text-sm font-bold text-primary-600">{totalLevel}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
            style={{ width: `${totalLevel}%`, transition: 'width 800ms var(--ease-out)' }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
            const catSkills = SKILLS.filter(s => s.category === cat.id)
            const avg = catSkills.length ? Math.round(catSkills.reduce((a, s) => a + s.level, 0) / catSkills.length * 20) : 0
            return (
              <div key={cat.id} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">{cat.label}</p>
                <p className="text-lg font-bold text-primary-600">{avg}%</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}>
            {cat.label}
            <span className="mr-1 opacity-60">
              {cat.id === 'all' ? SKILLS.length : SKILLS.filter(s => s.category === cat.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Skills grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">لا توجد مهارات مطابقة</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(skill => <SkillCard key={skill.name} skill={skill} />)}
        </div>
      )}
    </div>
  )
}
