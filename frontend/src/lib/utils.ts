import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { City, Platform, ApplicationStatus, JobStatus, PrimaryColor } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const cityLabels: Record<City, string> = {
  madinah: 'المدينة المنورة',
  jeddah:  'جدة',
  riyadh:  'الرياض',
  yanbu:   'ينبع',
  other:   'أخرى',
}

export const platformLabels: Record<Platform, string> = {
  taqat:   'طاقات',
  jadarat: 'جدارات',
  linkedin:'LinkedIn',
  bayt:    'Bayt.com',
  indeed:  'Indeed',
  manual:  'يدوي',
}

export const platformColors: Record<Platform, string> = {
  taqat:   'badge-green',
  jadarat: 'badge-blue',
  linkedin:'badge-sky',
  bayt:    'badge-amber',
  indeed:  'badge-purple',
  manual:  'badge-gray',
}

export const statusLabels: Record<ApplicationStatus, string> = {
  sent:       'مرسلة',
  reviewing:  'قيد المراجعة',
  rejected:   'مرفوضة',
  interview:  'مقابلة',
  offer:      'عرض وظيفي',
}

export const statusColors: Record<ApplicationStatus, string> = {
  sent:       'badge-blue',
  reviewing:  'badge-amber',
  rejected:   'badge-red',
  interview:  'badge-green',
  offer:      'badge-sky',
}

export const jobStatusLabels: Record<JobStatus, string> = {
  pending:  'في الانتظار',
  approved: 'معتمدة',
  rejected: 'مرفوضة',
  applied:  'تم التقديم',
}

export const cityOrder: City[] = ['madinah', 'jeddah', 'riyadh', 'yanbu', 'other']

export function matchScoreColor(score: number): string {
  if (score >= 85) return 'text-green-600 dark:text-green-400'
  if (score >= 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function matchScoreBg(score: number): string {
  if (score >= 85) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
  if (score >= 70) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(dateStr?: string): string {
  if (!dateStr) return '—'
  const now = new Date()
  const then = new Date(dateStr)
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (diff < 60)   return 'الآن'
  if (diff < 3600) return `منذ ${Math.floor(diff/60)} دقيقة`
  if (diff < 86400)return `منذ ${Math.floor(diff/3600)} ساعة`
  if (diff < 604800)return `منذ ${Math.floor(diff/86400)} يوم`
  return formatDate(dateStr)
}

export function applyPrimaryColor(color: PrimaryColor) {
  const palettes: Record<PrimaryColor, Record<string, string>> = {
    sky:    { '50':'240 249 255','100':'224 242 254','200':'186 230 253','300':'125 211 252','400':'56 189 248','500':'14 165 233','600':'2 132 199','700':'3 105 161','800':'7 89 133','900':'12 74 110' },
    blue:   { '50':'239 246 255','100':'219 234 254','200':'191 219 254','300':'147 197 253','400':'96 165 250','500':'59 130 246','600':'37 99 235','700':'29 78 216','800':'30 64 175','900':'30 58 138' },
    green:  { '50':'240 253 244','100':'220 252 231','200':'187 247 208','300':'134 239 172','400':'74 222 128','500':'34 197 94','600':'22 163 74','700':'21 128 61','800':'22 101 52','900':'20 83 45' },
    violet: { '50':'245 243 255','100':'237 233 254','200':'221 214 254','300':'196 181 253','400':'167 139 250','500':'139 92 246','600':'124 58 237','700':'109 40 217','800':'91 33 182','900':'76 29 149' },
  }
  const p = palettes[color]
  Object.entries(p).forEach(([k, v]) => {
    document.documentElement.style.setProperty(`--color-primary-${k}`, v)
  })
}
