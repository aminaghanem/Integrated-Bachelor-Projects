import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getRecentRequests } from '../api/client'
import RequestDrawer from '../components/RequestDrawer'
import RequestTable from '../components/RequestTable'

const PAGE_SIZE = 12

export default function Requests() {
  const stream = useOutletContext() || { events: [], connected: false }
  const [requests, setRequests] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ decision: 'all', source: 'all', search: '' })

  useEffect(() => {
    let alive = true

    async function loadRequests() {
      setLoading(true)
      try {
        const payload = await getRecentRequests(500)
        if (alive) {
          setRequests(payload)
        }
      } catch {
        // Keep the existing list if the API is temporarily unavailable.
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    }

    loadRequests()

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const latest = stream.events?.[0]
    if (!latest?.request_id) {
      return
    }

    setRequests((current) => [latest, ...current.filter((request) => request.request_id !== latest.request_id)])
  }, [stream.events])

  const filteredRequests = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase()

    return requests.filter((request) => {
      const decision = (request.decision || '').toLowerCase()
      const source = (request.source || '').toLowerCase()
      const url = (request.url || '').toLowerCase()
      const studentId = (request.user_id || '').toLowerCase()

      if (filters.decision !== 'all' && decision !== filters.decision) {
        return false
      }

      if (filters.source !== 'all' && source !== filters.source) {
        return false
      }

      if (searchTerm && !url.includes(searchTerm) && !studentId.includes(searchTerm)) {
        return false
      }

      return true
    })
  }, [filters, requests])

  useEffect(() => {
    setPage(1)
  }, [filters.decision, filters.source, filters.search])

  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRequests = filteredRequests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[0.72rem] font-bold tracking-[0.34em] text-[#FFD700]">REQUESTS</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Full request log</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Filter by decision, source, or URL/student ID to review the orchestration trail in detail.
        </p>
      </div>

      <RequestTable
        title="All Requests"
        subtitle="Click any row to open the request drawer with the full timeline and error log."
        requests={pageRequests}
        showControls
        filters={filters}
        onFiltersChange={setFilters}
        currentPage={safePage}
        totalPages={pageCount}
        totalCount={filteredRequests.length}
        onPageChange={setPage}
        onRowClick={setSelectedRequest}
      />

      {selectedRequest ? (
        <RequestDrawer request={selectedRequest} open onClose={() => setSelectedRequest(null)} />
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-500 shadow-sm">
          Loading requests…
        </div>
      ) : null}
    </div>
  )
}
