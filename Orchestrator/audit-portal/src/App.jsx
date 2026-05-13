import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import LiveIndicator from './components/LiveIndicator'
import useSSE from './hooks/useSSE'
import Overview from './pages/Overview'
import Requests from './pages/Requests'
import RequestDetail from './pages/RequestDetail'

function pageTitle(pathname) {
  if (pathname.startsWith('/requests/')) {
    return 'REQUEST DETAIL'
  }

  if (pathname.startsWith('/requests')) {
    return 'REQUESTS'
  }

  return 'OVERVIEW'
}

function ShellLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const stream = useSSE()

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex min-h-screen bg-[#f5f5f5] text-slate-900">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col bg-[#f5f5f5]">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-[0.72rem] font-bold tracking-[0.34em] text-[#FFD700]">{pageTitle(location.pathname)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span>{dateLabel}</span>
                <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
                <span className="text-slate-400">Internal audit dashboard</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LiveIndicator connected={stream.connected} />
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-full border border-[#1a1a2e] bg-[#1a1a2e] px-5 py-3 font-mono text-[0.72rem] font-bold tracking-[0.28em] text-white shadow-sm transition hover:bg-[#252544]"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <Outlet context={stream} />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route index element={<Overview />} />
        <Route path="requests" element={<Requests />} />
        <Route path="requests/:requestId" element={<RequestDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
