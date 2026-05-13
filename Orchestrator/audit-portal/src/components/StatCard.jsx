const accents = {
  green: '#00C853',
  red: '#FF3D00',
  yellow: '#FFD700',
  teal: '#00BCD4',
}

export default function StatCard({ label, value, accent = 'yellow', note }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="border-l-4 pl-4" style={{ borderLeftColor: accents[accent] || accents.yellow }}>
        <p className="font-mono text-[0.68rem] font-bold tracking-[0.32em] text-slate-500">{label}</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <span className="text-3xl font-semibold tracking-tight text-slate-900">{value}</span>
        </div>
        {note ? <p className="mt-2 text-sm text-slate-500">{note}</p> : null}
      </div>
    </div>
  )
}
