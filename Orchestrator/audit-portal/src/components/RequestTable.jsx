const decisionTone = {
  ALLOWED: 'border-[#00C853]/30 bg-[#00C853]/10 text-[#008b3b]',
  BLOCKED: 'border-[#FF3D00]/30 bg-[#FF3D00]/10 text-[#c72b00]',
  PENDING: 'border-slate-200 bg-slate-100 text-slate-600',
}

const sourceTone = {
  cache: 'border-[#00BCD4]/30 bg-[#00BCD4]/10 text-[#0e849a]',
  ai: 'border-[#FFD700]/35 bg-[#FFD700]/12 text-[#9a7a00]',
  'fail-safe': 'border-[#FF3D00]/30 bg-[#FF3D00]/10 text-[#c72b00]',
  'keyword-filter': 'border-slate-200 bg-slate-100 text-slate-600',
  'rate-limit': 'border-slate-200 bg-slate-100 text-slate-600',
}

function truncateId(value) {
  if (!value) {
    return '—'
  }

  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

function toLocalTime(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-GB')
}

function selectDecision(request) {
  return request?.decision ? String(request.decision).toUpperCase() : 'PENDING'
}

export default function RequestTable({
  requests,
  onRowClick,
  showControls = false,
  filters,
  onFiltersChange,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  title = 'Recent Requests',
  subtitle,
  compact = false,
  totalCount,
}) {
  const controlValue = filters || { decision: 'all', source: 'all', search: '' }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[0.72rem] font-bold tracking-[0.34em] text-[#FFD700]">{title.toUpperCase()}</p>
          {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
        </div>

        {showControls ? (
          <div className="grid gap-3 md:grid-cols-3 lg:min-w-[46rem]">
            <SelectField
              label="Decision"
              value={controlValue.decision}
              onChange={(value) => onFiltersChange?.({ ...controlValue, decision: value })}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Allowed', value: 'allowed' },
                { label: 'Blocked', value: 'blocked' },
              ]}
            />
            <SelectField
              label="Source"
              value={controlValue.source}
              onChange={(value) => onFiltersChange?.({ ...controlValue, source: value })}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Cache', value: 'cache' },
                { label: 'AI', value: 'ai' },
                { label: 'Fail-safe', value: 'fail-safe' },
                { label: 'Keyword filter', value: 'keyword-filter' },
              ]}
            />
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[0.65rem] font-bold tracking-[0.28em] text-slate-500">SEARCH</span>
              <input
                value={controlValue.search}
                onChange={(event) => onFiltersChange?.({ ...controlValue, search: event.target.value })}
                placeholder="URL or Student ID"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#00BCD4]"
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <HeaderCell>Request ID</HeaderCell>
              <HeaderCell>Student ID</HeaderCell>
              <HeaderCell>URL</HeaderCell>
              {!compact ? <HeaderCell>Decision</HeaderCell> : null}
              {!compact ? <HeaderCell>Source</HeaderCell> : null}
              <HeaderCell>Timestamp</HeaderCell>
              <HeaderCell className="text-right">Actions</HeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {requests.map((request) => {
              const decision = selectDecision(request)
              const source = request?.source || '—'
              const timestamp = request?.timestamps?.COMPLETED || request?.timestamps?.FAILED || request?.timestamps?.REQUEST_INITIATED

              return (
                <tr
                  key={request.request_id}
                  onClick={() => onRowClick?.(request)}
                  className="cursor-pointer transition-colors hover:bg-[#f5f5f5]"
                >
                  <Cell mono>{truncateId(request.request_id)}</Cell>
                  <Cell mono>{request.user_id || '—'}</Cell>
                  <Cell>
                    <div className="max-w-[32rem] truncate">{request.url || '—'}</div>
                  </Cell>
                  {!compact ? (
                    <Cell>
                      <Badge value={decision} tone={decisionTone[decision] || decisionTone.PENDING} />
                    </Cell>
                  ) : null}
                  {!compact ? (
                    <Cell>
                      <Badge value={source} tone={sourceTone[source] || sourceTone['keyword-filter']} />
                    </Cell>
                  ) : null}
                  <Cell>{toLocalTime(timestamp)}</Cell>
                  <Cell className="text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onRowClick?.(request)
                      }}
                      className="rounded-full border border-[#FF8C00]/25 bg-[#FF8C00]/10 px-3 py-2 text-xs font-semibold tracking-[0.22em] text-[#FF8C00] transition-colors hover:bg-[#FF8C00]/15"
                    >
                      VIEW
                    </button>
                  </Cell>
                </tr>
              )
            })}
            {requests.length === 0 ? (
              <tr>
                <td colSpan={compact ? 5 : 7} className="px-6 py-14 text-center text-sm text-slate-500">
                  No requests matched the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {totalCount ? `${totalCount} records` : 'Paginated results'} · Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <PagerButton label="Prev" disabled={currentPage <= 1} onClick={() => onPageChange?.(currentPage - 1)} />
            <PagerButton label="Next" disabled={currentPage >= totalPages} onClick={() => onPageChange?.(currentPage + 1)} />
          </div>
        </div>
      ) : null}
    </section>
  )
}

function HeaderCell({ children, className = '' }) {
  return <th className={`px-6 py-4 text-left font-mono text-[0.65rem] font-bold tracking-[0.34em] text-slate-500 ${className}`}>{children}</th>
}

function Cell({ children, mono = false, className = '' }) {
  return <td className={`px-6 py-5 text-sm text-slate-700 ${mono ? 'font-mono text-[0.8rem]' : ''} ${className}`}>{children}</td>
}

function Badge({ value, tone }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[0.68rem] font-bold tracking-[0.28em] uppercase ${tone}`}>{value}</span>
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[0.65rem] font-bold tracking-[0.28em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#00BCD4]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function PagerButton({ label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  )
}
