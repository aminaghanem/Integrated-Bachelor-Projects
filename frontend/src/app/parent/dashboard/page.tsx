"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const API = "http://localhost:4000"

interface SchoolClass {
  class_name: string
  school_name: string
  grade_level: number
}

interface Proficiency {
  category: string
  level: string
}

interface InterestScore {
  category: string
  score: number
}

interface Accessibility {
  has_accessibility_needs: boolean
  sensory_limitations: string[]
  neurodiversity_flags: string[]
}

interface Child {
  grade_level: string
  _id: string
  username: string
  full_name: string
  date_of_birth: string
  preferred_language: string
  class_id: SchoolClass | null
  proficiency_levels: Proficiency[]
  accessibility: Accessibility
  interests: { interest_scores: InterestScore[] }
}

interface Parent {
  _id: string
  username: string
  email: string
  relationship_type: string
  children_ids: Child[]
}

interface Activity {
  _id: string
  url: string
  category: string
  interaction_type: string
  visit_duration: number
  timestamp: string
}

const calcAge = (dob: string): number => {
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const formatDuration = (secs: number): string => {
  if (!secs) return "—"
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

const formatTime = (ts: string): string => {
  const d = new Date(ts)
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const categoryColor: Record<string, { bg: string; text: string }> = {
  Math:           { bg: "rgba(91,141,238,0.15)", text: "#5b8dee" },
  Algebra:        { bg: "rgba(91,141,238,0.15)", text: "#5b8dee" },
  Geometry:       { bg: "rgba(91,141,238,0.15)", text: "#5b8dee" },
  Science:        { bg: "rgba(0,255,136,0.12)", text: "#00ff88" },
  Biology:        { bg: "rgba(0,255,136,0.12)", text: "#00ff88" },
  Chemistry:      { bg: "rgba(0,255,136,0.12)", text: "#00ff88" },
  Physics:        { bg: "rgba(0,255,136,0.12)", text: "#00ff88" },
  Entertainment:  { bg: "rgba(255,230,0,0.12)", text: "#ffe600" },
  Games:          { bg: "rgba(255,80,80,0.12)", text: "#ff5050" },
  Social:         { bg: "rgba(203,108,230,0.15)", text: "#cb6ce6" },
  Sports:         { bg: "rgba(255,165,0,0.12)", text: "#ffa500" },
  General:        { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.5)" },
}

const getCatColor = (cat: string) =>
  categoryColor[cat] ?? { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.5)" }

const interactionIcon: Record<string, string> = {
  view: "👁",
  scroll: "↕",
  click: "🖱",
}

// ── Shared retro button style ──────────────────────────────────
const mcBtn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 3,
  padding: "8px 14px",
  borderRadius: 8,
  border: "2px solid #3d2c1e",
  background: "#2a1a42",
  color: "#e8e8f0",
  cursor: "pointer",
  fontFamily: "'Share Tech Mono', monospace",
  fontSize: 9,
  letterSpacing: "0.1em",
  boxShadow: "2px 2px 0 #3d2c1e",
  transition: "all 0.15s",
}

// ── Inline global styles injected once ────────────────────────
const PARENT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@400;600;700&display=swap');

  .pd-nav-btn:hover {
    background: rgba(255,230,0,0.12) !important;
    border-color: #ffe600 !important;
    color: #ffe600 !important;
    transform: translateY(-1px);
    box-shadow: 2px 4px 0 #3d2c1e !important;
  }
  .pd-child-btn:hover {
    background: rgba(203,108,230,0.15) !important;
    border-color: rgba(203,108,230,0.4) !important;
  }
  .pd-tab:hover {
    color: #ffe600 !important;
  }
  .pd-row:hover {
    background: rgba(255,255,255,0.03) !important;
  }
  .pd-filter-btn:hover {
    border-color: #ffe600 !important;
    color: #ffe600 !important;
  }
  .pd-stat-card:hover {
    border-color: rgba(255,230,0,0.3) !important;
    box-shadow: 0 0 16px rgba(255,230,0,0.08) !important;
  }
  @keyframes pd-spinner {
    to { transform: rotate(360deg); }
  }
  @keyframes pd-fadein {
    from { opacity:0; transform:translateY(6px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes pd-hud-glow {
    0%,100% { text-shadow: 0 0 8px rgba(255,230,0,0.4); }
    50%      { text-shadow: 0 0 20px rgba(255,230,0,0.8), 0 0 40px rgba(255,230,0,0.3); }
  }
  @keyframes pd-blink {
    0%,100% { opacity:1; }
    50%      { opacity:0.3; }
  }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
  ::-webkit-scrollbar-thumb { background: rgba(203,108,230,0.3); border-radius: 3px; }
`

export default function ParentDashboard() {
  const [parent, setParent] = useState<Parent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"activity" | "profile">("activity")
  const [filterCat, setFilterCat] = useState("All")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()

  // Inject styles
  useEffect(() => {
    const el = document.createElement("style")
    el.textContent = PARENT_STYLES
    document.head.appendChild(el)
    return () => { document.head.removeChild(el) }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }
    fetch(`${API}/api/parents/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then((data) => setParent(data))
      .catch((err) => setError(err.message))
  }, [])

  const handleSelectChild = async (child: Child) => {
    setSelectedChild(child)
    setActiveTab("activity")
    setFilterCat("All")
    setActivityLoading(true)
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${API}/api/parents/children/${child._id}/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setActivity(Array.isArray(data) ? data : [])
    } catch { setActivity([]) }
    setActivityLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/")
  }

  // ── Loading / error states ──────────────────────────────────
  if (error) return (
    <div style={{ background: "#1a0e2e", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff4444", fontFamily: "'Orbitron', monospace" }}>
      SYSTEM ERROR: {error}
    </div>
  )
  if (!parent) return (
    <div style={{ background: "#1a0e2e", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #ffe600", borderTopColor: "transparent", borderRadius: "50%", animation: "pd-spinner 0.8s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ fontFamily: "'Orbitron', monospace", color: "#ffe600", fontSize: 13, letterSpacing: "0.15em" }}>INITIALIZING…</div>
      </div>
    </div>
  )

  const children = parent.children_ids ?? []
  const totalTime = activity.reduce((sum, a) => sum + (a.visit_duration ?? 0), 0)
  const categories = [...new Set(activity.map((a) => a.category))]
  const filteredActivity = filterCat === "All" ? activity : activity.filter((a) => a.category === filterCat)
  const catCounts = activity.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1; return acc
  }, {})
  const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // ── Section card wrapper ────────────────────────────────────
  const SectionCard = ({ children: c, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: "1rem 1.25rem",
      ...style,
    }}>{c}</div>
  )

  const SectionTitle = ({ label }: { label: string }) => (
    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "rgba(255,230,0,0.7)", letterSpacing: "0.15em", marginBottom: 14 }}>
      {label}
    </div>
  )

  return (
    <div style={{
      minHeight: "100vh",
      background: "#7a59af",
      color: "#e8e8f0",
      fontFamily: "'Exo 2', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Grid bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `linear-gradient(rgba(203,108,230,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(203,108,230,0.06) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(203,108,230,0.12) 0%, transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", minHeight: "100vh" }}>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside style={{
          width: sidebarOpen ? 280 : 72,
          minHeight: "100vh",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(10,10,26,0.6)",
          backdropFilter: "blur(12px)",
          padding: sidebarOpen ? "1.5rem 1rem" : "1.5rem 0.5rem",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.25s ease",
          overflow: "hidden",
        }}>
          {/* Sidebar toggle */}
          <button onClick={() => setSidebarOpen(o => !o)} style={{ ...mcBtn, marginBottom: 20, width: "100%", flexDirection: "row", justifyContent: "center", fontSize: 14 }} className="pd-nav-btn">
            {sidebarOpen ? "◀" : "▶"}
          </button>

          {sidebarOpen && (
            <>
              {/* Parent info */}
              <div style={{ marginBottom: "1.25rem", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "rgba(255,230,0,0.6)", letterSpacing: "0.12em", marginBottom: 6 }}>COMMANDER</div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13, fontFamily: "'Share Tech Mono', monospace", color: "#e8e8f0" }}>{parent.username.toUpperCase()}</p>
                <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "'Share Tech Mono', monospace", textTransform: "capitalize" }}>
                  {parent.relationship_type} · {parent.email}
                </p>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "0 0 1rem" }} />

              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "rgba(255,230,0,0.5)", letterSpacing: "0.12em", marginBottom: 10 }}>
                LINKED STUDENTS
              </div>

              {children.length === 0 && (
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>No children linked yet.</p>
              )}

              {children.map((child) => {
                const isActive = selectedChild?._id === child._id
                const initials = (child.full_name || child.username).charAt(0).toUpperCase()
                return (
                  <button key={child._id} onClick={() => handleSelectChild(child)} className="pd-child-btn" style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    textAlign: "left", padding: "10px 12px", marginBottom: 4,
                    cursor: "pointer", borderRadius: 10,
                    border: isActive ? "1px solid rgba(203,108,230,0.5)" : "1px solid rgba(255,255,255,0.06)",
                    background: isActive ? "rgba(203,108,230,0.15)" : "rgba(255,255,255,0.02)",
                    color: isActive ? "#e8e8f0" : "rgba(255,255,255,0.6)",
                    transition: "all 0.2s",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: isActive ? "rgba(203,108,230,0.3)" : "rgba(255,255,255,0.06)",
                      border: isActive ? "1px solid rgba(203,108,230,0.6)" : "1px solid rgba(255,255,255,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 14,
                      color: isActive ? "#cb6ce6" : "rgba(255,255,255,0.4)",
                      fontFamily: "'Orbitron', monospace",
                    }}>{initials}</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: isActive ? 600 : 400, fontSize: 13, fontFamily: "'Exo 2', sans-serif" }}>
                        {child.full_name || child.username}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: isActive ? "rgba(203,108,230,0.8)" : "rgba(255,255,255,0.25)", fontFamily: "'Share Tech Mono', monospace" }}>
                        {child.class_id ? `${child.class_id.class_name} · ${child.class_id.school_name}` : `GRADE ${child.grade_level ?? "—"}`}
                      </p>
                    </div>
                  </button>
                )
              })}

              <div style={{ flex: 1 }} />
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "1rem 0" }} />
              <button onClick={handleLogout} className="pd-nav-btn" style={{ ...mcBtn, width: "100%", flexDirection: "row", justifyContent: "center", gap: 8, padding: "10px 14px" }}>
                <span style={{ fontSize: 14 }}>⏻</span>
                <span>LOGOUT</span>
              </button>
            </>
          )}

          {!sidebarOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              {children.map((child) => {
                const isActive = selectedChild?._id === child._id
                const initials = (child.full_name || child.username).charAt(0).toUpperCase()
                return (
                  <button key={child._id} onClick={() => handleSelectChild(child)} title={child.full_name || child.username} style={{
                    width: 40, height: 40, borderRadius: 8, border: isActive ? "1px solid rgba(203,108,230,0.6)" : "1px solid rgba(255,255,255,0.1)",
                    background: isActive ? "rgba(203,108,230,0.3)" : "rgba(255,255,255,0.04)",
                    color: isActive ? "#cb6ce6" : "rgba(255,255,255,0.4)",
                    cursor: "pointer", fontWeight: 700, fontSize: 13,
                    fontFamily: "'Orbitron', monospace",
                  }}>{initials}</button>
                )
              })}
              <div style={{ flex: 1 }} />
              <button onClick={handleLogout} title="Logout" style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14 }} className="pd-nav-btn">⏻</button>
            </div>
          )}
        </aside>

        {/* ── Main ────────────────────────────────────────────── */}
        <main style={{ flex: 1, padding: "20px 28px", overflowY: "auto", maxWidth: 1100 }}>

          {/* Header */}
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,230,0,0.1)", border: "1px solid rgba(255,230,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🛸</div> */}
              <div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontWeight: 900, fontSize: 22, color: "#ffe600", letterSpacing: "0.1em" }}>
                  PARENTAL DASHBOARD
                </div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", marginTop: 4 }}>
                  PARENT USERNAME · <span style={{ color: "#cb6ce6" }}>{parent.username.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "HOME",   icon: "⌂",  action: () => setSelectedChild(null) },
                { label: "LOGOUT", icon: "⏻",  action: handleLogout },
              ].map(btn => (
                <button key={btn.label} className="pd-nav-btn" onClick={btn.action} style={{ ...mcBtn }}>
                  <span style={{ fontSize: 16 }}>{btn.icon}</span>
                  {btn.label}
                </button>
              ))}
            </div>
          </header>

          {/* Empty state */}
          {!selectedChild ? (
            <div style={{ textAlign: "center", marginTop: "6rem", animation: "pd-fadein 0.3s ease" }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", lineHeight: 2 }}>
                SELECT A STUDENT<br />FROM THE SIDEBAR
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 12, letterSpacing: "0.08em" }}>
                {children.length} STUDENT{children.length !== 1 ? "S" : ""} LINKED TO YOUR ACCOUNT
              </div>
            </div>
          ) : (
            <div style={{ animation: "pd-fadein 0.2s ease" }}>

              {/* Child header */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: "rgba(203,108,230,0.2)", border: "1px solid rgba(203,108,230,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, color: "#cb6ce6", fontFamily: "'Orbitron', monospace" }}>
                  {(selectedChild.full_name || selectedChild.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Exo 2', sans-serif", color: "#e8e8f0" }}>
                    {selectedChild.full_name || selectedChild.username}
                  </h1>
                  <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em" }}>
                    AGE {calcAge(selectedChild.date_of_birth)}
                    {selectedChild.class_id && ` · ${selectedChild.class_id.class_name}, ${selectedChild.class_id.school_name}`}
                  </p>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 6px #00ff88" }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(0,255,136,0.7)", letterSpacing: "0.08em" }}>ACTIVE STUDENT</span>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 0 }}>
                {(["activity", "profile"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className="pd-tab" style={{
                    padding: "8px 24px 12px",
                    cursor: "pointer", border: "none", background: "none",
                    fontFamily: "'Orbitron', monospace", fontSize: 9,
                    letterSpacing: "0.12em",
                    color: activeTab === tab ? "#ffe600" : "rgba(255,255,255,0.3)",
                    borderBottom: activeTab === tab ? "2px solid #ffe600" : "2px solid transparent",
                    transition: "all 0.2s",
                    textTransform: "uppercase",
                  }}>{tab}</button>
                ))}
              </div>

              {/* ── Activity Tab ─────────────────────────────── */}
              {activeTab === "activity" && (
                <div>
                  {/* Stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                    {[
                      { label: "TOTAL VISITS",  value: activity.length,           icon: "" },
                      { label: "TIME ON TASK",  value: formatDuration(totalTime),  icon: "⏱" },
                      { label: "CATEGORIES",    value: categories.length,          icon: "" },
                    ].map((stat) => (
                      <div key={stat.label} className="pd-stat-card" style={{
                        background: "rgba(255,255,255,0.02)", borderRadius: 12,
                        padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)",
                        transition: "all 0.2s",
                      }}>
                        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "rgba(255,230,0,0.5)", letterSpacing: "0.12em", marginBottom: 8 }}>{stat.label}</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{stat.icon}</span>
                          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 700, color: "#e8e8f0" }}>{stat.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Top categories */}
                  {topCats.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "rgba(255,230,0,0.5)", letterSpacing: "0.12em", marginBottom: 10 }}>TOP CATEGORIES</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {topCats.map(([cat, count]) => (
                          <span key={cat} style={{
                            padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                            fontFamily: "'Share Tech Mono', monospace",
                            background: getCatColor(cat).bg, color: getCatColor(cat).text,
                            border: `1px solid ${getCatColor(cat).text}44`,
                          }}>
                            {cat} ({count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category filter */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                    {["All", ...categories].map((cat) => (
                      <button key={cat} onClick={() => setFilterCat(cat)} className="pd-filter-btn" style={{
                        padding: "4px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                        border: filterCat === cat ? "1px solid #ffe600" : "1px solid rgba(255,255,255,0.12)",
                        background: filterCat === cat ? "rgba(255,230,0,0.12)" : "transparent",
                        color: filterCat === cat ? "#ffe600" : "rgba(255,255,255,0.4)",
                        fontWeight: filterCat === cat ? 600 : 400,
                        fontFamily: "'Share Tech Mono', monospace",
                        transition: "all 0.15s",
                      }}>{cat}</button>
                    ))}
                  </div>

                  {/* Activity table */}
                  {activityLoading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", fontFamily: "'Share Tech Mono', monospace", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                      <div style={{ width: 16, height: 16, border: "2px solid #ffe600", borderTopColor: "transparent", borderRadius: "50%", animation: "pd-spinner 0.7s linear infinite" }} />
                      LOADING ACTIVITY LOG…
                    </div>
                  ) : filteredActivity.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: "'Share Tech Mono', monospace", color: "rgba(255,255,255,0.2)", fontSize: 12, letterSpacing: "0.08em" }}>
                      NO ACTIVITY RECORDED YET
                    </div>
                  ) : (
                    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            {["URL", "CATEGORY", "TYPE", "DURATION", "TIME"].map((h) => (
                              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: "'Orbitron', monospace", fontWeight: 600, color: "rgba(255,230,0,0.5)", fontSize: 9, letterSpacing: "0.1em" }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredActivity.map((item, i) => (
                            <tr key={item._id} className="pd-row" style={{ borderBottom: i < filteredActivity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.15s" }}>
                              <td style={{ padding: "10px 14px", maxWidth: 280 }}>
                                <a href={item.url} target="_blank" rel="noreferrer" style={{
                                  color: "#5b8dee", fontSize: 12, fontFamily: "'Share Tech Mono', monospace",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  display: "block", maxWidth: 260, textDecoration: "none",
                                }}>{item.url}</a>
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: "'Share Tech Mono', monospace", background: getCatColor(item.category).bg, color: getCatColor(item.category).text, border: `1px solid ${getCatColor(item.category).text}33` }}>
                                  {item.category}
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>
                                {interactionIcon[item.interaction_type] ?? ""} {item.interaction_type}
                              </td>
                              <td style={{ padding: "10px 14px", fontFamily: "'Orbitron', monospace", fontSize: 11, color: "#e8e8f0" }}>
                                {formatDuration(item.visit_duration)}
                              </td>
                              <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.25)", fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}>
                                {formatTime(item.timestamp)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Profile Tab ──────────────────────────────── */}
              {activeTab === "profile" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                  {/* Basic info */}
                  <SectionCard>
                    <SectionTitle label="BASIC INFO" />
                    {([
                      ["Full Name",  selectedChild.full_name || "—"],
                      ["Username",   selectedChild.username],
                      ["Age",        String(calcAge(selectedChild.date_of_birth))],
                      ["Grade",      String(selectedChild.class_id?.grade_level ?? "—")],
                      ["Language",   selectedChild.preferred_language || "—"],
                      ["School",     selectedChild.class_id?.school_name ?? "—"],
                      ["Class",      selectedChild.class_id?.class_name ?? "—"],
                    ] as [string, string][]).map(([label, val]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em" }}>{label}</span>
                        <span style={{ fontWeight: 600, fontSize: 12, color: "#e8e8f0", fontFamily: "'Exo 2', sans-serif" }}>{val}</span>
                      </div>
                    ))}
                  </SectionCard>

                  {/* Proficiency */}
                  <SectionCard>
                    <SectionTitle label="SUBJECT PROFICIENCY" />
                    {selectedChild.proficiency_levels?.length > 0 ? (
                      selectedChild.proficiency_levels.map((p) => (
                        <div key={p.category} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ color: "#e8e8f0", fontSize: 12, fontFamily: "'Exo 2', sans-serif" }}>{p.category}</span>
                          <span style={{
                            padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600,
                            fontFamily: "'Share Tech Mono', monospace",
                            background: p.level === "expert" ? "rgba(0,255,136,0.12)" : p.level === "advanced" ? "rgba(255,230,0,0.12)" : "rgba(91,141,238,0.15)",
                            color: p.level === "expert" ? "#00ff88" : p.level === "advanced" ? "#ffe600" : "#5b8dee",
                            border: `1px solid ${p.level === "expert" ? "#00ff8833" : p.level === "advanced" ? "#ffe60033" : "#5b8dee33"}`,
                          }}>{p.level}</span>
                        </div>
                      ))
                    ) : <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>NO PROFICIENCY DATA YET.</p>}
                  </SectionCard>

                  {/* Interests */}
                  <SectionCard>
                    <SectionTitle label="INTEREST SCORES" />
                    {selectedChild.interests?.interest_scores?.length > 0 ? (
                      [...selectedChild.interests.interest_scores]
                        .sort((a, b) => b.score - a.score)
                        .map((item) => (
                          <div key={item.category} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 12, color: "#e8e8f0", fontFamily: "'Exo 2', sans-serif" }}>{item.category}</span>
                              <span style={{ fontSize: 11, color: "rgba(255,230,0,0.6)", fontFamily: "'Orbitron', monospace" }}>{item.score}</span>
                            </div>
                            <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                              <div style={{ height: 5, borderRadius: 3, background: "linear-gradient(90deg, #cb6ce6, #5b8dee)", width: `${Math.min(item.score, 100)}%`, transition: "width 0.5s ease", boxShadow: "0 0 6px rgba(203,108,230,0.4)" }} />
                            </div>
                          </div>
                        ))
                    ) : <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>NO INTEREST DATA YET.</p>}
                  </SectionCard>

                  {/* Accessibility */}
                  <SectionCard>
                    <SectionTitle label="ACCESSIBILITY" />
                    {selectedChild.accessibility?.has_accessibility_needs ? (
                      <div>
                        {selectedChild.accessibility.sensory_limitations?.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginBottom: 8 }}>SENSORY</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {selectedChild.accessibility.sensory_limitations.map((s) => (
                                <span key={s} style={{ padding: "2px 10px", borderRadius: 20, background: "rgba(255,230,0,0.1)", color: "#ffe600", fontSize: 10, fontFamily: "'Share Tech Mono', monospace", border: "1px solid rgba(255,230,0,0.25)" }}>{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedChild.accessibility.neurodiversity_flags?.length > 0 && (
                          <div>
                            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginBottom: 8 }}>NEURODIVERSITY</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {selectedChild.accessibility.neurodiversity_flags.map((n) => (
                                <span key={n} style={{ padding: "2px 10px", borderRadius: 20, background: "rgba(203,108,230,0.12)", color: "#cb6ce6", fontSize: 10, fontFamily: "'Share Tech Mono', monospace", border: "1px solid rgba(203,108,230,0.3)" }}>{n}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>NO ACCESSIBILITY NEEDS RECORDED.</p>
                    )}
                  </SectionCard>

                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}