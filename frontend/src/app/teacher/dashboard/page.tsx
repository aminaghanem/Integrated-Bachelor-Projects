"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const API = "http://localhost:4000"

// ── Types ──────────────────────────────────────────────────────────
interface Subject {
  _id: string
  name: string
  category: string
}

interface StudentInClass {
  _id: string
  username: string
  full_name: string
  grade_level: number
  class_id: SchoolClass | null
  proficiency_levels: { category: string; level: string; assigned_by: string }[]
}

interface SchoolClass {
  _id: string
  class_name: string
  school_name: string
  grade_level: number
  students: StudentInClass[]
  subjects: { subject: Subject; teacher_id: string }[]
}

interface Assignment {
  class_id: SchoolClass
  subject: Subject
}

interface Teacher {
  _id: string
  username: string
  email: string
  teaching_assignments: Assignment[]
}

function groupBySubject(assignments: Assignment[]) {
  const map: Record<string, { subject: Subject; classes: SchoolClass[] }> = {}
  for (const a of assignments) {
    if (!a.subject || !a.class_id) continue
    const key = a.subject._id
    if (!map[key]) map[key] = { subject: a.subject, classes: [] }
    const already = map[key].classes.find(c => c._id === a.class_id._id)
    if (!already) map[key].classes.push(a.class_id)
  }
  return Object.values(map)
}

// ── Design tokens (matching admin portal) ──────────────────────────
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
  textDim:      "rgba(255,255,255,0.35)",
  textSidebar:  "rgba(255,255,255,0.55)",
  navActive:    "rgba(180,120,40,0.25)",
  navActiveBorder: "#c8a84b",
  red:          "#ef4444",
  green:        "#22c55e",
  blue:         "#3b82f6",
  purple:       "#8b5cf6",
  orange:       "#f97316",
  yellow:       "#eab308",
  indigo:       "#6366f1",
  pink:         "#ec4899",
  fontMono:     "'Share Tech Mono', monospace",
  fontSans:     "'Inter', 'Segoe UI', sans-serif",
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Inter:wght@400;500;600;700&display=swap');
 
  * { box-sizing: border-box; margin: 0; padding: 0; }
 
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(200,168,75,0.25); border-radius: 4px; }
 
  .td-nav-btn:hover {
    background: rgba(255,255,255,0.06) !important;
    color: rgba(255,255,255,0.85) !important;
  }
  .td-nav-btn.active {
    background: rgba(180,120,40,0.25) !important;
    color: #c8a84b !important;
    border-left: 2px solid #c8a84b !important;
  }
  .td-class-btn:hover {
    background: rgba(248,250,252,0.4) !important;
  }
  .td-row:hover { background: rgba(248,250,252,0.5) !important; }
  .td-action-btn:hover { opacity: 0.8; }
 
  @keyframes td-spinner { to { transform: rotate(360deg); } }
  @keyframes td-fadein {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`

// ── Shared components ───────────────────────────────────────────────

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

function ActionBtn({ label, color, onClick, disabled }: { label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="td-action-btn" onClick={onClick} disabled={disabled} style={{
      padding: "3px 10px", borderRadius: 5, fontSize: 11,
      border: `1px solid ${color}44`, background: color + "14", color,
      fontFamily: T.fontMono, letterSpacing: "0.04em",
      cursor: disabled ? "not-allowed" : "pointer",
      marginRight: 4, transition: "opacity 0.15s",
      opacity: disabled ? 0.5 : 1,
    }}>{label}</button>
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

// ── Table helpers ───────────────────────────────────────────────────
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
    background: T.surface, animation: "td-fadein 0.2s ease",
  }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
  </div>
)

const proficiencyColors: Record<string, string> = {
  beginner:  T.blue,
  advanced:  T.yellow,
  expert:    T.green,
  "not set": T.textMuted,
}
const getProfColor = (level: string) => proficiencyColors[level] ?? T.textMuted

const selectStyle: React.CSSProperties = {
  padding: "5px 10px", borderRadius: 7,
  border: `1px solid ${T.border}`,
  background: T.surfaceMuted,
  color: T.text,
  fontSize: 12,
  fontFamily: T.fontSans,
  cursor: "pointer",
  outline: "none",
}

// ── Main component ──────────────────────────────────────────────────
export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [editingStudent, setEditingStudent] = useState<string | null>(null)
  const [profLevel, setProfLevel] = useState<string>("beginner")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [dateStr, setDateStr] = useState("")
  const router = useRouter()

  useEffect(() => {
    const el = document.createElement("style")
    el.textContent = STYLES
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
    fetch(`${API}/api/teachers/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then(data => setTeacher(data))
      .catch(err => setError(err.message))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/")
  }

  const handleSelectClass = (cls: SchoolClass, subject: Subject) => {
    setSelectedClass(cls)
    setSelectedSubject(subject)
    setEditingStudent(null)
    setSaveMsg(null)
  }

  const getStudentProficiency = (student: StudentInClass, category: string) =>
    student.proficiency_levels?.find(p => p.category === category)?.level ?? "not set"

  const handleSaveProficiency = async (studentId: string) => {
    if (!selectedSubject) return
    setSaving(true)
    setSaveMsg(null)
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${API}/api/students/proficiency/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category: selectedSubject.name, level: profLevel }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setSelectedClass(prev => {
        if (!prev) return prev
        return {
          ...prev,
          students: prev.students.map(s => {
            if (s._id !== studentId) return s
            const existing = s.proficiency_levels.find(p => p.category === selectedSubject.name)
            if (existing) {
              return { ...s, proficiency_levels: s.proficiency_levels.map(p => p.category === selectedSubject.name ? { ...p, level: profLevel } : p) }
            }
            return { ...s, proficiency_levels: [...s.proficiency_levels, { category: selectedSubject.name, level: profLevel, assigned_by: "teacher" }] }
          }),
        }
      })
      setSaveMsg("Saved successfully.")
      setEditingStudent(null)
    } catch {
      setSaveMsg("Save failed.")
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  // ── Loading / error ──────────────────────────────────────────────
  if (error) return (
    <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: T.red, fontFamily: T.fontMono }}>
      SYSTEM ERROR: {error}
    </div>
  )
  if (!teacher) return (
    <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: T.fontMono, color: T.textMuted, fontSize: 12 }}>
        <div style={{ width: 14, height: 14, border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "td-spinner 0.7s linear infinite" }} />
        Loading…
      </div>
    </div>
  )

  const grouped = groupBySubject(teacher.teaching_assignments)
  const totalStudents = selectedClass?.students.length ?? 0
  const setLevels = selectedClass?.students.filter(s => getStudentProficiency(s, selectedSubject?.name ?? "") !== "not set").length ?? 0
  const expertCount = selectedClass?.students.filter(s => getStudentProficiency(s, selectedSubject?.name ?? "") === "expert").length ?? 0

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
              <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: T.fontMono }}>INSTRUCTOR</p>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 0 8px" }} />

        {/* Teacher info */}
        <div style={{ padding: "10px 18px 14px" }}>
          <p style={{ margin: 0, fontFamily: T.fontMono, fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>SIGNED IN AS</p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", fontFamily: T.fontMono }}>{teacher.username}</p>
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: T.fontMono }}>{teacher.email}</p>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 0 8px" }} />

        {/* Classes nav */}
        <nav style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>
          <p style={{
            fontFamily: T.fontMono, fontSize: 9, letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.2)", textTransform: "uppercase",
            padding: "10px 10px 6px",
          }}>Classes</p>

          {grouped.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontFamily: T.fontMono, padding: "6px 10px" }}>No classes assigned.</p>
          )}

          {grouped.map(({ subject, classes }) => (
            <div key={subject._id} style={{ marginBottom: 12 }}>
              <p style={{
                fontFamily: T.fontMono, fontSize: 9, letterSpacing: "0.1em",
                color: T.accent, textTransform: "uppercase",
                padding: "6px 10px 4px",
              }}>{subject.name}</p>

              {classes.map(cls => {
                const isActive = selectedClass?._id === cls._id && selectedSubject?._id === subject._id
                return (
                  <button
                    key={cls._id + subject._id}
                    className={`td-nav-btn td-class-btn${isActive ? " active" : ""}`}
                    onClick={() => handleSelectClass(cls, subject)}
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
                    <InitialAvatar initial={cls.class_name.charAt(0).toUpperCase()} color={isActive ? T.accent : T.textSidebar} />
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontFamily: T.fontMono }}>{cls.class_name}</p>
                      <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: T.fontMono }}>Grade {cls.grade_level}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
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
        <div style={{ flex: 1, padding: "28px 32px", animation: "td-fadein 0.2s ease" }}>

          {/* Header */}
          <header style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 28, paddingBottom: 20,
            borderBottom: `1px solid ${T.border}`,
          }}>
            <div>
              <p style={{ fontFamily: T.fontMono, fontSize: 20, letterSpacing: "0.12em", color: T.accent, textTransform: "uppercase", marginBottom: 4 }}>
                INSTRUCTOR PORTAL
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
          {!selectedClass ? (
              <div style={{
                flex: 1,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                marginTop: "10rem",
                animation: "td-fadein 0.2s ease",
              }}>
                <p style={{
                  fontFamily: T.fontMono, fontSize: 18, letterSpacing: "0.12em",
                  color: T.accent, textTransform: "uppercase", marginBottom: 10,
                }}>Please Choose a Class</p>
                <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.textMuted, letterSpacing: "0.06em" }}>
                  Select a class from the sidebar to get started.
                </p>
              </div>
            ) : (
              <div style={{ animation: "td-fadein 0.2s ease" }}>

              {/* Breadcrumb / class header */}
              <div style={{ marginBottom: 24 }}>
                {/* <button
                  onClick={() => setSelectedClass(null)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: T.fontMono, fontSize: 11, color: T.textMuted,
                    letterSpacing: "0.04em", marginBottom: 8, padding: 0,
                  }}
                >
                  ← Back to classes
                </button> */}
                <SectionHeading
                  label={selectedClass.class_name}
                  sub={`${selectedClass.school_name} · Grade ${selectedClass.grade_level}${selectedSubject ? ` · ${selectedSubject.name}` : ""}`}
                />
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24, maxWidth: 680 }}>
                <StatCard label="Total Students" value={totalStudents} color={T.blue} />
                <StatCard label="Levels Set"     value={setLevels}     color={T.accent} />
                <StatCard label="Expert Rank"    value={expertCount}   color={T.green} />
              </div>

              {/* Save message */}
              {saveMsg && (
                <p style={{
                  color: saveMsg.toLowerCase().includes("fail") ? T.red : T.green,
                  fontSize: 12, marginBottom: 14, fontFamily: T.fontMono,
                }}>{saveMsg}</p>
              )}

              {/* Students table */}
              {selectedClass.students.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: T.fontMono, color: T.textMuted, fontSize: 12 }}>
                  No students in this class.
                </div>
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      {["Student", "Username", `${selectedSubject?.name ?? ""} Proficiency`, "Action"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClass.students.map(student => {
                      const currentLevel = getStudentProficiency(student, selectedSubject?.name ?? "")
                      const isEditing = editingStudent === student._id
                      const profColor = getProfColor(currentLevel)

                      return (
                        <tr key={student._id} className="td-row" style={{ transition: "background 0.1s" }}>
                          {/* Name */}
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <InitialAvatar initial={(student.full_name || student.username || "?").charAt(0).toUpperCase()} color={T.blue} />
                              {student.full_name || "—"}
                            </div>
                          </td>

                          {/* Username */}
                          <td style={{ ...tdStyle, color: T.textMuted, fontFamily: T.fontMono, fontSize: 12 }}>
                            @{student.username}
                          </td>

                          {/* Proficiency */}
                          <td style={tdStyle}>
                            {isEditing ? (
                              <select
                                value={profLevel}
                                onChange={e => setProfLevel(e.target.value)}
                                style={selectStyle}
                              >
                                <option value="beginner">Beginner</option>
                                <option value="advanced">Advanced</option>
                                <option value="expert">Expert</option>
                              </select>
                            ) : (
                              <Badge text={currentLevel} color={profColor} />
                            )}
                          </td>

                          {/* Action */}
                          <td style={tdStyle}>
                            {isEditing ? (
                              <div style={{ display: "flex", gap: 4 }}>
                                <ActionBtn
                                  label={saving ? "Saving…" : "Save"}
                                  color={T.green}
                                  onClick={() => handleSaveProficiency(student._id)}
                                  disabled={saving}
                                />
                                <ActionBtn
                                  label="Cancel"
                                  color={T.textMuted}
                                  onClick={() => setEditingStudent(null)}
                                />
                              </div>
                            ) : (
                              <ActionBtn
                                label="Set Level"
                                color={T.blue}
                                onClick={() => {
                                  setEditingStudent(student._id)
                                  setProfLevel(currentLevel === "not set" ? "beginner" : currentLevel)
                                }}
                              />
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </TableWrap>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}