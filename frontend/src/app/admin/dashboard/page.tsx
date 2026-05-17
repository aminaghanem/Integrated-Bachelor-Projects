"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"

const API = "http://localhost:4000"
const AUDIT_URL = "http://172.25.80.1:5173"

type Section =
  | "overview"
  | "requests"
  | "students"
  | "teachers"
  | "parents"
  | "classes"
  | "subjects"
  | "admins"
  | "policies"
  | "create"

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

// ── Design tokens (matching audit portal) ──────────────────────
const T = {
  bg:          "#0d1117",
  sidebar:     "#0f1520",
  surface:     "#ffffff",
  surfaceMuted: "#f4f6f9",
  border:      "#e2e8f0",
  borderDark:  "rgba(255,255,255,0.07)",
  accent:      "#c8a84b",
  accentDim:   "rgba(200,168,75,0.15)",
  text:        "#1a202c",
  textMuted:   "#64748b",
  textDim:     "rgba(255,255,255,0.35)",
  textSidebar: "rgba(255,255,255,0.55)",
  navActive:   "rgba(180,120,40,0.25)",
  navActiveBorder: "#c8a84b",
  red:         "#ef4444",
  green:       "#22c55e",
  blue:        "#3b82f6",
  purple:      "#8b5cf6",
  orange:      "#f97316",
  yellow:      "#eab308",
  indigo:      "#6366f1",
  pink:        "#ec4899",
  fontMono:    "'Share Tech Mono', monospace",
  fontSans:    "'Inter', 'Segoe UI', sans-serif",
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Inter:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(200,168,75,0.25); border-radius: 4px; }

  .ap-nav-btn:hover {
    background: rgba(255,255,255,0.06) !important;
    color: rgba(255,255,255,0.85) !important;
  }
  .ap-nav-btn.active {
    background: rgba(180,120,40,0.25) !important;
    color: #c8a84b !important;
    border-left: 2px solid #c8a84b !important;
  }

  .ap-row:hover { background: #f8fafc !important; }
  .ap-action-btn:hover { opacity: 0.8; }
  .ap-create-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important; transform: translateY(-1px); }

  @keyframes ap-spinner { to { transform: rotate(360deg); } }
  @keyframes ap-fadein {
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
      {sub && <p style={{ fontSize: 20, color: T.textMuted, fontFamily: T.fontSans }}>{sub}</p>}
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

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button className="ap-action-btn" onClick={onClick} style={{
      padding: "3px 10px", borderRadius: 5, fontSize: 11,
      border: `1px solid ${color}44`, background: color + "14", color,
      fontFamily: T.fontMono, letterSpacing: "0.04em",
      cursor: "pointer", marginRight: 4, transition: "opacity 0.15s",
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 14, width: "100%", maxWidth: 560,
        maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.1rem 1.5rem", borderBottom: `1px solid ${T.border}`,
          position: "sticky", top: 0, background: T.surface, zIndex: 1,
        }}>
          <h3 style={{
            margin: 0, fontSize: 11, fontWeight: 600, color: T.accent,
            fontFamily: T.fontMono, letterSpacing: "0.1em", textTransform: "uppercase",
          }}>{title}</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: T.textMuted,
            cursor: "pointer", fontSize: 20, lineHeight: 1,
          }}>×</button>
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
      padding: "9px 0", borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 11, color: T.textMuted, minWidth: 150, fontFamily: T.fontMono, letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: 13, color: T.text, textAlign: "right", wordBreak: "break-all", fontFamily: T.fontSans }}>{value ?? "—"}</span>
    </div>
  )
}

function EditField({ label, name, value, onChange, type = "text" }: {
  label: string; name: string; value: string;
  onChange: (n: string, v: string) => void; type?: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: "block", fontSize: 10, color: T.accent, marginBottom: 5,
        fontFamily: T.fontMono, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(name, e.target.value)}
        style={{
          width: "100%", padding: "9px 12px",
          background: T.surfaceMuted, border: `1px solid ${T.border}`,
          borderRadius: 7, color: T.text, fontSize: 13, outline: "none",
          fontFamily: T.fontSans, boxSizing: "border-box",
        }}
      />
    </div>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{
      margin: "20px 0 10px", fontSize: 10, fontWeight: 600,
      color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em",
      borderTop: `1px solid ${T.border}`, paddingTop: 16,
      fontFamily: T.fontMono,
    }}>{text}</p>
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
    background: T.surface, animation: "ap-fadein 0.2s ease",
  }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
  </div>
)

const selectStyle: React.CSSProperties = {
  flex: 1, padding: "8px 10px",
  background: T.surfaceMuted, border: `1px solid ${T.border}`,
  borderRadius: 7, color: T.text, fontSize: 12, outline: "none",
  fontFamily: T.fontSans,
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
    el.textContent = STYLES
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
      if (sec === "students") {
        const r = await fetch(`${API}/api/students`, { headers: authHeaders() })
        if (r.ok) setStudents(await r.json())
      }
      if (sec === "teachers") {
        const r = await fetch(`${API}/api/teachers`, { headers: authHeaders() })
        if (r.ok) setTeachers(await r.json())
      }
      if (sec === "parents") {
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

  useEffect(() => {
    if (section !== "overview" && section !== "requests") fetchData(section)
  }, [section, fetchData])

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
      setAddingClassSubjectId(""); setAddingClassTeacherId(""); setAddingClassStudentId("")
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
      setSaveMsg("Saved successfully.")
      await fetchData(section)
      setTimeout(() => setSaveMsg(null), 2500)
    } catch { setSaveMsg("Save failed.") }
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
      setSaveMsg("Subject added.")
      await fetchData(section)
      setTimeout(() => setSaveMsg(null), 2000)
    } catch { setSaveMsg("Failed to add subject.") }
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
    } catch { setSaveMsg("Failed to remove subject.") }
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
      setSaveMsg("Child linked.")
      await fetchData(section)
      setTimeout(() => setSaveMsg(null), 2000)
    } catch { setSaveMsg("Failed to link child.") }
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
    } catch { setSaveMsg("Failed to unlink child.") }
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

  // ── Nav items ───────────────────────────────────────────────
  const auditItems: { key: Section; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "requests", label: "Requests" },
  ]
  const adminItems: { key: Section; label: string }[] = [
    { key: "students", label: "Students" },
    { key: "teachers", label: "Teachers" },
    { key: "parents",  label: "Parents"  },
    { key: "classes",  label: "Classes"  },
    { key: "subjects", label: "Subjects" },
    { key: "admins",   label: "Admins"   },
    { key: "policies", label: "Policies" },
    { key: "create",   label: "Create"   },
  ]

  const isAuditSection = section === "overview" || section === "requests"

  // iframe src: overview → root, requests → /requests
  const iframeSrc = section === "requests" ? `${AUDIT_URL}/requests` : AUDIT_URL

  // ── Pill add button ─────────────────────────────────────────
  const pillBtn = (color: string, disabled?: boolean): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 7, fontSize: 11,
    cursor: disabled ? "not-allowed" : "pointer",
    background: color + "18", border: `1px solid ${color}44`, color,
    fontFamily: T.fontMono, letterSpacing: "0.04em",
    opacity: disabled ? 0.5 : 1, transition: "opacity 0.15s",
  })

  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      color: T.text,
      fontFamily: T.fontSans,
      display: "flex",
      position: "relative",
    }}>
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside style={{
        width: 220, minHeight: "100vh",
        background: T.sidebar,
        borderRight: "1px solid rgba(255,255,255,0.07)",
        padding: "0",
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
            }}>⚙</div>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: T.fontMono, letterSpacing: "0.05em" }}>PLAY & LEARN</p>
              <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: T.fontMono }}>ADMIN PANEL</p>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 0 8px" }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>

          {/* Audit group label */}
          <p style={{
            fontFamily: T.fontMono, fontSize: 9, letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.2)", textTransform: "uppercase",
            padding: "10px 10px 6px",
          }}>Audit</p>

          {auditItems.map(item => {
            const isActive = section === item.key
            return (
              <button
                key={item.key}
                className={`ap-nav-btn${isActive ? " active" : ""}`}
                onClick={() => { setSection(item.key); setSearch("") }}
                style={{
                  display: "flex", alignItems: "center", width: "100%",
                  padding: "9px 12px", marginBottom: 1, borderRadius: 7,
                  border: "none",
                  cursor: "pointer", textAlign: "left",
                  fontFamily: T.fontMono, fontSize: 13, letterSpacing: "0.04em",
                  background: isActive ? "rgba(180,120,40,0.25)" : "transparent",
                  color: isActive ? T.accent : T.textSidebar,
                  borderLeft: isActive ? `2px solid ${T.accent}` : "2px solid transparent",
                  transition: "all 0.15s",
                } as React.CSSProperties}
              >
                {item.label}
              </button>
            )
          })}

          {/* Admin group label */}
          <p style={{
            fontFamily: T.fontMono, fontSize: 9, letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.2)", textTransform: "uppercase",
            padding: "14px 10px 6px",
          }}>Management</p>

          {adminItems.map(item => {
            const isActive = section === item.key
            return (
              <button
                key={item.key}
                className={`ap-nav-btn${isActive ? " active" : ""}`}
                onClick={() => { setSection(item.key); setSearch("") }}
                style={{
                  display: "flex", alignItems: "center", width: "100%",
                  padding: "9px 12px", marginBottom: 1, borderRadius: 7,
                  border: "none",
                  cursor: "pointer", textAlign: "left",
                  fontFamily: T.fontMono, fontSize: 13, letterSpacing: "0.04em",
                  background: isActive ? "rgba(180,120,40,0.25)" : "transparent",
                  color: isActive ? T.accent : T.textSidebar,
                  borderLeft: isActive ? `2px solid ${T.accent}` : "2px solid transparent",
                  transition: "all 0.15s",
                } as React.CSSProperties}
              >
                {item.label}
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

      {/* ── Main ─────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        display: "flex", flexDirection: "column",
        minHeight: "100vh",
        background: isAuditSection ? T.bg : "#f1f5f9",
        position: "relative",
      }}>

        {/* ── Audit iframe sections (Overview + Requests) ──── */}
        {isAuditSection && (
          <div style={{
            position: "relative",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}>
            {/* Thin header matching her style */}
            {/* <div style={{
              padding: "14px 28px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              background: T.sidebar,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontFamily: T.fontMono, fontSize: 11, letterSpacing: "0.12em", color: T.accent, textTransform: "uppercase", marginBottom: 2 }}>
                  {section === "overview" ? "Overview" : "Requests"}
                </p>
                <p style={{ fontFamily: T.fontMono, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {dateStr} · Internal audit dashboard
                </p>
              </div>
            </div> */}

            {/*
              The iframe clips her sidebar (width: 220px) using a negative margin + overflow hidden trick.
              Her sidebar is 270px wide — we shift left by that amount so only her main content shows.
            */}
            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              <iframe
                key={section} // remount on section switch so /requests loads fresh
                src={iframeSrc}
                style={{
                  // Shift left to hide her sidebar (approx 270px wide)
                  position: "absolute",
                  top: 0,
                  left: -290,
                  width: "calc(100% + 270px)",
                  height: "100%",
                  border: "none",
                }}
                title={section === "requests" ? "Audit Requests" : "Audit Overview"}
              />
            </div>
          </div>
        )}

        {/* ── Admin content sections ────────────────────────── */}
        {!isAuditSection && (
          <div style={{ flex: 1, padding: "28px 32px", animation: "ap-fadein 0.2s ease" }}>

            {/* Header */}
            <header style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 28, paddingBottom: 20,
              borderBottom: `1px solid ${T.border}`,
            }}>
              <div>
                <p style={{ fontFamily: T.fontMono, fontSize: 10, letterSpacing: "0.12em", color: T.accent, textTransform: "uppercase", marginBottom: 4 }}>
                  {section.toUpperCase()}
                </p>
                <p style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontMono }}>{dateStr}</p>
              </div>
              {/* <button onClick={handleLogout} style={{
                padding: "7px 16px", borderRadius: 7, border: `1px solid ${T.border}`,
                background: T.surface, color: T.textMuted, fontSize: 12,
                fontFamily: T.fontMono, cursor: "pointer", letterSpacing: "0.04em",
              }}>Logout</button> */}
            </header>

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", fontFamily: T.fontMono, color: T.textMuted, fontSize: 12 }}>
                <div style={{ width: 14, height: 14, border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ap-spinner 0.7s linear infinite" }} />
                Loading…
              </div>
            )}

            {/* ── Students ──────────────────────────────────── */}
            {section === "students" && !loading && (
              <>
                <SectionHeading label="Students" sub="Manage all registered student accounts." />
                <div style={{ marginBottom: 16 }}>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search students…"
                    style={{
                      width: 280, padding: "8px 14px",
                      background: T.surface, border: `1px solid ${T.border}`,
                      borderRadius: 7, color: T.text, fontSize: 13, outline: "none",
                      fontFamily: T.fontSans,
                    }}
                  />
                </div>
                <TableWrap>
                  <thead><tr>{["Student", "Username", "Language", "Region", "Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredStudents.map(s => (
                      <tr key={s._id} className="ap-row" style={{ transition: "background 0.1s" }}>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <InitialAvatar initial={(s.full_name || s.username || "?").charAt(0).toUpperCase()} color={T.blue} />
                            {s.full_name || "—"}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: T.textMuted, fontFamily: T.fontMono, fontSize: 12 }}>@{s.username}</td>
                        <td style={tdStyle}>{s.preferred_language || "—"}</td>
                        <td style={tdStyle}>{s.context?.region || "—"}</td>
                        <td style={tdStyle}>
                          <ActionBtn label="View"   color={T.green}  onClick={() => setViewTarget({ type: "Student", data: s as unknown as Record<string, unknown> })} />
                          <ActionBtn label="Edit"   color={T.blue}   onClick={() => openEdit("student", s._id, s as unknown as Record<string, unknown>)} />
                          <ActionBtn label="Delete" color={T.red}    onClick={() => handleDelete("student", s._id)} />
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: T.textMuted, padding: "2rem", fontFamily: T.fontMono, fontSize: 12 }}>No students found</td></tr>}
                  </tbody>
                </TableWrap>
              </>
            )}

            {/* ── Teachers ──────────────────────────────────── */}
            {section === "teachers" && !loading && (
              <>
                <SectionHeading label="Teachers" sub="Manage all teacher accounts and subject assignments." />
                <div style={{ marginBottom: 16 }}>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search teachers…"
                    style={{
                      width: 280, padding: "8px 14px",
                      background: T.surface, border: `1px solid ${T.border}`,
                      borderRadius: 7, color: T.text, fontSize: 13, outline: "none",
                      fontFamily: T.fontSans,
                    }}
                  />
                </div>
                <TableWrap>
                  <thead><tr>{["Teacher", "Email", "Joined", "Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredTeachers.map(t => (
                      <tr key={t._id} className="ap-row" style={{ transition: "background 0.1s" }}>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <InitialAvatar initial={(t.username || "?").charAt(0).toUpperCase()} color={T.purple} />
                            {t.username}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: T.textMuted, fontFamily: T.fontMono, fontSize: 12 }}>{t.email}</td>
                        <td style={{ ...tdStyle, color: T.textMuted, fontFamily: T.fontMono, fontSize: 12 }}>{t.created_at ? new Date(t.created_at).toLocaleDateString("en-GB") : "—"}</td>
                        <td style={tdStyle}>
                          <ActionBtn label="View"   color={T.green}  onClick={() => setViewTarget({ type: "Teacher", data: t as unknown as Record<string, unknown> })} />
                          <ActionBtn label="Edit"   color={T.blue}   onClick={() => openEdit("teacher", t._id, t as unknown as Record<string, unknown>)} />
                          <ActionBtn label="Delete" color={T.red}    onClick={() => handleDelete("teacher", t._id)} />
                        </td>
                      </tr>
                    ))}
                    {filteredTeachers.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: T.textMuted, padding: "2rem", fontFamily: T.fontMono, fontSize: 12 }}>No teachers found</td></tr>}
                  </tbody>
                </TableWrap>
              </>
            )}

            {/* ── Parents ───────────────────────────────────── */}
            {section === "parents" && !loading && (
              <>
                <SectionHeading label="Parents" sub="Manage parent accounts and their linked children." />
                <div style={{ marginBottom: 16 }}>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search parents…"
                    style={{
                      width: 280, padding: "8px 14px",
                      background: T.surface, border: `1px solid ${T.border}`,
                      borderRadius: 7, color: T.text, fontSize: 13, outline: "none",
                      fontFamily: T.fontSans,
                    }}
                  />
                </div>
                <TableWrap>
                  <thead><tr>{["Parent", "Email", "Role", "Children", "Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredParents.map(p => (
                      <tr key={p._id} className="ap-row" style={{ transition: "background 0.1s" }}>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <InitialAvatar initial={(p.username || "?").charAt(0).toUpperCase()} color={T.green} />
                            {p.username}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: T.textMuted, fontFamily: T.fontMono, fontSize: 12 }}>{p.email}</td>
                        <td style={tdStyle}><Badge text={p.relationship_type} color={T.green} /></td>
                        <td style={{ ...tdStyle, color: T.textMuted, fontSize: 12 }}>
                          {p.children_ids?.length > 0 ? p.children_ids.map(c => c.full_name || c.username).join(", ") : "—"}
                        </td>
                        <td style={tdStyle}>
                          <ActionBtn label="View"   color={T.green}  onClick={() => setViewTarget({ type: "Parent", data: p as unknown as Record<string, unknown> })} />
                          <ActionBtn label="Edit"   color={T.blue}   onClick={() => openEdit("parent", p._id, p as unknown as Record<string, unknown>)} />
                          <ActionBtn label="Delete" color={T.red}    onClick={() => handleDelete("parent", p._id)} />
                        </td>
                      </tr>
                    ))}
                    {filteredParents.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: T.textMuted, padding: "2rem", fontFamily: T.fontMono, fontSize: 12 }}>No parents found</td></tr>}
                  </tbody>
                </TableWrap>
              </>
            )}

            {/* ── Classes ───────────────────────────────────── */}
            {section === "classes" && !loading && (
              <>
                <SectionHeading label="Classes" sub="Manage class groups, subjects, teachers and enrolled students." />
                <TableWrap>
                  <thead><tr>{["Class", "Grade", "School", "Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {classes.map(c => (
                      <tr key={c._id} className="ap-row" style={{ transition: "background 0.1s" }}>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <InitialAvatar initial={c.class_name?.charAt(0).toUpperCase() ?? "C"} color={T.yellow} />
                            {c.class_name}
                          </div>
                        </td>
                        <td style={tdStyle}><Badge text={`Grade ${c.grade_level}`} color={T.yellow} /></td>
                        <td style={{ ...tdStyle, color: T.textMuted }}>{c.school_name}</td>
                        <td style={tdStyle}>
                          <ActionBtn label="View"   color={T.green}  onClick={() => setViewTarget({ type: "Class", data: c as unknown as Record<string, unknown> })} />
                          <ActionBtn label="Edit"   color={T.blue}   onClick={() => openEdit("class", c._id, c)} />
                          <ActionBtn label="Delete" color={T.red}    onClick={() => handleDelete("class", c._id)} />
                        </td>
                      </tr>
                    ))}
                    {classes.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: T.textMuted, padding: "2rem", fontFamily: T.fontMono, fontSize: 12 }}>No classes found</td></tr>}
                  </tbody>
                </TableWrap>
              </>
            )}

            {/* ── Subjects ──────────────────────────────────── */}
            {section === "subjects" && !loading && (
              <>
                <SectionHeading label="Subjects" sub="All available subjects and their categories." />
                <TableWrap>
                  <thead><tr>{["Subject", "Category", "Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {subjects.map(s => (
                      <tr key={s._id} className="ap-row" style={{ transition: "background 0.1s" }}>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <InitialAvatar initial={s.name?.charAt(0).toUpperCase() ?? "S"} color={T.orange} />
                            {s.name}
                          </div>
                        </td>
                        <td style={tdStyle}><Badge text={s.category} color={T.orange} /></td>
                        <td style={tdStyle}>
                          <ActionBtn label="View"   color={T.green}  onClick={() => setViewTarget({ type: "Subject", data: s as unknown as Record<string, unknown> })} />
                          <ActionBtn label="Edit"   color={T.blue}   onClick={() => openEdit("subject", s._id, s)} />
                          <ActionBtn label="Delete" color={T.red}    onClick={() => handleDelete("subject", s._id)} />
                        </td>
                      </tr>
                    ))}
                    {subjects.length === 0 && <tr><td colSpan={3} style={{ ...tdStyle, textAlign: "center", color: T.textMuted, padding: "2rem", fontFamily: T.fontMono, fontSize: 12 }}>No subjects found</td></tr>}
                  </tbody>
                </TableWrap>
              </>
            )}

            {/* ── Admins ────────────────────────────────────── */}
            {section === "admins" && !loading && (
              <>
                <SectionHeading label="Admins" sub="All administrator accounts." />
                <TableWrap>
                  <thead><tr>{["Admin", "Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {admins.map(a => (
                      <tr key={a._id} className="ap-row" style={{ transition: "background 0.1s" }}>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <InitialAvatar initial={(a.username || "?").charAt(0).toUpperCase()} color={T.indigo} />
                            {a.username}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <ActionBtn label="View"   color={T.green}  onClick={() => setViewTarget({ type: "Admin", data: a as unknown as Record<string, unknown> })} />
                          <ActionBtn label="Delete" color={T.red}    onClick={() => handleDelete("admin", a._id)} />
                        </td>
                      </tr>
                    ))}
                    {admins.length === 0 && <tr><td colSpan={2} style={{ ...tdStyle, textAlign: "center", color: T.textMuted, padding: "2rem", fontFamily: T.fontMono, fontSize: 12 }}>No admins found</td></tr>}
                  </tbody>
                </TableWrap>
              </>
            )}

            {/* ── Policies ──────────────────────────────────── */}
            {section === "policies" && (
              <>
                <SectionHeading label="Policies" sub="Launch the desktop policy manager to configure AI rules and restrictions." />
                <div style={{
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: 10, padding: "28px 32px", maxWidth: 1500,
                }}>
                  <p style={{ fontSize: 20, color: T.textMuted, fontFamily: T.fontSans, lineHeight: 1.7, marginBottom: 20 }}>
                    The Policy Manager is a desktop application for creating and managing AI policies for your school. Define rules, restrictions, and guidelines to ensure a safe and effective learning environment.
                  </p>
                  <button onClick={async () => {
                    try {
                      const res = await fetch(`${API}/api/policies/launch-gui`, { method: "POST", headers: authHeaders() })
                      const data = await res.json().catch(() => ({ error: "Server error" }))
                      if (!res.ok) alert(`Failed to launch Policy Manager:\n\n${data.detail || data.error || "Unknown error"}`)
                      else alert("Policy Manager launched successfully!")
                    } catch (e) { console.error("Launch error:", e) }
                  }} style={{
                    padding: "10px 22px",
                    background: T.accentDim,
                    color: T.accent,
                    border: `1px solid rgba(200,168,75,0.3)`,
                    borderRadius: 8, fontSize: 13,
                    fontWeight: 600, cursor: "pointer",
                    fontFamily: T.fontMono, letterSpacing: "0.05em",
                    transition: "all 0.15s",
                  }}>
                    Open Policy Manager
                  </button>
                </div>
              </>
            )}

            {/* ── Create ────────────────────────────────────── */}
            {section === "create" && (
              <>
                <SectionHeading label="Create" sub="Add new records to the system." />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, maxWidth: 680 }}>
                  {[
                    { label: "New Student", href: "/admin/create-student", color: T.blue },
                    { label: "New Teacher", href: "/admin/create-teacher", color: T.purple },
                    { label: "New Parent",  href: "/admin/create-parent",  color: T.green },
                    { label: "New Subject", href: "/admin/create-subject", color: T.orange },
                    { label: "New Class",   href: "/admin/create-class",   color: T.yellow },
                    { label: "New Admin",   href: "/admin/create-admin",   color: T.indigo },
                  ].map(item => (
                    <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                      <div className="ap-create-card" style={{
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        borderTop: `3px solid ${item.color}`,
                        borderRadius: 10, padding: "20px",
                        cursor: "pointer", transition: "all 0.2s",
                        height: 200, width: 400
                      }}>
                        <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 20, color: T.text, fontFamily: T.fontSans, left: 120, position: "relative", top:60 }}>{item.label}</p>
                        <p style={{ margin: 0, fontSize: 20, color: T.textMuted, fontFamily: T.fontMono, left: 70, position: "relative", top:60 }}>Create new record →</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ── View Modal ───────────────────────────────────────── */}
      {viewTarget && (
        <Modal title={`${viewTarget.type} Profile`} onClose={() => setViewTarget(null)}>
          {Object.entries(viewTarget.data)
            .filter(([k]) => !["password_hash","__v","teaching_assignments","teachable_subjects","children_ids","interests","learning_history","proficiency_levels","accessibility","parent_id"].includes(k))
            .map(([key, val]) => (
              <Field key={key}
                label={key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                value={typeof val === "object" ? JSON.stringify(val) : String(val ?? "")}
              />
            ))}
          <button
            onClick={() => { openEdit(viewTarget.type.toLowerCase(), viewTarget.data._id as string, viewTarget.data); setViewTarget(null) }}
            style={{
              marginTop: 18, padding: "8px 18px",
              background: T.accentDim, border: `1px solid rgba(200,168,75,0.3)`,
              borderRadius: 7, color: T.accent, fontSize: 11,
              fontWeight: 600, cursor: "pointer", fontFamily: T.fontMono, letterSpacing: "0.06em",
            }}
          >
            Edit this profile →
          </button>
        </Modal>
      )}

      {/* ── Edit Modal ───────────────────────────────────────── */}
      {editTarget && (
        <Modal
          title={`Edit ${editTarget.type.charAt(0).toUpperCase() + editTarget.type.slice(1)}`}
          onClose={() => setEditTarget(null)}
        >
          {editTarget.type === "student" && (
            <div>
              <EditField label="Full Name"          name="full_name"          value={editForm.full_name ?? ""}          onChange={handleEditChange} />
              <EditField label="Username"           name="username"           value={editForm.username ?? ""}           onChange={handleEditChange} />
              <EditField label="Personal Email"     name="personal_email"     value={editForm.personal_email ?? ""}     onChange={handleEditChange} type="email" />
              <EditField label="Preferred Language" name="preferred_language" value={editForm.preferred_language ?? ""} onChange={handleEditChange} />
              <EditField label="Date of Birth"      name="date_of_birth"      value={editForm.date_of_birth?.slice(0,10) ?? ""} onChange={handleEditChange} type="date" />
            </div>
          )}

          {editTarget.type === "teacher" && (
            <div>
              <EditField label="Username" name="username" value={editForm.username ?? ""} onChange={handleEditChange} />
              <EditField label="Email"    name="email"    value={editForm.email ?? ""}    onChange={handleEditChange} type="email" />
              <SectionLabel text="Teachable Subjects" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {teacherSubjects.length === 0 && <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontMono }}>No subjects assigned yet.</span>}
                {teacherSubjects.map(sid => {
                  const subj = allSubjects.find(s => s._id === sid)
                  return (
                    <div key={sid} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, fontSize: 11, background: T.purple + "18", border: `1px solid ${T.purple}33`, color: T.purple, fontFamily: T.fontMono }}>
                      {subj?.name ?? sid}
                      <button onClick={() => handleRemoveSubject(sid)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
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
                <button onClick={handleAddSubject} disabled={!addingSubjectId || saving} style={pillBtn(T.purple, !addingSubjectId || saving)}>Add</button>
              </div>
            </div>
          )}

          {editTarget.type === "parent" && (
            <div>
              <EditField label="Username" name="username" value={editForm.username ?? ""} onChange={handleEditChange} />
              <EditField label="Email"    name="email"    value={editForm.email ?? ""}    onChange={handleEditChange} type="email" />
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 10, color: T.accent, marginBottom: 5, fontFamily: T.fontMono, letterSpacing: "0.08em", textTransform: "uppercase" }}>Relationship Type</label>
                <select value={editForm.relationship_type ?? ""} onChange={e => handleEditChange("relationship_type", e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                  <option value="mother">Mother</option>
                  <option value="father">Father</option>
                </select>
              </div>
              <SectionLabel text="Linked Children" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {parentChildren.length === 0 && <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontMono }}>No children linked yet.</span>}
                {parentChildren.map(child => (
                  <div key={child._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: T.green + "0f", border: `1px solid ${T.green}22` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <InitialAvatar initial={(child.full_name || child.username).charAt(0).toUpperCase()} color={T.green} />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: T.text, fontFamily: T.fontSans }}>{child.full_name || child.username}</p>
                        <p style={{ margin: 0, fontSize: 11, color: T.textMuted, fontFamily: T.fontMono }}>@{child.username}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveChild(child._id)} style={{ background: "none", border: `1px solid ${T.red}44`, borderRadius: 6, color: T.red, cursor: "pointer", fontSize: 11, padding: "3px 10px", fontFamily: T.fontMono }}>Remove</button>
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
                <button onClick={handleAddChild} disabled={!addingChildId || saving} style={pillBtn(T.green, !addingChildId || saving)}>Link</button>
              </div>
            </div>
          )}

          {editTarget.type === "class" && (
            <div>
              <EditField label="Class Name"  name="class_name"  value={editForm.class_name ?? ""}  onChange={handleEditChange} />
              <EditField label="Grade Level" name="grade_level" value={editForm.grade_level ?? ""} onChange={handleEditChange} />
              <EditField label="School Name" name="school_name" value={editForm.school_name ?? ""} onChange={handleEditChange} />
              <SectionLabel text="Subjects & Teachers" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {classSubjects.length === 0 && <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontMono }}>No subjects assigned yet.</span>}
                {classSubjects.map((subj, i) => (
                  <div key={subj._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: T.yellow + "0f", border: `1px solid ${T.yellow}22` }}>
                    <div>
                      <span style={{ fontSize: 13, color: T.yellow, fontWeight: 600, fontFamily: T.fontSans }}>{subj.name}</span>
                      <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 8, fontFamily: T.fontMono }}>→ {classTeachers[i]?.username ?? "no teacher"}</span>
                    </div>
                    <button onClick={() => { setClassSubjects(prev => prev.filter((_, idx) => idx !== i)); setClassTeachers(prev => prev.filter((_, idx) => idx !== i)) }} style={{ background: "none", border: `1px solid ${T.red}44`, borderRadius: 6, color: T.red, cursor: "pointer", fontSize: 11, padding: "3px 10px", fontFamily: T.fontMono }}>Remove</button>
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
                <button disabled={!addingClassSubjectId || !addingClassTeacherId} style={pillBtn(T.yellow, !addingClassSubjectId || !addingClassTeacherId)}
                  onClick={() => {
                    const subj = availableSubjectsForClass.find(s => s._id === addingClassSubjectId)
                    const teacher = availableTeachersForClass.find(t => t._id === addingClassTeacherId)
                    if (subj && teacher) { setClassSubjects(prev => [...prev, subj]); setClassTeachers(prev => [...prev, teacher]); setAddingClassSubjectId(""); setAddingClassTeacherId("") }
                    else { setSaveMsg("Select both a subject and a teacher."); setTimeout(() => setSaveMsg(null), 2000) }
                  }}>Add</button>
              </div>
              <SectionLabel text="Students in This Class" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {classStudents.length === 0 && <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontMono }}>No students in this class yet.</span>}
                {classStudents.map(student => (
                  <div key={student._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: T.blue + "0f", border: `1px solid ${T.blue}22` }}>
                    <div>
                      <span style={{ fontSize: 13, color: T.blue, fontFamily: T.fontSans }}>{student.full_name || student.username}</span>
                      <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 8, fontFamily: T.fontMono }}>@{student.username}</span>
                    </div>
                    <button onClick={() => setClassStudents(prev => prev.filter(s => s._id !== student._id))} style={{ background: "none", border: `1px solid ${T.red}44`, borderRadius: 6, color: T.red, cursor: "pointer", fontSize: 11, padding: "3px 10px", fontFamily: T.fontMono }}>Remove</button>
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
                <button disabled={!addingClassStudentId} style={pillBtn(T.blue, !addingClassStudentId)}
                  onClick={() => {
                    const student = availableStudentsForClass.find(s => s._id === addingClassStudentId)
                    if (!student) { setSaveMsg("Student not found."); setTimeout(() => setSaveMsg(null), 2000); return }
                    if (classStudents.find(s => s._id === student._id)) { setSaveMsg("Already in class."); setTimeout(() => setSaveMsg(null), 2000); return }
                    setClassStudents(prev => [...prev, student]); setAddingClassStudentId("")
                  }}>Add</button>
              </div>
            </div>
          )}

          {editTarget.type === "subject" && (
            <div>
              <EditField label="Subject Name" name="name"     value={editForm.name ?? ""}     onChange={handleEditChange} />
              <EditField label="Category"     name="category" value={editForm.category ?? ""} onChange={handleEditChange} />
            </div>
          )}

          {editTarget.type === "admin" && (
            <div>
              <EditField label="Username" name="username" value={editForm.username ?? ""} onChange={handleEditChange} />
              <EditField label="Email"    name="email"    value={editForm.email ?? ""}    onChange={handleEditChange} type="email" />
            </div>
          )}

          {saveMsg && (
            <p style={{
              color: saveMsg.toLowerCase().includes("fail") || saveMsg.toLowerCase().includes("not found") || saveMsg.toLowerCase().includes("already")
                ? T.red : T.green,
              fontSize: 12, margin: "14px 0 0", fontFamily: T.fontMono,
            }}>{saveMsg}</p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button onClick={handleSave} disabled={saving} style={{
              padding: "8px 20px", background: T.accentDim,
              border: `1px solid rgba(200,168,75,0.3)`, borderRadius: 7, color: T.accent,
              fontSize: 12, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              fontFamily: T.fontMono, letterSpacing: "0.05em",
            }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => setEditTarget(null)} style={{
              padding: "8px 16px", background: "transparent",
              border: `1px solid ${T.border}`, borderRadius: 7,
              color: T.textMuted, fontSize: 12, cursor: "pointer",
              fontFamily: T.fontMono, letterSpacing: "0.05em",
            }}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}