import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getRecentRequests, getStats } from '../api/client'
import RequestDrawer from '../components/RequestDrawer'
import RequestTable from '../components/RequestTable'
import StatCard from '../components/StatCard'

export default function Overview() {
  const stream = useOutletContext() || { events: [], connected: false }
  const [stats, setStats] = useState({ total_today: 0, total_blocked: 0, total_allowed: 0, fail_safe_blocks: 0, cache_hits: 0, ai_hits: 0 })
  const [requests, setRequests] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function loadOverview() {
      setLoading(true)
      try {
        const [statsPayload, recentPayload] = await Promise.all([getStats(), getRecentRequests(20)])
        if (!alive) {
          return
        }

        setStats(statsPayload)
        setRequests(recentPayload)
      } catch {
        // Keep the UI stable if the backend is temporarily unavailable.
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    }

    loadOverview()

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const latest = stream.events?.[0]
    if (!latest?.request_id) {
      return
    }

    setRequests((current) => [latest, ...current.filter((request) => request.request_id !== latest.request_id)].slice(0, 20))

    getStats()
      .then(setStats)
      .catch(() => {
        // Ignore refresh errors and keep the last known counts.
      })
  }, [stream.events])

  const ratio = stats.ai_hits + stats.cache_hits === 0 ? '0:0' : `${stats.ai_hits}:${stats.cache_hits}`

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-5">
        <StatCard label="TOTAL REQUESTS TODAY" value={stats.total_today} accent="yellow" />
        <StatCard label="TOTAL BLOCKED" value={stats.total_blocked} accent="red" />
        <StatCard label="TOTAL ALLOWED" value={stats.total_allowed} accent="green" />
        <StatCard label="FAIL-SAFE BLOCKS" value={stats.fail_safe_blocks} accent="red" />
        <StatCard label="AI VS CACHE RATIO" value={ratio} accent="teal" note="AI : CACHE" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[0.72rem] font-bold tracking-[0.34em] text-[#FFD700]">LIVE OVERVIEW</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Audit activity for the orchestration layer</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Monitor request decisions as they land, with the latest 20 entries streaming directly from the backend.
          </p>
        </div>

        <div className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 lg:flex">
          {stream.connected ? 'Live feed connected' : 'Waiting for live feed'}
        </div>
      </div>

      <RequestTable
        title="Recent Requests"
        subtitle="Last 20 completed or in-flight requests, refreshed through SSE."
        requests={requests}
        compact
        totalCount={requests.length}
        onRowClick={setSelectedRequest}
      />

      {selectedRequest ? (
        <RequestDrawer request={selectedRequest} open onClose={() => setSelectedRequest(null)} />
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-500 shadow-sm">
          Loading overview…
        </div>
      ) : null}
    </div>
  )
}
