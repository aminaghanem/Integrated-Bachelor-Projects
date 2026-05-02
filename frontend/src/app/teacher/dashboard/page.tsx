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

// ── Inline global styles ────────────────────────────────────────
const TEACHER_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@400;600;700&display=swap');

  .td-nav-btn:hover {
    background: rgba(255,230,0,0.12) !important;
    border-color: #ffe600 !important;
    color: #ffe600 !important;
    transform: translateY(-1px);
    box-shadow: 2px 4px 0 #3d2c1e !important;
  }
  .td-class-btn:hover {
    background: rgba(91,141,238,0.15) !important;
    border-color: rgba(91,141,238,0.4) !important;
  }
  .td-tab:hover {
    color: #ffe600 !important;
  }
  .td-row:hover {
    background: rgba(255,255,255,0.03) !important;
  }
  .td-stat-card:hover {
    border-color: rgba(255,230,0,0.3) !important;
    box-shadow: 0 0 16px rgba(255,230,0,0.08) !important;
  }
  .td-action-btn:hover {
    border-color: #ffe600 !important;
    color: #ffe600 !important;
  }
  @keyframes td-spinner {
    to { transform: rotate(360deg); }
  }
  @keyframes td-fadein {
    from { opacity:0; transform:translateY(6px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes td-hud-glow {
    0%,100% { text-shadow: 0 0 8px rgba(255,230,0,0.4); }
    50%      { text-shadow: 0 0 20px rgba(255,230,0,0.8), 0 0 40px rgba(255,230,0,0.3); }
  }
  @keyframes td-blink {
    0%,100% { opacity:1; }
    50%      { opacity:0.3; }
  }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
  ::-webkit-scrollbar-thumb { background: rgba(91,141,238,0.3); border-radius: 3px; }
`

const proficiencyStyle: Record<string, { bg: string; color: string; border: string }> = {
  beginner:  { bg: "rgba(91,141,238,0.15)",  color: "#5b8dee",  border: "rgba(91,141,238,0.33)" },
  advanced:  { bg: "rgba(255,230,0,0.12)",   color: "#ffe600",  border: "rgba(255,230,0,0.33)" },
  expert:    { bg: "rgba(0,255,136,0.12)",   color: "#00ff88",  border: "rgba(0,255,136,0.33)" },
  "not set": { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: "rgba(255,255,255,0.1)" },
}

const getProfStyle = (level: string) =>
  proficiencyStyle[level] ?? proficiencyStyle["not set"]

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [editingStudent, setEditingStudent] = useState<string | null>(null)
  const [profLevel, setProfLevel] = useState<string>("beginner")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const el = document.createElement("style")
    el.textContent = TEACHER_STYLES
    document.head.appendChild(el)
    return () => { document.head.removeChild(el) }
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
      setSaveMsg("SAVED!")
      setEditingStudent(null)
    } catch {
      setSaveMsg("SAVE FAILED")
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  // ── Loading / error ─────────────────────────────────────────────
  if (error) return (
    <div style={{ background: "#1a0e2e", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff4444", fontFamily: "'Orbitron', monospace" }}>
      SYSTEM ERROR: {error}
    </div>
  )
  if (!teacher) return (
    <div style={{ background: "#1a0e2e", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #ffe600", borderTopColor: "transparent", borderRadius: "50%", animation: "td-spinner 0.8s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ fontFamily: "'Orbitron', monospace", color: "#ffe600", fontSize: 13, letterSpacing: "0.15em" }}>INITIALIZING…</div>
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
      background: "#7a59af",
      color: "#e8e8f0",
      fontFamily: "'Exo 2', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Grid bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `linear-gradient(rgba(91,141,238,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(91,141,238,0.06) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(91,141,238,0.12) 0%, transparent 60%)" }} />

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
          {/* Toggle */}
          <button onClick={() => setSidebarOpen(o => !o)} style={{ ...mcBtn, marginBottom: 20, width: "100%", flexDirection: "row", justifyContent: "center", fontSize: 14 }} className="td-nav-btn">
            {sidebarOpen ? "◀" : "▶"}
          </button>

          {sidebarOpen && (
            <>
              {/* Teacher info */}
              <div style={{ marginBottom: "1.25rem", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "rgba(255,230,0,0.6)", letterSpacing: "0.12em", marginBottom: 6 }}>INSTRUCTOR</div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13, fontFamily: "'Share Tech Mono', monospace", color: "#e8e8f0" }}>{teacher.username.toUpperCase()}</p>
                <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}>{teacher.email}</p>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "0 0 1rem" }} />

              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "rgba(255,230,0,0.5)", letterSpacing: "0.12em", marginBottom: 10 }}>
                ASSIGNED CLASSES
              </div>

              {grouped.length === 0 && (
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>No classes assigned yet.</p>
              )}

              {grouped.map(({ subject, classes }) => (
                <div key={subject._id} style={{ marginBottom: "1.25rem" }}>
                  {/* Subject label */}
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 15, color: "rgba(91,141,238,0.7)", letterSpacing: "0.12em", marginBottom: 6, padding: "3px 8px", background: "rgba(91,141,238,0.08)", borderRadius: 4, display: "inline-block" }}>
                    {subject.name.toUpperCase()}
                  </div>

                  {classes.map(cls => {
                    const isActive = selectedClass?._id === cls._id && selectedSubject?._id === subject._id
                    const initials = cls.class_name.charAt(0).toUpperCase()
                    return (
                      <button
                        key={cls._id + subject._id}
                        onClick={() => handleSelectClass(cls, subject)}
                        className="td-class-btn"
                        style={{
                          display: "flex", alignItems: "center", gap: 10, width: "100%",
                          textAlign: "left", padding: "10px 12px", marginBottom: 4,
                          cursor: "pointer", borderRadius: 10,
                          border: isActive ? "1px solid rgba(91,141,238,0.5)" : "1px solid rgba(255,255,255,0.06)",
                          background: isActive ? "rgba(91,141,238,0.15)" : "rgba(255,255,255,0.02)",
                          color: isActive ? "#e8e8f0" : "rgba(255,255,255,0.6)",
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                          background: isActive ? "rgba(91,141,238,0.3)" : "rgba(255,255,255,0.06)",
                          border: isActive ? "1px solid rgba(91,141,238,0.6)" : "1px solid rgba(255,255,255,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 700, fontSize: 14,
                          color: isActive ? "#5b8dee" : "rgba(255,255,255,0.4)",
                          fontFamily: "'Orbitron', monospace",
                        }}>{initials}</div>
                        <div>
                          <p style={{ margin: 0, fontWeight: isActive ? 600 : 400, fontSize: 13, fontFamily: "'Exo 2', sans-serif" }}>{cls.class_name}</p>
                          <p style={{ margin: 0, fontSize: 10, color: isActive ? "rgba(91,141,238,0.8)" : "rgba(255,255,255,0.25)", fontFamily: "'Share Tech Mono', monospace" }}>
                            {cls.school_name} · G{cls.grade_level}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}

              <div style={{ flex: 1 }} />
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "1rem 0" }} />
              {/* <button onClick={handleLogout} className="td-nav-btn" style={{ ...mcBtn, width: "100%", flexDirection: "row", justifyContent: "center", gap: 8, padding: "10px 14px" }}>
                <span style={{ fontSize: 14 }}>⏻</span>
                <span>LOGOUT</span>
              </button> */}
            </>
          )}

          {!sidebarOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              {grouped.map(({ subject, classes }) =>
                classes.map(cls => {
                  const isActive = selectedClass?._id === cls._id && selectedSubject?._id === subject._id
                  return (
                    <button key={cls._id + subject._id} onClick={() => handleSelectClass(cls, subject)} title={`${cls.class_name} · ${subject.name}`} style={{
                      width: 40, height: 40, borderRadius: 8,
                      border: isActive ? "1px solid rgba(91,141,238,0.6)" : "1px solid rgba(255,255,255,0.1)",
                      background: isActive ? "rgba(91,141,238,0.3)" : "rgba(255,255,255,0.04)",
                      color: isActive ? "#5b8dee" : "rgba(255,255,255,0.4)",
                      cursor: "pointer", fontWeight: 700, fontSize: 13,
                      fontFamily: "'Orbitron', monospace",
                    }}>{cls.class_name.charAt(0).toUpperCase()}</button>
                  )
                })
              )}
              <div style={{ flex: 1 }} />
              <button onClick={handleLogout} title="Logout" style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14 }} className="td-nav-btn">⏻</button>
            </div>
          )}
        </aside>

        {/* ── Main ────────────────────────────────────────────── */}
        <main style={{ flex: 1, padding: "20px 28px", overflowY: "auto", maxWidth: 1100 }}>

          {/* Header */}
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,230,0,0.1)", border: "1px solid rgba(255,230,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎓</div> */}
              <div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontWeight: 900, fontSize: 22, color: "#ffe600", letterSpacing: "0.1em" }}>
                  INSTRUCTOR PORTAL
                </div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", marginTop: 4 }}>
                  TEACHER USERNAME · <span style={{ color: "#5b8dee" }}>{teacher.username.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "HOME",   icon: "⌂",  action: () => setSelectedClass(null) },
                { label: "LOGOUT", icon: "⏻",  action: handleLogout },
              ].map(btn => (
                <button key={btn.label} className="td-nav-btn" onClick={btn.action} style={{ ...mcBtn }}>
                  <span style={{ fontSize: 16 }}>{btn.icon}</span>
                  {btn.label}
                </button>
              ))}
            </div>
          </header>

          {/* Empty state */}
          {!selectedClass ? (
            <div style={{ textAlign: "center", marginTop: "6rem" }}>
              {/* <div style={{ fontSize: 64, marginBottom: 20 }}>📚</div> */}
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", lineHeight: 2 }}>
                SELECT A CLASS<br />FROM THE SIDEBAR
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 12, letterSpacing: "0.08em" }}>
                {grouped.length} SUBJECT{grouped.length !== 1 ? "S" : ""} ASSIGNED TO YOUR ACCOUNT
              </div>
            </div>
          ) : (
            <div style={{ animation: "td-fadein 0.2s ease" }}>

              {/* Class header */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: "rgba(91,141,238,0.2)", border: "1px solid rgba(91,141,238,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, color: "#5b8dee", fontFamily: "'Orbitron', monospace" }}>
                  {selectedClass.class_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Exo 2', sans-serif", color: "#e8e8f0" }}>
                    {selectedClass.class_name}
                  </h1>
                  <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em" }}>
                    {selectedClass.school_name} · GRADE {selectedClass.grade_level}
                    {selectedSubject && (
                      <span style={{ marginLeft: 8, padding: "2px 10px", borderRadius: 20, background: "rgba(91,141,238,0.15)", color: "#5b8dee", border: "1px solid rgba(91,141,238,0.3)", fontSize: 10, fontWeight: 600 }}>
                        {selectedSubject.name.toUpperCase()}
                      </span>
                    )}
                  </p>
                </div>

                {saveMsg && (
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: saveMsg === "SAVED!" ? "#00ff88" : "#ff4444", boxShadow: `0 0 6px ${saveMsg === "SAVED!" ? "#00ff88" : "#ff4444"}`, animation: "td-blink 1s ease-in-out infinite" }} />
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: saveMsg === "SAVED!" ? "rgba(0,255,136,0.7)" : "rgba(255,68,68,0.7)", letterSpacing: "0.08em" }}>{saveMsg}</span>
                  </div>
                )}

                {!saveMsg && (
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 6px #00ff88" }} />
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(0,255,136,0.7)", letterSpacing: "0.08em" }}>ACTIVE CLASS</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "TOTAL STUDENTS", value: totalStudents },
                  { label: "LEVELS SET",     value: setLevels },
                  { label: "EXPERT RANK",    value: expertCount },
                ].map(stat => (
                  <div key={stat.label} className="td-stat-card" style={{
                    background: "rgba(255,255,255,0.02)", borderRadius: 12,
                    padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)",
                    transition: "all 0.2s",
                  }}>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "rgba(255,230,0,0.5)", letterSpacing: "0.12em", marginBottom: 8 }}>{stat.label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 700, color: "#e8e8f0" }}>{stat.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Students table */}
              {selectedClass.students.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: "'Share Tech Mono', monospace", color: "rgba(255,255,255,0.2)", fontSize: 12, letterSpacing: "0.08em" }}>
                  NO STUDENTS IN THIS CLASS
                </div>
              ) : (
                <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        {["STUDENT", "USERNAME", `${selectedSubject?.name.toUpperCase() ?? ""} PROFICIENCY`, "ACTION"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: "'Orbitron', monospace", fontWeight: 600, color: "rgba(255,230,0,0.5)", fontSize: 9, letterSpacing: "0.1em" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedClass.students.map((student, i) => {
                        const currentLevel = getStudentProficiency(student, selectedSubject?.name ?? "")
                        const isEditing = editingStudent === student._id
                        const ps = getProfStyle(currentLevel)

                        return (
                          <tr key={student._id} className="td-row" style={{ borderBottom: i < selectedClass.students.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.15s" }}>
                            {/* Name */}
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                  background: "rgba(91,141,238,0.1)", border: "1px solid rgba(91,141,238,0.2)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontWeight: 700, fontSize: 12, color: "#5b8dee", fontFamily: "'Orbitron', monospace",
                                }}>
                                  {(student.full_name || student.username).charAt(0).toUpperCase()}
                                </div>
                                <span style={{ fontWeight: 600, fontSize: 13, fontFamily: "'Exo 2', sans-serif", color: "#e8e8f0" }}>
                                  {student.full_name || "—"}
                                </span>
                              </div>
                            </td>

                            {/* Username */}
                            <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>
                              {student.username}
                            </td>

                            {/* Grade
                            <td style={{ padding: "12px 14px", fontFamily: "'Orbitron', monospace", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                              {student.class_id?.grade_level ?? "—"}
                            </td> */}

                            {/* Proficiency */}
                            <td style={{ padding: "12px 14px" }}>
                              {isEditing ? (
                                <select
                                  value={profLevel}
                                  onChange={e => setProfLevel(e.target.value)}
                                  style={{
                                    padding: "5px 10px", borderRadius: 8,
                                    border: "1px solid rgba(91,141,238,0.4)",
                                    background: "rgba(10,10,26,0.8)",
                                    color: "#e8e8f0",
                                    fontSize: 12,
                                    fontFamily: "'Share Tech Mono', monospace",
                                    cursor: "pointer",
                                    outline: "none",
                                  }}
                                >
                                  <option value="beginner">BEGINNER</option>
                                  <option value="advanced">ADVANCED</option>
                                  <option value="expert">EXPERT</option>
                                </select>
                              ) : (
                                <span style={{
                                  padding: "3px 12px", borderRadius: 20, fontSize: 10, fontWeight: 600,
                                  fontFamily: "'Share Tech Mono', monospace",
                                  background: ps.bg, color: ps.color,
                                  border: `1px solid ${ps.border}`,
                                  letterSpacing: "0.06em",
                                }}>
                                  {currentLevel.toUpperCase()}
                                </span>
                              )}
                            </td>

                            {/* Action */}
                            <td style={{ padding: "12px 14px" }}>
                              {isEditing ? (
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button
                                    onClick={() => handleSaveProficiency(student._id)}
                                    disabled={saving}
                                    style={{
                                      padding: "5px 14px", borderRadius: 6, cursor: "pointer",
                                      background: "rgba(0,255,136,0.15)",
                                      border: "1px solid rgba(0,255,136,0.4)",
                                      color: "#00ff88",
                                      fontSize: 10, fontFamily: "'Share Tech Mono', monospace",
                                      letterSpacing: "0.06em",
                                      transition: "all 0.15s",
                                    }}
                                  >
                                    {saving ? "SAVING…" : "SAVE"}
                                  </button>
                                  <button
                                    onClick={() => setEditingStudent(null)}
                                    style={{
                                      padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                                      background: "transparent",
                                      border: "1px solid rgba(255,255,255,0.15)",
                                      color: "rgba(255,255,255,0.4)",
                                      fontSize: 10, fontFamily: "'Share Tech Mono', monospace",
                                      letterSpacing: "0.06em",
                                    }}
                                  >
                                    CANCEL
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="td-action-btn"
                                  onClick={() => {
                                    setEditingStudent(student._id)
                                    setProfLevel(currentLevel === "not set" ? "beginner" : currentLevel)
                                  }}
                                  style={{
                                    padding: "5px 14px", borderRadius: 6, cursor: "pointer",
                                    background: "transparent",
                                    border: "1px solid rgba(255,255,255,0.15)",
                                    color: "rgba(255,255,255,0.4)",
                                    fontSize: 10, fontFamily: "'Share Tech Mono', monospace",
                                    letterSpacing: "0.06em",
                                    transition: "all 0.15s",
                                  }}
                                >
                                  SET LEVEL
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}