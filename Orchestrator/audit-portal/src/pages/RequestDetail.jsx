import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRequestDetail } from '../api/client'
import RequestDrawer from '../components/RequestDrawer'

export default function RequestDetail() {
  const navigate = useNavigate()
  const { requestId } = useParams()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function loadDetail() {
      setLoading(true)
      setError('')

      try {
        const payload = await getRequestDetail(requestId)
        if (alive) {
          setRequest(payload)
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Failed to load request details')
        }
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    }

    if (requestId) {
      loadDetail()
    }

    return () => {
      alive = false
    }
  }, [requestId])

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 text-sm text-slate-500 shadow-sm">
        Loading request detail…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-sm text-red-700 shadow-sm">
        {error}
      </div>
    )
  }

  return (
    <RequestDrawer
      request={request}
      open
      standalone
      onClose={() => navigate('/requests')}
    />
  )
}
