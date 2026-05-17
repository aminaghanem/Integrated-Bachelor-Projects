import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Overview' },
  { to: '/requests', label: 'Requests' },
]

export default function Sidebar() {
  return (
    <aside className="flex min-h-screen w-72 flex-col border-r border-white/10 bg-[#1a1a2e] text-white shadow-[0_0_40px_rgba(0,0,0,0.18)]">
      <div className="border-b border-white/10 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#FFD700]/25 bg-[#FFD700]/10 text-lg text-[#FFD700]">
            ⚙
          </div>
          <div>
            <p className="font-mono text-[0.95rem] font-bold tracking-[0.28em] text-[#FFD700]">
              PLAY &amp; LEARN
            </p>
            <p className="mt-1 font-mono text-[0.7rem] tracking-[0.28em] text-white/45">
              AUDIT PORTAL
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-5">
        <div className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => [
                'flex items-center rounded-2xl border-l-4 px-4 py-3 font-mono text-[0.82rem] tracking-[0.34em] transition-all duration-200',
                isActive
                  ? 'border-l-[#FF8C00] bg-[#FF8C00]/15 text-[#FF8C00]'
                  : 'border-l-transparent text-white/55 hover:bg-white/6 hover:text-white',
              ].join(' ')}
            >
              {item.label.toUpperCase()}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  )
}
