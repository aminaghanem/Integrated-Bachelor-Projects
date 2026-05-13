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

// ── Design tokens (matching admin portal) ──────────────────────
const T = {
  bg:           "#0d1117",
  sidebar:      "#0f1520",
  surface:      "#ffffff",
  surfaceMuted: "#f4f6f9",
  border:       "#e2e8f0",
  borderDark:   "rgba(255,255,255,0.07)",
  accent:       "#c8a84b",
  accentDim:    "rgba(200,168,75,0.15)",
  text:         "#1a202c",
  textMuted:    "#64748b",
  textSidebar:  "rgba(255,255,255,0.55)",
  red:          "#ef4444",
  green:        "#22c55e",
  blue:         "#3b82f6",
  purple:       "#8b5cf6",
  orange:       "#f97316",
  yellow:       "#eab308",
  fontMono:     "'Share Tech Mono', monospace",
  fontSans:     "'Inter', 'Segoe UI', sans-serif",
}

const categoryColor: Record<string, string> = {
  Math:          T.blue,
  Algebra:       T.blue,
  Geometry:      T.blue,
  Science:       T.green,
  Biology:       T.green,
  Chemistry:     T.green,
  Physics:       T.green,
  Entertainment: T.yellow,
  Games:         T.red,
  Social:        T.purple,
  Sports:        T.orange,
  General:       T.textMuted,
}
const getCatColor = (cat: string) => categoryColor[cat] ?? T.textMuted

const interactionIcon: Record<string, string> = {
  view: "👁",
  scroll: "↕",
  click: "🖱",
}

// ── Inline global styles ────────────────────────────────────────
const PARENT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Inter:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(200,168,75,0.25); border-radius: 4px; }

  .pd-nav-btn:hover {
    background: rgba(255,255,255,0.06) !important;
    color: rgba(255,255,255,0.85) !important;
  }
  .pd-child-btn:hover {
    background: rgba(248,250,252,0.06) !important;
  }
  .pd-row:hover { background: rgba(248,250,252,0.5) !important; }
  .pd-filter-btn:hover { opacity: 0.8; }
  .pd-tab:hover { color: ${T.accent} !important; }

  @keyframes pd-spinner { to { transform: rotate(360deg); } }
  @keyframes pd-fadein {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`

// ── Shared components ───────────────────────────────────────────

function SectionHeading({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{
        fontFamily: T.fontMono, fontSize: 20, letterSpacing: "0.12em",
        color: T.accent, textTransform: "uppercase", marginBottom: 4,
      }}>{label}</p>
      {sub && <p style={{ fontSize: 14, color: T.textMuted, fontFamily: T.fontSans }}>{sub}</p>}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: "20px 24px",
    }}>
      <p style={{
        fontFamily: T.fontMono, fontSize: 10, letterSpacing: "0.12em",
        color: T.textMuted, textTransform: "uppercase", marginBottom: 12,
      }}>{label}</p>
      <p style={{
        fontFamily: T.fontMono, fontSize: 36, fontWeight: 700,
        color: T.text, lineHeight: 1,
      }}>{value}</p>
    </div>
  )
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      padding: "2px 10px", borderRadius: 20, fontSize: 11,
      fontFamily: T.fontMono, letterSpacing: "0.05em", textTransform: "uppercase",
      background: color + "18", color, border: `1px solid ${color}33`,
    }}>{text}</span>
  )
}

function InitialAvatar({ initial, color }: { initial: string; color: string }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
      background: color + "18", border: `1px solid ${color}33`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color, fontFamily: T.fontMono,
    }}>{initial}</div>
  )
}

// ── Table helpers ───────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: "10px 16px", textAlign: "left",
  fontFamily: T.fontMono, fontWeight: 600,
  color: T.textMuted, fontSize: 10,
  letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap",
  borderBottom: `1px solid ${T.border}`,
  background: T.surfaceMuted,
}
const tdStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: 13, color: T.text,
  borderBottom: `1px solid ${T.border}`,
  fontFamily: T.fontSans,
}

const TableWrap = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden",
    background: T.surface, animation: "pd-fadein 0.2s ease",
  }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
  </div>
)

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      padding: "20px 24px",
      ...style,
    }}>{children}</div>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{
      margin: "0 0 12px", fontSize: 20, fontWeight: 600,
      color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em",
      fontFamily: T.fontMono,
    }}>{text}</p>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "9px 0", borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 11, color: T.textMuted, minWidth: 130, fontFamily: T.fontMono, letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: 13, color: T.text, textAlign: "right", fontFamily: T.fontSans }}>{value}</span>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────
export default function ParentDashboard() {
  const [parent, setParent] = useState<Parent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"activity" | "profile">("activity")
  const [filterCat, setFilterCat] = useState("All")
  const [dateStr, setDateStr] = useState("")
  const router = useRouter()

  useEffect(() => {
    const el = document.createElement("style")
    el.textContent = PARENT_STYLES
    document.head.appendChild(el)
    return () => { document.head.removeChild(el) }
  }, [])

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    }))
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

  // ── Loading / error ─────────────────────────────────────────
  if (error) return (
    <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: T.red, fontFamily: T.fontMono }}>
      SYSTEM ERROR: {error}
    </div>
  )
  if (!parent) return (
    <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: T.fontMono, color: T.textMuted, fontSize: 12 }}>
        <div style={{ width: 14, height: 14, border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "pd-spinner 0.7s linear infinite" }} />
        Loading…
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

  const profColor = (level: string) =>
    level === "expert" ? T.green : level === "advanced" ? T.yellow : T.blue

  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      color: T.text,
      fontFamily: T.fontSans,
      display: "flex",
      position: "relative",
    }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside style={{
        width: 220, minHeight: "100vh",
        background: T.sidebar,
        borderRight: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: "rgba(200,168,75,0.15)",
              border: "1px solid rgba(200,168,75,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}></div>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: T.fontMono, letterSpacing: "0.05em" }}>PLAY & LEARN</p>
              <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: T.fontMono }}>PARENT PORTAL</p>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 0 8px" }} />

        {/* Parent info */}
        <div style={{ padding: "10px 18px 14px" }}>
          <p style={{ margin: 0, fontFamily: T.fontMono, fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>SIGNED IN AS</p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", fontFamily: T.fontMono }}>{parent.username}</p>
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: T.fontMono, textTransform: "capitalize" }}>
            {parent.relationship_type} · {parent.email}
          </p>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 0 8px" }} />

        {/* Children nav */}
        <nav style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>
          <p style={{
            fontFamily: T.fontMono, fontSize: 9, letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.2)", textTransform: "uppercase",
            padding: "10px 10px 6px",
          }}>Children</p>

          {children.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontFamily: T.fontMono, padding: "6px 10px" }}>No children linked yet.</p>
          )}

          {children.map((child) => {
            const isActive = selectedChild?._id === child._id
            return (
              <button
                key={child._id}
                onClick={() => handleSelectChild(child)}
                className={`pd-nav-btn pd-child-btn${isActive ? " active" : ""}`}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "9px 12px", marginBottom: 1, borderRadius: 7,
                  border: "none",
                  cursor: "pointer", textAlign: "left",
                  fontFamily: T.fontMono, fontSize: 12, letterSpacing: "0.04em",
                  background: isActive ? "rgba(180,120,40,0.25)" : "transparent",
                  color: isActive ? T.accent : T.textSidebar,
                  borderLeft: isActive ? `2px solid ${T.accent}` : "2px solid transparent",
                  transition: "all 0.15s",
                } as React.CSSProperties}
              >
                <InitialAvatar
                  initial={(child.full_name || child.username).charAt(0).toUpperCase()}
                  color={isActive ? T.accent : T.textSidebar}
                />
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontFamily: T.fontMono }}>{child.full_name || child.username}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: T.fontMono }}>
                    {child.class_id ? child.class_id.class_name : `Grade ${child.grade_level ?? "—"}`}
                  </p>
                </div>
              </button>
            )
          })}
        </nav>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "8px 0" }} />
        <div style={{ padding: "8px 10px 20px" }}>
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "9px 12px", borderRadius: 7, border: "none", cursor: "pointer",
            fontFamily: T.fontMono, fontSize: 12, letterSpacing: "0.04em",
            color: "#ef4444", background: "rgba(239,68,68,0.08)",
            transition: "all 0.15s",
          }}>
            ⏻ Logout
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        display: "flex", flexDirection: "column",
        minHeight: "100vh",
        background: "#f1f5f9",
        position: "relative",
      }}>
        <div style={{ flex: 1, padding: "28px 32px", animation: "pd-fadein 0.2s ease" }}>

          {/* Header */}
          <header style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 28, paddingBottom: 20,
            borderBottom: `1px solid ${T.border}`,
          }}>
            <div>
              <p style={{ fontFamily: T.fontMono, fontSize: 20, letterSpacing: "0.12em", color: T.accent, textTransform: "uppercase", marginBottom: 4 }}>
                PARENT PORTAL
              </p>
              <p style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontMono }}>{dateStr}</p>
            </div>
            {/* <button onClick={handleLogout} style={{
              padding: "7px 16px", borderRadius: 7, border: `1px solid ${T.border}`,
              background: T.surface, color: T.textMuted, fontSize: 12,
              fontFamily: T.fontMono, cursor: "pointer", letterSpacing: "0.04em",
            }}>Logout</button> */}
          </header>

          {/* Empty state */}
          {!selectedChild ? (
            <div style={{
              flex: 1,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              marginTop: "10rem",
              animation: "pd-fadein 0.2s ease",
            }}>
              <p style={{
                fontFamily: T.fontMono, fontSize: 18, letterSpacing: "0.12em",
                color: T.accent, textTransform: "uppercase", marginBottom: 10,
              }}>Please Choose a Child</p>
              <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.textMuted, letterSpacing: "0.06em" }}>
                Select a child from the sidebar to view their activity and profile.
              </p>
            </div>
          ) : (
            <div style={{ animation: "pd-fadein 0.2s ease" }}>

              {/* Child header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, padding: "16px 20px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: T.purple + "18", border: `1px solid ${T.purple}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 18, color: T.purple, fontFamily: T.fontMono,
                }}>
                  {(selectedChild.full_name || selectedChild.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 16, color: T.text, fontFamily: T.fontSans }}>
                    {selectedChild.full_name || selectedChild.username}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: T.textMuted, fontFamily: T.fontMono, letterSpacing: "0.04em" }}>
                    Age {calcAge(selectedChild.date_of_birth)}
                    {selectedChild.class_id && ` · ${selectedChild.class_id.class_name}, ${selectedChild.class_id.school_name}`}
                  </p>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, boxShadow: `0 0 6px ${T.green}` }} />
                  <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.textMuted, letterSpacing: "0.06em" }}>Active Student</span>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${T.border}` }}>
                {(["activity", "profile"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className="pd-tab" style={{
                    padding: "8px 24px 12px",
                    cursor: "pointer", border: "none", background: "none",
                    fontFamily: T.fontMono, fontSize: 10,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: activeTab === tab ? T.accent : T.textMuted,
                    borderBottom: activeTab === tab ? `2px solid ${T.accent}` : "2px solid transparent",
                    transition: "all 0.15s",
                  }}>{tab}</button>
                ))}
              </div>

              {/* ── Activity Tab ─────────────────────────────── */}
              {activeTab === "activity" && (
                <div>
                  {/* Stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20, maxWidth: 680 }}>
                    <StatCard label="Total Visits"  value={activity.length}          color={T.blue} />
                    <StatCard label="Time on Task"  value={formatDuration(totalTime)} color={T.accent} />
                    <StatCard label="Categories"    value={categories.length}         color={T.purple} />
                  </div>

                  {/* Top categories */}
                  {topCats.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Top Categories</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {topCats.map(([cat, count]) => (
                          <Badge key={cat} text={`${cat} (${count})`} color={getCatColor(cat)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category filter */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                    {["All", ...categories].map((cat) => (
                      <button key={cat} onClick={() => setFilterCat(cat)} className="pd-filter-btn" style={{
                        padding: "4px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                        border: filterCat === cat ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                        background: filterCat === cat ? T.accentDim : "transparent",
                        color: filterCat === cat ? T.accent : T.textMuted,
                        fontFamily: T.fontMono, letterSpacing: "0.04em",
                        transition: "all 0.15s",
                      }}>{cat}</button>
                    ))}
                  </div>

                  {/* Activity table */}
                  {activityLoading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", fontFamily: T.fontMono, color: T.textMuted, fontSize: 12 }}>
                      <div style={{ width: 14, height: 14, border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "pd-spinner 0.7s linear infinite" }} />
                      Loading activity log…
                    </div>
                  ) : filteredActivity.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: T.fontMono, color: T.textMuted, fontSize: 12 }}>
                      No activity recorded yet.
                    </div>
                  ) : (
                    <TableWrap>
                      <thead>
                        <tr>
                          {["URL", "Category", "Type", "Duration", "Time"].map((h) => (
                            <th key={h} style={thStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActivity.map((item) => (
                          <tr key={item._id} className="pd-row" style={{ transition: "background 0.1s" }}>
                            <td style={{ ...tdStyle, maxWidth: 280 }}>
                              <a href={item.url} target="_blank" rel="noreferrer" style={{
                                color: T.blue, fontSize: 12, fontFamily: T.fontMono,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                display: "block", maxWidth: 260, textDecoration: "none",
                              }}>{item.url}</a>
                            </td>
                            <td style={tdStyle}>
                              <Badge text={item.category} color={getCatColor(item.category)} />
                            </td>
                            <td style={{ ...tdStyle, color: T.textMuted, fontFamily: T.fontMono, fontSize: 12 }}>
                              {interactionIcon[item.interaction_type] ?? ""} {item.interaction_type}
                            </td>
                            <td style={{ ...tdStyle, fontFamily: T.fontMono, fontSize: 12 }}>
                              {formatDuration(item.visit_duration)}
                            </td>
                            <td style={{ ...tdStyle, color: T.textMuted, fontSize: 12, fontFamily: T.fontMono }}>
                              {formatTime(item.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  )}
                </div>
              )}

              {/* ── Profile Tab ──────────────────────────────── */}
              {activeTab === "profile" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                  {/* Basic info */}
                  <SectionCard>
                    <SectionLabel text="Basic Info" />
                    {([
                      ["Full Name",  selectedChild.full_name || "—"],
                      ["Username",   selectedChild.username],
                      ["Age",        String(calcAge(selectedChild.date_of_birth))],
                      ["Grade",      String(selectedChild.class_id?.grade_level ?? "—")],
                      ["Language",   selectedChild.preferred_language || "—"],
                      ["School",     selectedChild.class_id?.school_name ?? "—"],
                      ["Class",      selectedChild.class_id?.class_name ?? "—"],
                    ] as [string, string][]).map(([label, val]) => (
                      <ProfileRow key={label} label={label} value={val} />
                    ))}
                  </SectionCard>

                  {/* Proficiency */}
                  <SectionCard>
                    <SectionLabel text="Subject Proficiency" />
                    {selectedChild.proficiency_levels?.length > 0 ? (
                      selectedChild.proficiency_levels.map((p) => (
                        <div key={p.category} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "9px 0", borderBottom: `1px solid ${T.border}`,
                        }}>
                          <span style={{ fontSize: 13, color: T.text, fontFamily: T.fontSans }}>{p.category}</span>
                          <Badge text={p.level} color={profColor(p.level)} />
                        </div>
                      ))
                    ) : (
                      <p style={{ color: T.textMuted, fontSize: 12, fontFamily: T.fontMono }}>No proficiency data yet.</p>
                    )}
                  </SectionCard>

                  {/* Interests */}
                  <SectionCard>
                    <SectionLabel text="Interest Scores" />
                    {selectedChild.interests?.interest_scores?.length > 0 ? (
                      [...selectedChild.interests.interest_scores]
                        .sort((a, b) => b.score - a.score)
                        .map((item) => (
                          <div key={item.category} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                              <span style={{ fontSize: 13, color: T.text, fontFamily: T.fontSans }}>{item.category}</span>
                              <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontMono }}>{item.score}</span>
                            </div>
                            <div style={{ height: 5, background: T.border, borderRadius: 3 }}>
                              <div style={{
                                height: 5, borderRadius: 3,
                                background: `linear-gradient(90deg, ${T.purple}, ${T.blue})`,
                                width: `${Math.min(item.score, 100)}%`,
                                transition: "width 0.5s ease",
                              }} />
                            </div>
                          </div>
                        ))
                    ) : (
                      <p style={{ color: T.textMuted, fontSize: 12, fontFamily: T.fontMono }}>No interest data yet.</p>
                    )}
                  </SectionCard>

                  {/* Accessibility */}
                  <SectionCard>
                    <SectionLabel text="Accessibility" />
                    {selectedChild.accessibility?.has_accessibility_needs ? (
                      <div>
                        {selectedChild.accessibility.sensory_limitations?.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <p style={{ fontFamily: T.fontMono, fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Sensory</p>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {selectedChild.accessibility.sensory_limitations.map((s) => (
                                <Badge key={s} text={s} color={T.yellow} />
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedChild.accessibility.neurodiversity_flags?.length > 0 && (
                          <div>
                            <p style={{ fontFamily: T.fontMono, fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Neurodiversity</p>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {selectedChild.accessibility.neurodiversity_flags.map((n) => (
                                <Badge key={n} text={n} color={T.purple} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: T.textMuted, fontSize: 12, fontFamily: T.fontMono }}>No accessibility needs recorded.</p>
                    )}
                  </SectionCard>

                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}