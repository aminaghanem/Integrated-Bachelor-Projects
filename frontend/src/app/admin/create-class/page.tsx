"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type SubjectRow = { subject_id: string; teacher_username: string }

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@400;600;700&display=swap');
  @keyframes mc-spinner { to { transform: rotate(360deg); } }
  @keyframes mc-fadein  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes mc-glow    { 0%,100% { text-shadow: 0 0 8px rgba(255,165,0,0.4); } 50% { text-shadow: 0 0 20px rgba(255,165,0,0.8), 0 0 40px rgba(255,165,0,0.3); } }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,165,0,0.3); border-radius: 3px; }
  .mc-input { transition: border-color 0.2s; }
  .mc-input:focus { border-color: rgba(255,165,0,0.5) !important; outline: none; }
  .mc-input::placeholder { color: rgba(255,255,255,0.18); font-family: 'Share Tech Mono', monospace; }
  .mc-select { transition: border-color 0.2s; }
  .mc-select:focus { border-color: rgba(255,165,0,0.5) !important; outline: none; }
  .mc-select option { background: #1a0e2e; color: #e8e8f0; }
  .mc-back:hover { color: #ffe600 !important; }
  .mc-submit:not(:disabled):hover { filter: brightness(1.15); transform: translateY(-1px); }
  .mc-add-btn:hover { border-color: #ffe600 !important; color: #ffe600 !important; }
  .mc-remove-btn:hover { color: #ff503c !important; border-color: rgba(255,80,60,0.5) !important; }
`

const SectionDivider = ({ label, accent }: { label: string; accent: string }) => (
  <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "22px 0 14px", paddingTop: 16 }}>
    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 8, color: `${accent}88`, letterSpacing: "0.15em" }}>{label}</div>
  </div>
)

export default function CreateClass() {
  const router = useRouter()
  const [form, setForm] = useState({ school_name: "", grade_level: "", class_name: "" })
  const [subjects, setSubjects] = useState<SubjectRow[]>([{ subject_id: "", teacher_username: "" }])
  const [students, setStudents] = useState<string[]>([""])
  const [availableSubjects, setAvailableSubjects] = useState<{ _id: string; name: string }[]>([])
  const [teachers, setTeachers] = useState<{ _id: string; username: string; teachable_subjects?: string[] }[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const el = document.createElement("style"); el.textContent = STYLES
    document.head.appendChild(el); return () => { document.head.removeChild(el) }
  }, [])

  useEffect(() => {
    fetch("http://localhost:4000/api/teachers")
      .then(r => r.json())
      .then(data => setTeachers(Array.isArray(data) ? data : data.teachers || []))
      .catch(() => {})
  }, [])

  const fetchSubjectsByGrade = async (grade: string) => {
    if (!grade) { setAvailableSubjects([]); return }
    try {
      const res = await fetch(`http://localhost:4000/api/subjects/grade/${grade}`)
      const data = await res.json()
      setAvailableSubjects(Array.isArray(data) ? data : [])
    } catch {}
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (e.target.name === "grade_level") fetchSubjectsByGrade(e.target.value)
  }

  const handleSubjectChange = (index: number, field: keyof SubjectRow, value: string) => {
    const updated = [...subjects]; updated[index][field] = value; setSubjects(updated)
  }
  const addSubject = () => setSubjects([...subjects, { subject_id: "", teacher_username: "" }])
  const removeSubject = (index: number) => setSubjects(subjects.filter((_, i) => i !== index))

  const handleTeacherChange = async (index: number, selectedUsername: string) => {
    handleSubjectChange(index, "teacher_username", selectedUsername)
    const teacher = teachers.find(t => t.username === selectedUsername)
    const subjectId = subjects[index].subject_id
    if (!teacher || !subjectId) return
    const canTeach = teacher.teachable_subjects?.includes(subjectId)
    if (!canTeach) {
      const confirmAdd = confirm("This teacher does not teach this subject. Do you want to add it?")
      if (confirmAdd) {
        await fetch(`http://localhost:4000/api/teachers/${teacher._id}/add-subject`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject_id: subjectId })
        })
      }
    }
  }

  const handleStudentChange = (index: number, value: string) => {
    const updated = [...students]; updated[index] = value; setStudents(updated)
  }
  const addStudent = () => setStudents([...students, ""])
  const removeStudent = (index: number) => setStudents(students.filter((_, i) => i !== index))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("")
    if (!form.school_name.trim() || !form.grade_level.trim() || !form.class_name.trim()) {
      setError("SCHOOL NAME, GRADE LEVEL, AND CLASS NAME ARE REQUIRED."); return
    }
    setLoading(true)
    try {
      const res = await fetch("http://localhost:4000/api/classes/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_name: form.school_name, grade_level: Number(form.grade_level), class_name: form.class_name, subjects, student_usernames: students.filter(s => s.trim()) })
      })
      const data = await res.json()
      if (!res.ok) { setError((data.error || data.message || "SOMETHING WENT WRONG").toUpperCase()); return }
      setSuccess("CLASS CREATED SUCCESSFULLY.")
      setForm({ school_name: "", grade_level: "", class_name: "" })
      setSubjects([{ subject_id: "", teacher_username: "" }])
      setStudents([""])
      setAvailableSubjects([])
      router.push("/admin/dashboard")
    } catch { setError("SOMETHING WENT WRONG. PLEASE TRY AGAIN.") }
    finally { setLoading(false) }
  }

  const accent = "#ffa500"
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", fontSize: 12,
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
    background: "rgba(255,255,255,0.04)", color: "#e8e8f0",
    fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.04em",
  }
  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "none" as React.CSSProperties["appearance"], cursor: "pointer" }

  return (
    <div style={{ minHeight: "100vh", background: "#7a59af", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem", fontFamily: "'Exo 2', sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(255,165,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,165,0,0.05) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 0%, rgba(255,165,0,0.08) 0%, transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 600, animation: "mc-fadein 0.3s ease" }}>
        <Link href="/admin/dashboard" className="mc-back" style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em", transition: "color 0.15s" }}>
          ← BACK TO DASHBOARD
        </Link>

        <div style={{ background: "rgba(10,10,26,0.7)", backdropFilter: "blur(16px)", borderRadius: 16, border: `1px solid ${accent}44`, padding: "2rem", boxShadow: `0 0 40px ${accent}15, 0 24px 48px rgba(0,0,0,0.4)` }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "2rem" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${accent}18`, border: `1px solid ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>▣</div>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: accent, letterSpacing: "0.08em", animation: "mc-glow 3s ease-in-out infinite" }}>CREATE CLASS</div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginTop: 5 }}>PLAY & LEARN · ADMIN PANEL</div>
            </div>
          </div>

          {/* Basic info — 2 col grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontFamily: "'Orbitron', monospace", fontSize: 8, color: `${accent}88`, letterSpacing: "0.15em", marginBottom: 7 }}>SCHOOL NAME</label>
              <input name="school_name" value={form.school_name} onChange={handleFormChange} placeholder="e.g. GUC" className="mc-input" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: "'Orbitron', monospace", fontSize: 8, color: `${accent}88`, letterSpacing: "0.15em", marginBottom: 7 }}>GRADE LEVEL</label>
              <input name="grade_level" value={form.grade_level} onChange={handleFormChange} placeholder="e.g. 10" type="number" className="mc-input" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={{ display: "block", fontFamily: "'Orbitron', monospace", fontSize: 8, color: `${accent}88`, letterSpacing: "0.15em", marginBottom: 7 }}>CLASS NAME</label>
            <input name="class_name" value={form.class_name} onChange={handleFormChange} placeholder="e.g. A, B, C" className="mc-input" style={inputStyle} />
          </div>

          {/* Subjects & Teachers */}
          <SectionDivider label="SUBJECTS & TEACHERS" accent={accent} />
          {!form.grade_level && (
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em", marginBottom: 12 }}>ENTER A GRADE LEVEL ABOVE TO LOAD AVAILABLE SUBJECTS.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {subjects.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                <select value={s.subject_id} onChange={e => handleSubjectChange(i, "subject_id", e.target.value)} className="mc-select" style={selectStyle}>
                  <option value="">SELECT SUBJECT</option>
                  {availableSubjects.map(sub => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
                </select>
                <select value={s.teacher_username} onChange={e => handleTeacherChange(i, e.target.value)} className="mc-select" style={selectStyle}>
                  <option value="">SELECT TEACHER</option>
                  {teachers.map(t => <option key={t._id} value={t.username}>{t.username}</option>)}
                </select>
                <button type="button" onClick={() => removeSubject(i)} className="mc-remove-btn"
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addSubject} className="mc-add-btn"
            style={{ fontSize: 9, fontWeight: 600, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em", color: accent, background: `${accent}12`, border: `1px solid ${accent}44`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", marginBottom: 4, transition: "all 0.15s" }}>
            + ADD SUBJECT ROW
          </button>

          {/* Students */}
          <SectionDivider label="STUDENTS" accent={accent} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {students.map((student, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: `${accent}12`, border: `1px solid ${accent}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: accent, flexShrink: 0, fontFamily: "'Orbitron', monospace" }}>
                  {i + 1}
                </div>
                <input value={student} onChange={e => handleStudentChange(i, e.target.value)} placeholder={`Student ${i + 1} username`} className="mc-input" style={{ ...inputStyle, flex: 1 }} />
                {students.length > 1 && (
                  <button type="button" onClick={() => removeStudent(i)} className="mc-remove-btn"
                    style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addStudent} className="mc-add-btn"
            style={{ fontSize: 9, fontWeight: 600, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em", color: accent, background: `${accent}12`, border: `1px solid ${accent}44`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", marginBottom: 4, transition: "all 0.15s" }}>
            + ADD STUDENT
          </button>

          {/* Messages */}
          {error && (
            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(255,80,60,0.1)", border: "1px solid rgba(255,80,60,0.35)", color: "#ff503c", fontSize: 10, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em" }}>
              ⚠ {error}
            </div>
          )}
          {success && (
            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88", fontSize: 10, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em" }}>
              ✓ {success}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className="mc-submit"
            style={{ width: "100%", padding: "12px", marginTop: 20, borderRadius: 8, border: `1px solid ${accent}55`, background: loading ? "rgba(255,255,255,0.05)" : `${accent}20`, color: loading ? "rgba(255,255,255,0.2)" : accent, fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><div style={{ width: 12, height: 12, border: `2px solid ${accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "mc-spinner 0.7s linear infinite" }} />CREATING…</> : "CREATE CLASS"}
          </button>
        </div>
      </div>
    </div>
  )
}