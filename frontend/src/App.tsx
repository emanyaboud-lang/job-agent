import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout       from '@/components/layout/Layout'
import Dashboard    from '@/pages/Dashboard'
import Jobs         from '@/pages/Jobs'
import RejectedJobs from '@/pages/RejectedJobs'
import Applications from '@/pages/Applications'
import Company      from '@/pages/Company'
import CV           from '@/pages/CV'
import Letter       from '@/pages/Letter'
import Emails       from '@/pages/Emails'
import Stats        from '@/pages/Stats'
import Settings     from '@/pages/Settings'
import EventLog     from '@/pages/EventLog'
import Reports      from '@/pages/Reports'
import Contacts     from '@/pages/Contacts'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
      throwOnError: false,
    },
    mutations: { throwOnError: false },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index                 element={<Dashboard />} />
            <Route path="jobs"           element={<Jobs />} />
            <Route path="jobs/rejected"  element={<RejectedJobs />} />
            <Route path="applications"   element={<Applications />} />
            <Route path="company/:id"    element={<Company />} />
            <Route path="cv"             element={<CV />} />
            <Route path="letter"         element={<Letter />} />
            <Route path="emails"         element={<Emails />} />
            <Route path="stats"          element={<Stats />} />
            <Route path="settings"       element={<Settings />} />
            <Route path="log"            element={<EventLog />} />
            <Route path="reports"        element={<Reports />} />
            <Route path="contacts"       element={<Contacts />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
