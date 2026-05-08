export default function LiveIndicator({ connected }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[0.7rem] font-mono tracking-[0.3em] text-emerald-700">
      <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'animate-pulse bg-[#00C853]' : 'bg-slate-400'}`} />
      {connected ? 'LIVE' : 'RECONNECTING'}
    </div>
  )
}
