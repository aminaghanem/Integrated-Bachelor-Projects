"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"

const API = "http://localhost:4000"

type Section = "overview" | "students" | "teachers" | "parents" | "classes" | "subjects" | "admins" | "policies" | "create"

interface Student {
  _id: string
  username: string
  full_name: string
  preferred_language: string
  personal_email: string
  date_of_birth: string
  class_id?: string
  context?: { region: string; school_type: string }
}

interface Subject {
  _id: string
  name: string
  category: string
}

interface Teacher {
  _id: string
  username: string
  email: string
  created_at: string
  teachable_subjects?: Subject[]
}

interface Parent {
  _id: string
  username: string
  email: string
  relationship_type: string
  children_ids: { _id: string; username: string; full_name: string }[]
}

// ── Global styles ───────────────────────────────────────────────
const ADMIN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@400;600;700&display=swap');

  .ad-nav-btn:hover {
    background: rgba(255,230,0,0.12) !important;
    border-left-color: #ffe600 !important;
    color: #ffe600 !important;
  }
  .ad-row:hover { background: rgba(255,255,255,0.03) !important; }
  .ad-stat-card:hover {
    border-color: rgba(255,230,0,0.3) !important;
    box-shadow: 0 0 16px rgba(255,230,0,0.08) !important;
  }
  .ad-action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
  .ad-create-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
  }
  .ad-nav-main-btn:hover {
    background: rgba(255,230,0,0.12) !important;
    border-color: #ffe600 !important;
    color: #ffe600 !important;
    transform: translateY(-1px);
    box-shadow: 2px 4px 0 #3d2c1e !important;
  }
  @keyframes ad-spinner { to { transform: rotate(360deg); } }
  @keyframes ad-fadein {
    from { opacity:0; transform:translateY(6px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes ad-hud-glow {
    0%,100% { text-shadow: 0 0 8px rgba(255,230,0,0.4); }
    50%      { text-shadow: 0 0 20px rgba(255,230,0,0.8), 0 0 40px rgba(255,230,0,0.3); }
  }
  @keyframes ad-blink {
    0%,100% { opacity:1; }
    50%      { opacity:0.3; }
  }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
  ::-webkit-scrollbar-thumb { background: rgba(255,230,0,0.2); border-radius: 3px; }
`

// ── Shared retro button ─────────────────────────────────────────
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

// ── Section colors ──────────────────────────────────────────────
const sectionColor: Record<string, string> = {
  students: "#5b8dee",
  teachers: "#cb6ce6",
  parents:  "#00ff88",
  classes:  "#f59e0b",
  subjects: "#ff9f43",
  admins:   "#6366f1",
  policies: "#ec4899",
}

function getSectionColor(sec: string) {
  return sectionColor[sec] ?? "#ffe600"
}

// ── Sub-components ──────────────────────────────────────────────
function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: string }) {
  return (
    <div className="ad-stat-card" style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: "16px 20px",
      borderLeft: `3px solid ${color}`,
      transition: "all 0.2s",
    }}>
      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "rgba(255,230,0,0.5)", letterSpacing: "0.12em", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 700, color: "#e8e8f0" }}>{value}</span>
      </div>
    </div>
  )
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      padding: "3px 12px", borderRadius: 20, fontSize: 10, fontWeight: 600,
      fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em",
      background: color + "22", color, border: `1px solid ${color}44`,
    }}>{text.toUpperCase()}</span>
  )
}

function ActionBtn({ label, color, onClick, fontColor }: { label: string; color: string; onClick: () => void; fontColor?: string }) {
  return (
    <button className="ad-action-btn" onClick={onClick} style={{
      padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
      border: `1px solid ${color}55`, background: color + "18", color: fontColor || color,
      fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.04em",
      marginRight: 5, transition: "all 0.15s",
    }}>{label}</button>
  )
}

function InitialAvatar({ initial, color }: { initial: string; color: string }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
      background: color + "22", border: `1px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, color, fontFamily: "'Orbitron', monospace",
    }}>{initial}</div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#0d0a1a",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        width: "100%", maxWidth: 580, maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)",
          position: "sticky", top: 0, background: "#0d0a1a", zIndex: 1,
        }}>
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#ffe600", fontFamily: "'Orbitron', monospace", letterSpacing: "0.1em" }}>{title.toUpperCase()}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
        </div>
        <div style={{ padding: "1.5rem" }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", minWidth: 140, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#e8e8f0", textAlign: "right", wordBreak: "break-all", fontFamily: "'Exo 2', sans-serif" }}>{value ?? "—"}</span>
    </div>
  )
}

function EditField({ label, name, value, onChange, type = "text" }: {
  label: string; name: string; value: string;
  onChange: (n: string, v: string) => void; type?: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 10, color: "rgba(255,230,0,0.5)", marginBottom: 5, fontFamily: "'Orbitron', monospace", letterSpacing: "0.08em" }}>{label.toUpperCase()}</label>
      <input
        type={type} value={value} onChange={e => onChange(name, e.target.value)}
        style={{
          width: "100%", padding: "9px 12px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8, color: "#e8e8f0",
          fontSize: 13, outline: "none", boxSizing: "border-box",
          fontFamily: "'Share Tech Mono', monospace",
        }}
      />
    </div>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{
      margin: "20px 0 10px", fontSize: 9, fontWeight: 700,
      color: "rgba(255,230,0,0.5)",
      textTransform: "uppercase", letterSpacing: "0.12em",
      borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16,
      fontFamily: "'Orbitron', monospace",
    }}>{text}</p>
  )
}

// ── Table helpers ───────────────────────────────────────────────
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse" }
const thStyle: React.CSSProperties = {
  padding: "10px 14px", textAlign: "left",
  fontFamily: "'Orbitron', monospace", fontWeight: 600,
  color: "rgba(255,230,0,0.5)", fontSize: 9,
  letterSpacing: "0.1em", whiteSpace: "nowrap",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.03)",
}
const tdStyle: React.CSSProperties = {
  padding: "11px 14px", fontSize: 12, color: "#e8e8f0",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  fontFamily: "'Exo 2', sans-serif",
}

const TableWrap = ({ children }: { children: React.ReactNode }) => (
  <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", animation: "ad-fadein 0.2s ease" }}>
    <table style={tableStyle}>{children}</table>
  </div>
)

// ── SelectInput ─────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  flex: 1, padding: "8px 10px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, color: "#e8e8f0",
  fontSize: 12, outline: "none",
  fontFamily: "'Share Tech Mono', monospace",
}

// ── Main component ──────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter()
  const [section, setSection] = useState<Section>("overview")
  const [dateStr, setDateStr] = useState("")

  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [parents, setParents] = useState<Parent[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [admins, setAdmins] = useState<any[]>([])
  const [allSubjects, setAllSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)

  const [viewTarget, setViewTarget] = useState<{ type: string; data: Record<string, unknown> } | null>(null)
  const [editTarget, setEditTarget] = useState<{ type: string; id: string } | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([])
  const [addingSubjectId, setAddingSubjectId] = useState("")

  const [parentChildren, setParentChildren] = useState<{ _id: string; username: string; full_name: string }[]>([])
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])
  const [addingChildId, setAddingChildId] = useState("")

  const [classSubjects, setClassSubjects] = useState<Subject[]>([])
  const [classTeachers, setClassTeachers] = useState<Teacher[]>([])
  const [classStudents, setClassStudents] = useState<Student[]>([])
  const [availableSubjectsForClass, setAvailableSubjectsForClass] = useState<Subject[]>([])
  const [availableTeachersForClass, setAvailableTeachersForClass] = useState<Teacher[]>([])
  const [availableStudentsForClass, setAvailableStudentsForClass] = useState<Student[]>([])
  const [addingClassSubjectId, setAddingClassSubjectId] = useState("")
  const [addingClassTeacherId, setAddingClassTeacherId] = useState("")
  const [addingClassStudentId, setAddingClassStudentId] = useState("")

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const el = document.createElement("style")
    el.textContent = ADMIN_STYLES
    document.head.appendChild(el)
    return () => { document.head.removeChild(el) }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/"); return }
  }, [router])

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    }))
  }, [])

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
  }), [])

  const fetchData = useCallback(async (sec: Section) => {
    setLoading(true)
    try {
      if (sec === "students" || sec === "overview") {
        const r = await fetch(`${API}/api/students`, { headers: authHeaders() })
        if (r.ok) setStudents(await r.json())
      }
      if (sec === "teachers" || sec === "overview") {
        const r = await fetch(`${API}/api/teachers`, { headers: authHeaders() })
        if (r.ok) setTeachers(await r.json())
      }
      if (sec === "parents" || sec === "overview") {
        const r = await fetch(`${API}/api/parents`, { headers: authHeaders() })
        if (r.ok) setParents(await r.json())
      }
      if (sec === "classes") {
        const r = await fetch(`${API}/api/classes`, { headers: authHeaders() })
        if (r.ok) setClasses(await r.json())
      }
      if (sec === "subjects") {
        const r = await fetch(`${API}/api/subjects`, { headers: authHeaders() })
        if (r.ok) setSubjects(await r.json())
      }
      if (sec === "admins") {
        const r = await fetch(`${API}/api/admins`, { headers: authHeaders() })
        if (r.ok) setAdmins(await r.json())
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [authHeaders])

  const fetchSubjects = useCallback(async () => {
    const r = await fetch(`${API}/api/teachers/subjects/all`, { headers: authHeaders() })
    if (r.ok) setAllSubjects(await r.json())
  }, [authHeaders])

  const fetchClassData = useCallback(async (classId: string) => {
    try {
      const r = await fetch(`${API}/api/classes/${classId}`, { headers: authHeaders() })
      if (r.ok) {
        const cls = await r.json()
        setClassSubjects(cls.subjects?.map((s: any) => s.subject).filter(Boolean) ?? [])
        setClassTeachers(cls.subjects?.map((s: any) => s.teacher_id).filter(Boolean) ?? [])
        const classStudentIds = cls.students?.filter(Boolean) ?? []
        const fullStudents = classStudentIds.map((id: string) => students.find(s => s._id === id)).filter(Boolean)
        setClassStudents(fullStudents)
      }
      setAvailableSubjectsForClass(allSubjects)
      setAvailableTeachersForClass(teachers)
      setAvailableStudentsForClass(students)
    } catch { /* silent */ }
  }, [allSubjects, teachers, students, authHeaders])

  useEffect(() => { fetchData(section) }, [section, fetchData])

  const handleLogout = () => { localStorage.removeItem("token"); router.push("/") }

  const openEdit = async (type: string, id: string, data: Record<string, unknown>) => {
    const flat: Record<string, string> = {}
    for (const k in data) {
      const v = data[k]
      if (typeof v === "string" || typeof v === "number") flat[k] = String(v ?? "")
    }
    setEditTarget({ type, id })
    setEditForm(flat)
    setSaveMsg(null)

    if (type === "teacher") {
      await fetchSubjects()
      const teacher = teachers.find(t => t._id === id)
      setTeacherSubjects((teacher?.teachable_subjects ?? []).map(s => (typeof s === "object" ? s._id : String(s))))
      setAddingSubjectId("")
    }
    if (type === "parent") {
      const parent = parents.find(p => p._id === id)
      setParentChildren(parent?.children_ids ?? [])
      const rel = parent?.relationship_type ?? "father"
      const r = await fetch(`${API}/api/parents/available-students/${rel}`, { headers: authHeaders() })
      if (r.ok) setAvailableStudents(await r.json())
      setAddingChildId("")
    }
    if (type === "class") {
      await fetchSubjects()
      await fetchClassData(id)
      setAddingClassSubjectId("")
      setAddingClassTeacherId("")
      setAddingClassStudentId("")
    }
  }

  const handleEditChange = (name: string, value: string) =>
    setEditForm(prev => ({ ...prev, [name]: value }))

  const handleSave = async () => {
    if (!editTarget) return
    setSaving(true)
    const map: Record<string, string> = { student: "students", teacher: "teachers", parent: "parents", class: "classes", subject: "subjects", admin: "admins" }
    try {
      let body: Record<string, unknown> = { ...editForm }
      if (editTarget.type === "class") {
        body = {
          ...editForm,
          subjects: classSubjects.map((subj, i) => ({ subject: subj._id, teacher_id: classTeachers[i]?._id ?? null })),
          students: classStudents.map(s => s._id),
        }
      }
      const res = await fetch(`${API}/api/${map[editTarget.type]}/${editTarget.id}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setSaveMsg("SAVED!")
      await fetchData(section)
      setTimeout(() => setSaveMsg(null), 2500)
    } catch { setSaveMsg("SAVE FAILED.") }
    setSaving(false)
  }

  const handleAddSubject = async () => {
    if (!editTarget || !addingSubjectId) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/teachers/${editTarget.id}/subjects`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ subject_id: addingSubjectId }),
      })
      if (!res.ok) throw new Error()
      setTeacherSubjects(prev => [...prev, addingSubjectId])
      setAddingSubjectId("")
      setSaveMsg("SUBJECT ADDED!")
      await fetchData(section)
      setTimeout(() => setSaveMsg(null), 2000)
    } catch { setSaveMsg("FAILED TO ADD.") }
    setSaving(false)
  }

  const handleRemoveSubject = async (subjectId: string) => {
    if (!editTarget) return
    try {
      const res = await fetch(`${API}/api/teachers/${editTarget.id}/subjects/${subjectId}`, {
        method: "DELETE", headers: authHeaders(),
      })
      if (!res.ok) throw new Error()
      setTeacherSubjects(prev => prev.filter(s => s !== subjectId))
      await fetchData(section)
    } catch { setSaveMsg("FAILED TO REMOVE.") }
  }

  const handleAddChild = async () => {
    if (!editTarget || !addingChildId) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/parents/${editTarget.id}/children`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ student_id: addingChildId }),
      })
      if (!res.ok) throw new Error()
      const added = availableStudents.find(s => s._id === addingChildId)
      if (added) setParentChildren(prev => [...prev, { _id: added._id, username: added.username, full_name: added.full_name }])
      setAvailableStudents(prev => prev.filter(s => s._id !== addingChildId))
      setAddingChildId("")
      setSaveMsg("CHILD LINKED!")
      await fetchData(section)
      setTimeout(() => setSaveMsg(null), 2000)
    } catch { setSaveMsg("FAILED TO LINK.") }
    setSaving(false)
  }

  const handleRemoveChild = async (childId: string) => {
    if (!editTarget) return
    try {
      const res = await fetch(`${API}/api/parents/${editTarget.id}/children/${childId}`, {
        method: "DELETE", headers: authHeaders(),
      })
      if (!res.ok) throw new Error()
      const removed = parentChildren.find(c => c._id === childId)
      setParentChildren(prev => prev.filter(c => c._id !== childId))
      if (removed) setAvailableStudents(prev => [...prev, removed as Student])
    } catch { setSaveMsg("FAILED TO UNLINK.") }
  }

  const handleDelete = async (type: string, id: string) => {
    if (!confirm(`Delete this ${type}? This cannot be undone.`)) return
    const map: Record<string, string> = { student: "students", teacher: "teachers", parent: "parents", class: "classes", subject: "subjects", admin: "admins" }
    await fetch(`${API}/api/${map[type]}/${id}`, { method: "DELETE", headers: authHeaders() })
    fetchData(section)
  }

  const filteredStudents = students.filter(s =>
    s.username?.toLowerCase().includes(search.toLowerCase()) ||
    s.full_name?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredTeachers = teachers.filter(t =>
    t.username?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredParents = parents.filter(p =>
    p.username?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  )

  const navItems: { key: Section; label: string; icon: string }[] = [
    { key: "overview",  label: "Overview",  icon: "◈" },
    { key: "students",  label: "Students",  icon: "⊙" },
    { key: "teachers",  label: "Teachers",  icon: "⊕" },
    { key: "parents",   label: "Parents",   icon: "⊗" },
    { key: "classes",   label: "Classes",   icon: "▣" },
    { key: "subjects",  label: "Subjects",  icon: "◎" },
    { key: "admins",    label: "Admins",    icon: "⚑" },
    { key: "policies",  label: "Policies",  icon: "⚖" },
    { key: "create",    label: "Create",    icon: "⊞" },
  ]

  // ── Small inline add-pill button ────────────────────────────
  const addPillBtn = (color: string, label: string, onClick: () => void, disabled?: boolean): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 8, fontSize: 10, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s",
    background: color + "22", border: `1px solid ${color}55`, color,
    fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em",
    opacity: disabled ? 0.5 : 1,
  })

  return (
    <div style={{
      minHeight: "100vh",
      background: "#7a59af",
      color: "#e8e8f0",
      fontFamily: "'Exo 2', sans-serif",
      position: "relative",
      overflow: "hidden",
      display: "flex",
    }}>
      {/* Grid bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `linear-gradient(rgba(255,230,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,230,0,0.04) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(255,230,0,0.08) 0%, transparent 60%)" }} />

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside style={{
        width: 220, minHeight: "100vh",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(10,10,26,0.65)",
        backdropFilter: "blur(12px)",
        padding: "1.5rem 0",
        flexShrink: 0,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: "0 1.25rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,230,0,0.1)", border: "1px solid rgba(255,230,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚙</div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#ffe600", fontFamily: "'Orbitron', monospace", letterSpacing: "0.06em" }}>PLAY & LEARN</p>
              <p style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'Share Tech Mono', monospace" }}>ADMIN PANEL</p>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "0 0 0.75rem" }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 0.75rem" }}>
          {navItems.map(item => {
            const isActive = section === item.key
            const col = getSectionColor(item.key)
            return (
              <button key={item.key} className="ad-nav-btn" onClick={() => { setSection(item.key); setSearch("") }} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 12px", marginBottom: 2, borderRadius: 8, border: "none",
                cursor: "pointer", textAlign: "left",
                fontFamily: "'Share Tech Mono', monospace", fontSize: 15,
                letterSpacing: "0.06em",
                background: isActive ? col + "18" : "transparent",
                color: isActive ? col : "rgba(255,255,255,0.45)",
                borderLeft: isActive ? `2px solid ${col}` : "2px solid transparent",
                transition: "all 0.2s",
              }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label.toUpperCase()}
              </button>
            )
          })}
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "0.75rem 0" }} />
        <div style={{ padding: "0 0.75rem" }}>
          <button onClick={handleLogout} className="ad-nav-btn" style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: "0.06em",
            color: "#ff5050", background: "rgba(255,80,80,0.1)", borderLeft: "2px solid transparent",
            transition: "all 0.2s",
          }}>
            <span>⏻</span> LOGOUT
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "20px 28px", overflowY: "auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,230,0,0.1)", border: "1px solid rgba(255,230,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🛡️</div> */}
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontWeight: 900, fontSize: 20, color: "#ffe600", letterSpacing: "0.08em" }}>
                ADMIN PORTAL
              </div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", marginTop: 4 }}>
                {navItems.find(n => n.key === section)?.icon} <span style={{ color: getSectionColor(section) }}>{section.toUpperCase()}</span> · {dateStr}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ad-nav-main-btn" onClick={() => setSection("overview")} style={{ ...mcBtn }}>
              <span style={{ fontSize: 16 }}>⌂</span>HOME
            </button>
            <button className="ad-nav-main-btn" onClick={handleLogout} style={{ ...mcBtn }}>
              <span style={{ fontSize: 16 }}>⏻</span>LOGOUT
            </button>
          </div>
        </header>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", fontFamily: "'Share Tech Mono', monospace", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
            <div style={{ width: 16, height: 16, border: "2px solid #ffe600", borderTopColor: "transparent", borderRadius: "50%", animation: "ad-spinner 0.7s linear infinite" }} />
            LOADING…
          </div>
        )}

        {/* ── Overview ─────────────────────────────────────── */}
        {section === "overview" && !loading && (
          <div style={{ animation: "ad-fadein 0.2s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: "2rem" }}>
              <StatCard label="TOTAL STUDENTS" value={students.length} color="#5b8dee" icon="⊙" />
              <StatCard label="TOTAL TEACHERS" value={teachers.length} color="#cb6ce6" icon="⊕" />
              <StatCard label="TOTAL PARENTS"  value={parents.length}  color="#00ff88" icon="⊗" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Recent Students */}
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ margin: 0, fontFamily: "'Orbitron', monospace", fontWeight: 600, fontSize: 9, color: "rgba(255,230,0,0.6)", letterSpacing: "0.12em" }}>RECENT STUDENTS</p>
                  <button onClick={() => setSection("students")} style={{ background: "none", border: "none", color: "#5b8dee", cursor: "pointer", fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}>VIEW ALL →</button>
                </div>
                {students.slice(0, 5).map(s => (
                  <div key={s._id} className="ad-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}>
                    <InitialAvatar initial={(s.full_name || s.username || "?").charAt(0).toUpperCase()} color="#5b8dee" />
                    <div>
                      <p style={{ margin: 0, fontSize: 12, color: "#e8e8f0", fontFamily: "'Exo 2', sans-serif" }}>{s.full_name || s.username}</p>
                      <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Share Tech Mono', monospace" }}>@{s.username}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Teachers */}
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ margin: 0, fontFamily: "'Orbitron', monospace", fontWeight: 600, fontSize: 9, color: "rgba(255,230,0,0.6)", letterSpacing: "0.12em" }}>RECENT TEACHERS</p>
                  <button onClick={() => setSection("teachers")} style={{ background: "none", border: "none", color: "#cb6ce6", cursor: "pointer", fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}>VIEW ALL →</button>
                </div>
                {teachers.slice(0, 5).map(t => (
                  <div key={t._id} className="ad-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}>
                    <InitialAvatar initial={(t.username || "?").charAt(0).toUpperCase()} color="#cb6ce6" />
                    <div>
                      <p style={{ margin: 0, fontSize: 12, color: "#e8e8f0", fontFamily: "'Exo 2', sans-serif" }}>{t.username}</p>
                      <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Share Tech Mono', monospace" }}>{t.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Search bar ───────────────────────────────────── */}
        {(section === "students" || section === "teachers" || section === "parents") && (
          <div style={{ marginBottom: "1.25rem" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`SEARCH ${section.toUpperCase()}…`}
              style={{
                width: 320, padding: "9px 14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8, color: "#fff", fontSize: 12, outline: "none",
                fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em",
              }}
            />
          </div>
        )}

        {/* ── Students ─────────────────────────────────────── */}
        {section === "students" && !loading && (
          <TableWrap>
            <thead><tr>{["STUDENT", "USERNAME", "LANGUAGE", "REGION", "ACTIONS"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {filteredStudents.map(s => (
                <tr key={s._id} className="ad-row" style={{ transition: "background 0.15s" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <InitialAvatar initial={(s.full_name || s.username || "?").charAt(0).toUpperCase()} color="#5b8dee" />
                      {s.full_name || "—"}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: "rgba(255,255,255,0.45)", fontFamily: "'Share Tech Mono', monospace" }}>@{s.username}</td>
                  <td style={tdStyle}>{s.preferred_language || "—"}</td>
                  <td style={tdStyle}>{s.context?.region || "—"}</td>
                  <td style={tdStyle}>
                    <ActionBtn label="VIEW"   color="#58d76e" onClick={() => setViewTarget({ type: "Student", data: s as unknown as Record<string, unknown> })} />
                    <ActionBtn label="EDIT"  fontColor="#fff" color="#cb6ce6" onClick={() => openEdit("student", s._id, s as unknown as Record<string, unknown>)} />
                    <ActionBtn label="DELETE" color="#ff5050" onClick={() => handleDelete("student", s._id)} />
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "rgba(255,255,255,0.2)", padding: "2rem", fontFamily: "'Share Tech Mono', monospace" }}>NO STUDENTS FOUND</td></tr>}
            </tbody>
          </TableWrap>
        )}

        {/* ── Teachers ─────────────────────────────────────── */}
        {section === "teachers" && !loading && (
          <TableWrap>
            <thead><tr>{["TEACHER", "EMAIL", "JOINED", "ACTIONS"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {filteredTeachers.map(t => (
                <tr key={t._id} className="ad-row" style={{ transition: "background 0.15s" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <InitialAvatar initial={(t.username || "?").charAt(0).toUpperCase()} color="#cb6ce6" />
                      {t.username}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: "rgba(255,255,255,0.45)", fontFamily: "'Share Tech Mono', monospace" }}>{t.email}</td>
                  <td style={{ ...tdStyle, color: "rgba(255,255,255,0.45)", fontFamily: "'Share Tech Mono', monospace" }}>{t.created_at ? new Date(t.created_at).toLocaleDateString("en-GB") : "—"}</td>
                  <td style={tdStyle}>
                    <ActionBtn label="VIEW"   color="#58d76e" onClick={() => setViewTarget({ type: "Teacher", data: t as unknown as Record<string, unknown> })} />
                    <ActionBtn label="EDIT"   fontColor="#fff" color="#cb6ce6" onClick={() => openEdit("teacher", t._id, t as unknown as Record<string, unknown>)} />
                    <ActionBtn label="DELETE" color="#ff5050" onClick={() => handleDelete("teacher", t._id)} />
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "rgba(255,255,255,0.2)", padding: "2rem", fontFamily: "'Share Tech Mono', monospace" }}>NO TEACHERS FOUND</td></tr>}
            </tbody>
          </TableWrap>
        )}

        {/* ── Parents ──────────────────────────────────────── */}
        {section === "parents" && !loading && (
          <TableWrap>
            <thead><tr>{["PARENT", "EMAIL", "ROLE", "CHILDREN", "ACTIONS"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {filteredParents.map(p => (
                <tr key={p._id} className="ad-row" style={{ transition: "background 0.15s" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <InitialAvatar initial={(p.username || "?").charAt(0).toUpperCase()} color="#00ff88" />
                      {p.username}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: "rgba(255,255,255,0.45)", fontFamily: "'Share Tech Mono', monospace" }}>{p.email}</td>
                  <td style={tdStyle}><Badge text={p.relationship_type} color="#00ff88" /></td>
                  <td style={{ ...tdStyle, color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
                    {p.children_ids?.length > 0 ? p.children_ids.map(c => c.full_name || c.username).join(", ") : "—"}
                  </td>
                  <td style={tdStyle}>
                    <ActionBtn label="VIEW"   color="#58d76e" onClick={() => setViewTarget({ type: "Parent", data: p as unknown as Record<string, unknown> })} />
                    <ActionBtn label="EDIT"   fontColor="#fff" color="#cb6ce6" onClick={() => openEdit("parent", p._id, p as unknown as Record<string, unknown>)} />
                    <ActionBtn label="DELETE" color="#ff5050" onClick={() => handleDelete("parent", p._id)} />
                  </td>
                </tr>
              ))}
              {filteredParents.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "rgba(255,255,255,0.2)", padding: "2rem", fontFamily: "'Share Tech Mono', monospace" }}>NO PARENTS FOUND</td></tr>}
            </tbody>
          </TableWrap>
        )}

        {/* ── Classes ──────────────────────────────────────── */}
        {section === "classes" && !loading && (
          <TableWrap>
            <thead><tr>{["CLASS", "GRADE", "SCHOOL", "ACTIONS"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {classes.map(c => (
                <tr key={c._id} className="ad-row" style={{ transition: "background 0.15s" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <InitialAvatar initial={c.class_name?.charAt(0).toUpperCase() ?? "C"} color="#f59e0b" />
                      {c.class_name}
                    </div>
                  </td>
                  <td style={tdStyle}><Badge text={`GR. ${c.grade_level}`} color="#f59e0b" /></td>
                  <td style={{ ...tdStyle, color: "rgba(255,255,255,0.45)" }}>{c.school_name}</td>
                  <td style={tdStyle}>
                    <ActionBtn label="VIEW"   color="#58d76e" onClick={() => setViewTarget({ type: "Class", data: c as unknown as Record<string, unknown> })} />
                    <ActionBtn label="EDIT"   fontColor="#fff" color="#cb6ce6" onClick={() => openEdit("class", c._id, c)} />
                    <ActionBtn label="DELETE" color="#ff5050" onClick={() => handleDelete("class", c._id)} />
                  </td>
                </tr>
              ))}
              {classes.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "rgba(255,255,255,0.2)", padding: "2rem", fontFamily: "'Share Tech Mono', monospace" }}>NO CLASSES FOUND</td></tr>}
            </tbody>
          </TableWrap>
        )}

        {/* ── Subjects ─────────────────────────────────────── */}
        {section === "subjects" && !loading && (
          <TableWrap>
            <thead><tr>{["SUBJECT", "CATEGORY", "ACTIONS"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s._id} className="ad-row" style={{ transition: "background 0.15s" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <InitialAvatar initial={s.name?.charAt(0).toUpperCase() ?? "S"} color="#ff9f43" />
                      {s.name}
                    </div>
                  </td>
                  <td style={tdStyle}><Badge text={s.category} color="#ff9f43" /></td>
                  <td style={tdStyle}>
                    <ActionBtn label="VIEW"   color="#58d76e" onClick={() => setViewTarget({ type: "Subject", data: s as unknown as Record<string, unknown> })} />
                    <ActionBtn label="EDIT"   fontColor="#fff" color="#cb6ce6" onClick={() => openEdit("subject", s._id, s)} />
                    <ActionBtn label="DELETE" color="#ff5050" onClick={() => handleDelete("subject", s._id)} />
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && <tr><td colSpan={3} style={{ ...tdStyle, textAlign: "center", color: "rgba(255,255,255,0.2)", padding: "2rem", fontFamily: "'Share Tech Mono', monospace" }}>NO SUBJECTS FOUND</td></tr>}
            </tbody>
          </TableWrap>
        )}

        {/* ── Admins ───────────────────────────────────────── */}
        {section === "admins" && !loading && (
          <TableWrap>
            <thead><tr>{["ADMIN", "ACTIONS"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {admins.map(a => (
                <tr key={a._id} className="ad-row" style={{ transition: "background 0.15s" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <InitialAvatar initial={(a.username || "?").charAt(0).toUpperCase()} color="#6366f1" />
                      {a.username}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <ActionBtn label="VIEW"   color="#58d76e" onClick={() => setViewTarget({ type: "Admin", data: a as unknown as Record<string, unknown> })} />
                    <ActionBtn label="DELETE" color="#ff5050" onClick={() => handleDelete("admin", a._id)} />
                  </td>
                </tr>
              ))}
              {admins.length === 0 && <tr><td colSpan={2} style={{ ...tdStyle, textAlign: "center", color: "rgba(255,255,255,0.2)", padding: "2rem", fontFamily: "'Share Tech Mono', monospace" }}>NO ADMINS FOUND</td></tr>}
            </tbody>
          </TableWrap>
        )}

        {/* ── Policies ─────────────────────────────────────── */}
        {section === "policies" && (
          <div style={{ animation: "ad-fadein 0.2s ease" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1.5rem 1.75rem", maxWidth: 1500 }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "rgba(255,230,0,0.5)", letterSpacing: "0.12em", marginBottom: 12 }}>POLICY MANAGER</div>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 20, fontFamily: "'Exo 2', sans-serif", lineHeight: 1.7, margin: "0 0 20px" }}>
                The Policy Manager is a desktop application for creating and managing AI policies for your school. Define rules, restrictions, and guidelines to ensure a safe environment for students and staff.
              </p>
              <button onClick={async () => {
                try {
                  const res = await fetch(`${API}/api/policies/launch-gui`, { method: "POST", headers: authHeaders() })
                  const data = await res.json().catch(() => ({ error: "Server error" }))
                  if (!res.ok) alert(`Failed to launch Policy Manager:\n\n${data.detail || data.error || "Unknown error"}`)
                  else alert("Policy Manager launched successfully!")
                } catch (e) { console.error("Launch error:", e) }
              }} style={{
                padding: "10px 22px", background: "rgba(236,72,153,0.15)", color: "#ec4899",
                border: "1px solid rgba(236,72,153,0.4)", borderRadius: 8, fontSize: 15,
                fontWeight: 600, cursor: "pointer", fontFamily: "'Share Tech Mono', monospace",
                letterSpacing: "0.06em", transition: "all 0.15s",
              }}>
                🖥️ OPEN POLICY MANAGER
              </button>
            </div>
          </div>
        )}

        {/* ── Create ───────────────────────────────────────── */}
        {section === "create" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 700, animation: "ad-fadein 0.2s ease" }}>
            {[
              { label: "New Student", href: "/admin/create-student", color: "#5b8dee", icon: "⊙" },
              { label: "New Teacher", href: "/admin/create-teacher", color: "#cb6ce6", icon: "⊕" },
              { label: "New Parent",  href: "/admin/create-parent",  color: "#00ff88", icon: "⊗" },
              { label: "New Subject", href: "/admin/create-subject", color: "#ff9f43", icon: "◎" },
              { label: "New Class",   href: "/admin/create-class",   color: "#f59e0b", icon: "⊞" },
              { label: "New Admin",   href: "/admin/create-admin",   color: "#6366f1", icon: "⚑" },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div className="ad-create-card" style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${item.color}33`,
                  borderTop: `3px solid ${item.color}`,
                  borderRadius: 12, padding: "1.5rem",
                  cursor: "pointer", transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 26, marginBottom: 10, color: item.color }}>{item.icon}</div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: "#e8e8f0", fontFamily: "'Orbitron', monospace", letterSpacing: "0.06em" }}>{item.label.toUpperCase()}</p>
                  <p style={{ margin: "6px 0 0", fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Share Tech Mono', monospace" }}>CREATE NEW RECORD →</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* ── View Modal ───────────────────────────────────────── */}
      {viewTarget && (
        <Modal title={`${viewTarget.type} Profile`} onClose={() => setViewTarget(null)}>
          {Object.entries(viewTarget.data)
            .filter(([k]) => !["password_hash","__v","teaching_assignments","teachable_subjects","children_ids","interests","learning_history","proficiency_levels","accessibility"].includes(k))
            .map(([key, val]) => (
              <Field key={key}
                label={key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                value={typeof val === "object" ? JSON.stringify(val) : String(val ?? "")}
              />
            ))}
          <button
            onClick={() => { openEdit(viewTarget.type.toLowerCase(), viewTarget.data._id as string, viewTarget.data); setViewTarget(null) }}
            style={{ marginTop: 16, padding: "9px 20px", background: "rgba(203,108,230,0.15)", border: "1px solid rgba(203,108,230,0.4)", borderRadius: 8, color: "#cb6ce6", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em" }}
          >
            EDIT THIS PROFILE →
          </button>
        </Modal>
      )}

      {/* ── Edit Modal ───────────────────────────────────────── */}
      {editTarget && (
        <Modal
          title={`Edit ${editTarget.type.charAt(0).toUpperCase() + editTarget.type.slice(1)}`}
          onClose={() => setEditTarget(null)}
        >
          {/* Student */}
          {editTarget.type === "student" && (
            <div>
              <EditField label="Full Name"          name="full_name"          value={editForm.full_name ?? ""}          onChange={handleEditChange} />
              <EditField label="Username"           name="username"           value={editForm.username ?? ""}           onChange={handleEditChange} />
              <EditField label="Personal Email"     name="personal_email"     value={editForm.personal_email ?? ""}     onChange={handleEditChange} type="email" />
              <EditField label="Preferred Language" name="preferred_language" value={editForm.preferred_language ?? ""} onChange={handleEditChange} />
              <EditField label="Date of Birth"      name="date_of_birth"      value={editForm.date_of_birth?.slice(0,10) ?? ""} onChange={handleEditChange} type="date" />
            </div>
          )}

          {/* Teacher */}
          {editTarget.type === "teacher" && (
            <div>
              <EditField label="Username" name="username" value={editForm.username ?? ""} onChange={handleEditChange} />
              <EditField label="Email"    name="email"    value={editForm.email ?? ""}    onChange={handleEditChange} type="email" />

              <SectionLabel text="Teachable Subjects" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {teacherSubjects.length === 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'Share Tech Mono', monospace" }}>No subjects assigned yet.</span>}
                {teacherSubjects.map(sid => {
                  const subj = allSubjects.find(s => s._id === sid)
                  return (
                    <div key={sid} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, fontSize: 11, background: "rgba(203,108,230,0.15)", border: "1px solid rgba(203,108,230,0.3)", color: "#cb6ce6", fontFamily: "'Share Tech Mono', monospace" }}>
                      {subj?.name ?? sid}
                      <button onClick={() => handleRemoveSubject(sid)} style={{ background: "none", border: "none", color: "#ff5050", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={addingSubjectId} onChange={e => setAddingSubjectId(e.target.value)} style={selectStyle}>
                  <option value="">Select subject to add…</option>
                  {allSubjects.filter(s => !teacherSubjects.includes(s._id)).map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.category})</option>
                  ))}
                </select>
                <button onClick={handleAddSubject} disabled={!addingSubjectId || saving} style={addPillBtn("#cb6ce6", "ADD", handleAddSubject, !addingSubjectId || saving)}>ADD</button>
              </div>
            </div>
          )}

          {/* Parent */}
          {editTarget.type === "parent" && (
            <div>
              <EditField label="Username" name="username" value={editForm.username ?? ""} onChange={handleEditChange} />
              <EditField label="Email"    name="email"    value={editForm.email ?? ""}    onChange={handleEditChange} type="email" />
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 10, color: "rgba(255,230,0,0.5)", marginBottom: 5, fontFamily: "'Orbitron', monospace", letterSpacing: "0.08em" }}>RELATIONSHIP TYPE</label>
                <select value={editForm.relationship_type ?? ""} onChange={e => handleEditChange("relationship_type", e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                  <option value="mother">Mother</option>
                  <option value="father">Father</option>
                </select>
              </div>

              <SectionLabel text="Linked Children" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {parentChildren.length === 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'Share Tech Mono', monospace" }}>No children linked yet.</span>}
                {parentChildren.map(child => (
                  <div key={child._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <InitialAvatar initial={(child.full_name || child.username).charAt(0).toUpperCase()} color="#00ff88" />
                      <div>
                        <p style={{ margin: 0, fontSize: 12, color: "#e8e8f0", fontFamily: "'Exo 2', sans-serif" }}>{child.full_name || child.username}</p>
                        <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Share Tech Mono', monospace" }}>@{child.username}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveChild(child._id)} style={{ background: "none", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 6, color: "#ff5050", cursor: "pointer", fontSize: 10, padding: "3px 10px", fontFamily: "'Share Tech Mono', monospace" }}>REMOVE</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={addingChildId} onChange={e => setAddingChildId(e.target.value)} style={selectStyle}>
                  <option value="">Select student to link…</option>
                  {availableStudents.map(s => (
                    <option key={s._id} value={s._id}>{s.full_name || s.username}</option>
                  ))}
                </select>
                <button onClick={handleAddChild} disabled={!addingChildId || saving} style={addPillBtn("#00ff88", "LINK", handleAddChild, !addingChildId || saving)}>LINK</button>
              </div>
            </div>
          )}

          {/* Class */}
          {editTarget.type === "class" && (
            <div>
              <EditField label="Class Name"  name="class_name"  value={editForm.class_name ?? ""}  onChange={handleEditChange} />
              <EditField label="Grade Level" name="grade_level" value={editForm.grade_level ?? ""} onChange={handleEditChange} />
              <EditField label="School Name" name="school_name" value={editForm.school_name ?? ""} onChange={handleEditChange} />

              <SectionLabel text="Subjects & Teachers" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {classSubjects.length === 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'Share Tech Mono', monospace" }}>No subjects assigned yet.</span>}
                {classSubjects.map((subj, i) => (
                  <div key={subj._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <div>
                      <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, fontFamily: "'Exo 2', sans-serif" }}>{subj.name}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 8, fontFamily: "'Share Tech Mono', monospace" }}>→ {classTeachers[i]?.username ?? "no teacher"}</span>
                    </div>
                    <button onClick={() => { setClassSubjects(prev => prev.filter((_, idx) => idx !== i)); setClassTeachers(prev => prev.filter((_, idx) => idx !== i)) }} style={{ background: "none", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 6, color: "#ff5050", cursor: "pointer", fontSize: 10, padding: "3px 10px", fontFamily: "'Share Tech Mono', monospace" }}>REMOVE</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <select value={addingClassSubjectId} onChange={e => setAddingClassSubjectId(e.target.value)} style={selectStyle}>
                  <option value="">Select subject…</option>
                  {availableSubjectsForClass.filter(s => !classSubjects.find(cs => cs._id === s._id)).map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.category})</option>
                  ))}
                </select>
                <select value={addingClassTeacherId} onChange={e => setAddingClassTeacherId(e.target.value)} style={selectStyle}>
                  <option value="">Select teacher…</option>
                  {availableTeachersForClass.map(t => <option key={t._id} value={t._id}>{t.username}</option>)}
                </select>
                <button disabled={!addingClassSubjectId || !addingClassTeacherId} style={addPillBtn("#f59e0b", "ADD", () => {}, !addingClassSubjectId || !addingClassTeacherId)}
                  onClick={() => {
                    const subj = availableSubjectsForClass.find(s => s._id === addingClassSubjectId)
                    const teacher = availableTeachersForClass.find(t => t._id === addingClassTeacherId)
                    if (subj && teacher) { setClassSubjects(prev => [...prev, subj]); setClassTeachers(prev => [...prev, teacher]); setAddingClassSubjectId(""); setAddingClassTeacherId("") }
                    else { setSaveMsg("SELECT BOTH A SUBJECT AND A TEACHER."); setTimeout(() => setSaveMsg(null), 2000) }
                  }}>ADD</button>
              </div>

              <SectionLabel text="Students in This Class" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {classStudents.length === 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'Share Tech Mono', monospace" }}>No students in this class yet.</span>}
                {classStudents.map(student => (
                  <div key={student._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "rgba(91,141,238,0.08)", border: "1px solid rgba(91,141,238,0.2)" }}>
                    <div>
                      <span style={{ fontSize: 12, color: "#5b8dee", fontFamily: "'Exo 2', sans-serif" }}>{student.full_name || student.username}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 8, fontFamily: "'Share Tech Mono', monospace" }}>@{student.username}</span>
                    </div>
                    <button onClick={() => setClassStudents(prev => prev.filter(s => s._id !== student._id))} style={{ background: "none", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 6, color: "#ff5050", cursor: "pointer", fontSize: 10, padding: "3px 10px", fontFamily: "'Share Tech Mono', monospace" }}>REMOVE</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={addingClassStudentId} onChange={e => setAddingClassStudentId(e.target.value)} style={selectStyle}>
                  <option value="">Select student to add…</option>
                  {availableStudentsForClass.filter(s => !classStudents.find(cs => cs._id === s._id) && !s.class_id).map(s => (
                    <option key={s._id} value={s._id}>{s.full_name || s.username} (@{s.username})</option>
                  ))}
                </select>
                <button disabled={!addingClassStudentId} style={addPillBtn("#5b8dee", "ADD", () => {}, !addingClassStudentId)}
                  onClick={() => {
                    const student = availableStudentsForClass.find(s => s._id === addingClassStudentId)
                    if (!student) { setSaveMsg("STUDENT NOT FOUND."); setTimeout(() => setSaveMsg(null), 2000); return }
                    if (classStudents.find(s => s._id === student._id)) { setSaveMsg("ALREADY IN CLASS."); setTimeout(() => setSaveMsg(null), 2000); return }
                    setClassStudents(prev => [...prev, student]); setAddingClassStudentId("")
                  }}>ADD</button>
              </div>
            </div>
          )}

          {/* Subject */}
          {editTarget.type === "subject" && (
            <div>
              <EditField label="Subject Name" name="name"     value={editForm.name ?? ""}     onChange={handleEditChange} />
              <EditField label="Category"     name="category" value={editForm.category ?? ""} onChange={handleEditChange} />
            </div>
          )}

          {/* Admin */}
          {editTarget.type === "admin" && (
            <div>
              <EditField label="Username" name="username" value={editForm.username ?? ""} onChange={handleEditChange} />
              <EditField label="Email"    name="email"    value={editForm.email ?? ""}    onChange={handleEditChange} type="email" />
            </div>
          )}

          {saveMsg && (
            <p style={{ color: saveMsg.includes("FAILED") || saveMsg.includes("NOT FOUND") || saveMsg.includes("ALREADY") ? "#ff5050" : "#00ff88", fontSize: 11, margin: "14px 0 0", fontWeight: 600, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em" }}>
              {saveMsg}
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button onClick={handleSave} disabled={saving} style={{
              padding: "9px 22px", background: "rgba(91,141,238,0.15)",
              border: "1px solid rgba(91,141,238,0.4)", borderRadius: 8, color: "#5b8dee",
              fontSize: 11, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em",
            }}>
              {saving ? "SAVING…" : "SAVE CHANGES"}
            </button>
            <button onClick={() => setEditTarget(null)} style={{
              padding: "9px 16px", background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
              color: "rgba(255,255,255,0.35)", fontSize: 11, cursor: "pointer",
              fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em",
            }}>
              CLOSE
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}