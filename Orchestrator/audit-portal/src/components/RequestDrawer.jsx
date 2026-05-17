import { useMemo, useState } from 'react'

const stateTone = {
  COMPLETED: 'bg-[#00C853]/15 text-[#00A344] border-[#00C853]/30',
  FAILED: 'bg-[#FF3D00]/15 text-[#cc2f00] border-[#FF3D00]/30',
  AI_ANALYSIS: 'bg-[#FFD700]/18 text-[#a07f00] border-[#FFD700]/30',
  CACHE_CHECK: 'bg-[#00BCD4]/15 text-[#0e849a] border-[#00BCD4]/30',
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  const numericValue = Number(value)
  const normalizedValue = Number.isFinite(numericValue) && Math.abs(numericValue) < 1e12 ? numericValue * 1000 : value
  const date = new Date(normalizedValue)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-GB')
}

function formatSeconds(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  return `${Number(value).toFixed(2)}s`
}

function getTone(state) {
  return stateTone[state] || 'bg-slate-100 text-slate-600 border-slate-200'
}

export default function RequestDrawer({ request, open, onClose, standalone = false }) {
  const [errorsOpen, setErrorsOpen] = useState(true)

  const timeline = useMemo(() => {
    const steps = Array.isArray(request?.transition_log) ? request.transition_log : []
    return steps.map((step, index) => {
      const previous = steps[index - 1]
      const delta = previous ? (Number(step?.at) - Number(previous?.at)) : null

      return {
        ...step,
        index,
        delta,
      }
    })
  }, [request])

  if (!open || !request) {
    return null
  }

  const Panel = (
    <div className={`${standalone ? 'relative w-full max-w-5xl' : 'ml-auto h-full w-full max-w-2xl'} flex flex-col bg-white shadow-[0_30px_60px_rgba(15,23,42,0.18)] ${standalone ? 'rounded-3xl border border-slate-200' : 'rounded-l-3xl border-l border-slate-200'}`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <p className="font-mono text-[0.68rem] font-bold tracking-[0.34em] text-[#FFD700]">REQUEST DETAIL</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">{request.request_id || 'Unknown Request'}</h2>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Close
          </button>
        ) : null}
      </div>

      {request.source === 'fail-safe' ? (
        <div className="border-b border-yellow-200 bg-yellow-50 px-6 py-4 text-sm text-yellow-800">
          This request was blocked by fail-safe due to system unavailability.
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Request ID" value={request.request_id} mono />
          <Field label="Student ID" value={request.user_id} mono />
          <Field label="URL" value={request.url} />
          <Field label="Final Decision" value={request.decision ? String(request.decision).toUpperCase() : '—'} tone={String(request.decision || '').toLowerCase() === 'allowed' ? 'allowed' : String(request.decision || '').toLowerCase() === 'blocked' ? 'blocked' : 'neutral'} />
          <Field label="Source" value={request.source || '—'} tone={request.source === 'cache' ? 'cache' : request.source === 'ai' ? 'ai' : request.source === 'fail-safe' ? 'blocked' : 'neutral'} />
          <Field label="AI Used" value={request.ai_used ? 'Yes' : 'No'} />
          <Field label="Retry Count" value={request.retry_count ?? 0} />
          <Field label="Duration" value={formatSeconds(request.duration_seconds)} />
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-mono text-[0.72rem] font-bold tracking-[0.34em] text-slate-500">TIMELINE</h3>
              <p className="mt-2 text-sm text-slate-500">Transition log with relative timing between states.</p>
            </div>
          </div>

          <div className="space-y-4 border-l border-slate-200 pl-5">
            {timeline.length > 0 ? timeline.map((step) => (
              <div key={`${step.to}-${step.at}-${step.index}`} className="relative">
                <span className={`absolute -left-[1.45rem] top-1.5 h-3.5 w-3.5 rounded-full border ${getTone(step.to)} shadow-sm`} />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[0.72rem] font-bold tracking-[0.28em] text-slate-600">{step.to || 'UNKNOWN'}</p>
                      <p className="mt-1 text-sm text-slate-600">{step.from ? `from ${step.from}` : 'request initiated'}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{formatDateTime(step.at)}</div>
                      <div className="mt-1 font-mono uppercase tracking-[0.2em] text-slate-400">
                        {step.delta === null ? 'Start' : formatSeconds(step.delta)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No transition log available.
              </div>
            )}
          </div>
        </div>

        {Array.isArray(request.errors) && request.errors.length > 0 ? (
          <details className="mt-8 rounded-2xl border border-red-200 bg-red-50" open={errorsOpen} onToggle={(event) => setErrorsOpen(event.currentTarget.open)}>
            <summary className="cursor-pointer list-none px-5 py-4 font-mono text-[0.72rem] font-bold tracking-[0.3em] text-red-700">
              ERRORS
            </summary>
            <div className="space-y-3 border-t border-red-200 px-5 py-4">
              {request.errors.map((errorEntry, index) => (
                <div key={`${errorEntry.state}-${index}`} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[0.72rem] font-bold tracking-[0.24em] text-red-600">{errorEntry.state || 'ERROR'}</span>
                    <span className="text-xs text-slate-500">{formatDateTime(errorEntry.at)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{errorEntry.error || 'Unknown error'}</p>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  )

  if (standalone) {
    return Panel
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative flex h-full justify-end">
        {Panel}
      </div>
    </div>
  )
}

function Field({ label, value, mono = false, tone = 'neutral' }) {
  const toneStyles = {
    allowed: 'border-[#00C853]/30 bg-[#00C853]/10 text-[#008b3b]',
    blocked: 'border-[#FF3D00]/30 bg-[#FF3D00]/10 text-[#c72b00]',
    cache: 'border-[#00BCD4]/30 bg-[#00BCD4]/10 text-[#0e849a]',
    ai: 'border-[#FFD700]/35 bg-[#FFD700]/12 text-[#9a7a00]',
    neutral: 'border-slate-200 bg-slate-50 text-slate-800',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="font-mono text-[0.68rem] font-bold tracking-[0.3em] text-slate-500">{label.toUpperCase()}</p>
      <div className={`mt-2 rounded-xl border px-3 py-3 text-sm ${toneStyles[tone]}`}>
        <span className={mono ? 'font-mono break-all text-[0.84rem]' : 'break-words'}>{value || '—'}</span>
      </div>
    </div>
  )
}
