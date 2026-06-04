export type JobStatus = 'pending' | 'approved' | 'rejected' | 'applied'
export type ApplicationStatus = 'sent' | 'reviewing' | 'rejected' | 'interview' | 'offer'
export type ApplicationStage = 'sent' | 'viewed' | 'reply' | 'interview' | 'offer' | 'rejected'
export type EmailDirection = 'outgoing' | 'incoming'
export type EmailStatus = 'sent' | 'delivered' | 'opened' | 'failed'
export type AgentState = 'running' | 'idle' | 'stopped' | 'error'
export type Platform = 'taqat' | 'jadarat' | 'linkedin' | 'bayt' | 'indeed' | 'manual'
export type City = 'madinah' | 'jeddah' | 'riyadh' | 'yanbu' | 'other'
export type Theme = 'light' | 'dark'
export type PrimaryColor = 'sky' | 'blue' | 'green' | 'violet'
export type LetterLanguage = 'ar' | 'en' | 'auto'

export interface Job {
  id: string
  title: string
  company: string
  company_type?: string
  city: City
  description: string
  requirements?: string
  apply_url?: string
  apply_email?: string
  platform: Platform
  match_score: number
  published_at?: string
  discovered_at: string
  status: JobStatus
  is_vision2030?: boolean
  application_id?: string
  notes?: string
  is_priority?: boolean
  is_starred?: boolean
}

export interface Application {
  id: string
  job_id: string
  job: Job
  company_id: string
  status: ApplicationStatus
  stage?: ApplicationStage
  letter_text: string
  letter_language: LetterLanguage
  sent_at?: string
  email_status?: EmailStatus
  success_score?: number
  follow_up_count: number
  next_followup_at?: string
  cv_version_id?: string
  notes?: string
  rejection_reason?: string
  interview_date?: string
}

export interface Email {
  id: string
  company_id: string
  application_id?: string
  direction: EmailDirection
  subject: string
  body: string
  from_email: string
  to_email: string
  status: EmailStatus
  sent_at: string
  opened_at?: string
  thread_id?: string
  ai_summary?: string
}

export interface Company {
  id: string
  name: string
  type?: string
  city?: City
  website?: string
  linkedin_url?: string
  email?: string
  applications_count: number
  last_contact?: string
  notes?: string
}

export interface CVFile {
  id: string
  version_name: string
  language: 'ar' | 'en'
  specialization?: string
  file_url: string
  file_name: string
  uploaded_at: string
  is_primary: boolean
  analysis?: CVAnalysis
}

export interface CVAnalysis {
  skills: string[]
  experience_years: number
  certifications: string[]
  strengths: string[]
  improvements: string[]
  market_comparison?: string
  projects?: string[]
  tech_skills?: string[]
}

export interface LetterTemplate {
  id: string
  name: string
  language: LetterLanguage
  subject: string
  body: string
  is_default: boolean
}

export interface Notification {
  id: string
  type: 'new_job' | 'application_sent' | 'email_received' | 'email_opened' | 'agent_done' | 'limit_reached' | 'followup_ready'
  title: string
  message: string
  created_at: string
  is_read: boolean
  link?: string
  meta?: Record<string, unknown>
}

export interface EventLog {
  id: string
  event_type: string
  description: string
  meta?: Record<string, unknown>
  created_at: string
  status: 'success' | 'error' | 'info'
}

export interface Stats {
  total_applications: number
  sent: number
  reviewing: number
  rejected: number
  interviews: number
  offers: number
  by_city: Record<string, number>
  by_platform: Record<string, number>
  avg_match_score: number
  this_week: number
  today: number
  response_rate: number
}

export interface AgentStatus {
  agent1: {
    state: AgentState
    last_run?: string
    jobs_found_today: number
    next_run?: string
  }
  agent2: {
    state: AgentState
    sent_today: Record<string, number>
    limits: Record<string, number>
  }
}

export interface Settings {
  daily_limits: Record<City, number>
  min_match_score: number
  search_time: string
  platforms: Record<Platform, boolean>
  email_signature: {
    name: string
    title: string
    phone?: string
    linkedin?: string
    email: string
    custom_fields: { label: string; value: string }[]
  }
  followup_template: string
  primary_color: PrimaryColor
  theme: Theme
  sender_email: string
  notification_prefs: {
    new_job: 'site' | 'email' | 'both' | 'none'
    reply_received: 'site' | 'email' | 'both' | 'none'
    application_sent: 'site' | 'email' | 'both' | 'none'
    email_opened: 'site' | 'email' | 'both' | 'none'
    limit_reached: 'site' | 'email' | 'both' | 'none'
  }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface InterviewPrep {
  company: string
  job_title: string
  questions: { question: string; tip: string; focus: string }[]
  company_info: string
  key_points: string[]
  generated_at: string
}

export interface SkillGap {
  skill: string
  demand_level: 'high' | 'medium' | 'low'
  you_have: boolean
  suggestion?: string
}

export interface ABTest {
  id: string
  template_a_id: string
  template_b_id: string
  applications_a: number
  applications_b: number
  responses_a: number
  responses_b: number
  started_at: string
}

export interface Contact {
  id: string
  name: string
  company: string
  email?: string
  phone?: string
  notes?: string
  last_contact?: string
  met_at?: string
  created_at: string
}

export interface SalaryEstimate {
  min: number
  max: number
  currency: string
  reasoning: string
}

export interface CompanyResearch {
  overview: string
  culture: string
  news: string
  tips: string
}

export interface CVHints {
  hints: string[]
  score_before: number
  score_after: number
}

export interface InterviewSimResult {
  feedback: string
  score: number
  better_answer: string
}

export interface WeeklyReport {
  period: string
  jobs_found: number
  applications_sent: number
  responses: number
  interviews: number
  offers: number
  rejected: number
  response_rate: number
  avg_match_score: number
  daily: { date: string; sent: number; found: number }[]
}

export interface DailyGoal {
  target: number
  current: number
  date: string
}
