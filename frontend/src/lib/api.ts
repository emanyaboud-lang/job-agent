const BASE = '/api'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'حدث خطأ')
  }
  return res.json()
}

const get  = <T>(p: string)                    => req<T>(p)
const post = <T>(p: string, body: unknown)     => req<T>(p, { method: 'POST', body: JSON.stringify(body) })
const put  = <T>(p: string, body: unknown)     => req<T>(p, { method: 'PUT',  body: JSON.stringify(body) })
const del  = <T>(p: string)                    => req<T>(p, { method: 'DELETE' })
const patch= <T>(p: string, body: unknown)     => req<T>(p, { method: 'PATCH', body: JSON.stringify(body) })

// --- Jobs ---
export const jobsApi = {
  list:        (params?: Record<string, string>) => get(`/jobs${params ? '?' + new URLSearchParams(params) : ''}`),
  approve:     (id: string)                      => post(`/jobs/${id}/approve`, {}),
  reject:      (id: string)                      => post(`/jobs/${id}/reject`, {}),
  restore:     (id: string)                      => post(`/jobs/${id}/restore`, {}),
  approveAll:  ()                                => post('/jobs/approve-all', {}),
  addManual:   (data: unknown)                   => post('/jobs/manual', data),
  matchScore:  (id: string)                      => get(`/jobs/${id}/match-score`),
  companyCard: (id: string)                      => get(`/jobs/${id}/company-card`),
}

// --- Applications ---
export const applicationsApi = {
  list:       (params?: Record<string, string>) => get(`/applications${params ? '?' + new URLSearchParams(params) : ''}`),
  get:        (id: string)                      => get(`/applications/${id}`),
  resend:     (id: string)                      => post(`/applications/${id}/resend`, {}),
  updateStatus:(id: string, status: string)     => patch(`/applications/${id}`, { status }),
}

// --- CV ---
export const cvApi = {
  list:       ()                 => get('/cv'),
  upload:     (formData: FormData) => fetch(`${BASE}/cv/upload`, { method: 'POST', body: formData }).then(r => r.json()),
  setPrimary: (id: string)       => post(`/cv/${id}/primary`, {}),
  analyze:    (id: string)       => post(`/cv/${id}/analyze`, {}),
  delete:     (id: string)       => del(`/cv/${id}`),
  chat:       (message: string, history: unknown[]) => post('/cv/chat', { message, history }),
  skillGap:   ()                 => get('/cv/skill-gap'),
  export:     (id: string, format: 'pdf'|'docx') => get(`/cv/${id}/export/${format}`),
}

// --- Emails ---
export const emailsApi = {
  list:    (params?: Record<string, string>) => get(`/emails${params ? '?' + new URLSearchParams(params) : ''}`),
  thread:  (companyId: string)               => get(`/emails/thread/${companyId}`),
  reply:   (id: string, body: string)        => post(`/emails/${id}/reply`, { body }),
  compose: (data: unknown)                   => post('/emails/compose', data),
}

// --- Agents ---
export const agentsApi = {
  status:     ()               => get('/agents/status'),
  search:     ()               => post('/agents/search', {}),
  toggle1:    (active: boolean) => post('/agents/1/toggle', { active }),
  toggle2:    (active: boolean) => post('/agents/2/toggle', { active }),
}

// --- Settings ---
export const settingsApi = {
  get:    ()             => get('/settings'),
  update: (data: unknown) => put('/settings', data),
}

// --- Stats ---
export const statsApi = {
  overview:  ()               => get('/stats/overview'),
  detail:    (key: string)    => get(`/stats/detail/${key}`),
  heatmap:   ()               => get('/stats/heatmap'),
  abTests:   ()               => get('/stats/ab-tests'),
}

// --- Notifications ---
export const notificationsApi = {
  list:     ()        => get('/notifications'),
  markRead: (id: string) => patch(`/notifications/${id}`, { is_read: true }),
  markAll:  ()        => post('/notifications/mark-all-read', {}),
}

// --- Chat AI ---
export const chatApi = {
  send:     (message: string, history: unknown[]) => post('/chat', { message, history }),
  sessions: ()                                    => get('/chat/sessions'),
  clear:    ()                                    => del('/chat/history'),
}

// --- Companies ---
export const companiesApi = {
  list: ()           => get('/companies'),
  get:  (id: string) => get(`/companies/${id}`),
}

// --- Export ---
export const exportApi = {
  excel: () => fetch(`${BASE}/export/excel`).then(r => r.blob()),
  csv:   () => fetch(`${BASE}/export/csv`).then(r => r.blob()),
}

// --- Event Log ---
export const logApi = {
  list: (params?: Record<string, string>) => get(`/log${params ? '?' + new URLSearchParams(params) : ''}`),
}

// --- Interview Prep ---
export const interviewApi = {
  generate: (applicationId: string) => post(`/interview-prep/${applicationId}`, {}),
  get:      (applicationId: string) => get(`/interview-prep/${applicationId}`),
}

export default { jobsApi, applicationsApi, cvApi, emailsApi, agentsApi, settingsApi, statsApi, notificationsApi, chatApi, companiesApi, exportApi, logApi, interviewApi }
