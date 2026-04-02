"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"

const API = "http://localhost:4000"

type Section = "overview" | "students" | "teachers" | "parents" | "classes" | "subjects" | "admins" | "create"

interface Student {
  _id: string
  username: string
  full_name: string
  preferred_language: string
  personal_email: string
  date_of_birth: string
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

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{
      background: "#ffffff", border: `1px solid #e5e7eb`,
      borderRadius: 12, padding: "1.25rem 1.5rem", borderLeft: `3px solid ${color}`,
    }}>
      <p style={{ margin: 0, fontSize: 12, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 32, fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>{value}</p>
    </div>
  )
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: color + "22", color, border: `1px solid ${color}44`
    }}>{text}</span>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
    }}>
      <div style={{
        background: "#16181d", border: "1px solid #2d3140", borderRadius: 16,
        width: "100%", maxWidth: 580, maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 25px 60px rgba(0,0,0,0.6)"
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.25rem 1.5rem", borderBottom: "1px solid #2d3140",
          position: "sticky", top: 0, background: "#16181d", zIndex: 1
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" }}>{title}</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#6b7280",
            cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4
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
      padding: "8px 0", borderBottom: "1px solid #2d3140"
    }}>
      <span style={{ fontSize: 12, color: "#6b7280", minWidth: 140 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#e2e8f0", textAlign: "right", wordBreak: "break-all" }}>{value ?? "—"}</span>
    </div>
  )
}

function EditField({ label, name, value, onChange, type = "text" }: {
  label: string; name: string; value: string
  onChange: (n: string, v: string) => void; type?: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(name, e.target.value)}
        style={{
          width: "100%", padding: "9px 12px", background: "#f9fafb",
          border: "1px solid #2d3140", borderRadius: 8, color: "#111827",
          fontSize: 13, outline: "none", boxSizing: "border-box"
        }}
      />
    </div>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{
      margin: "20px 0 10px", fontSize: 11, fontWeight: 700, color: "#6b7280",
      textTransform: "uppercase", letterSpacing: "0.08em",
      borderTop: "1px solid #2d3140", paddingTop: 16
    }}>{text}</p>
  )
}

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

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/"); return }
  }, [router])

  // Fix hydration: date only set client-side
  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    }))
  }, [])

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`
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
      setTeacherSubjects(
        (teacher?.teachable_subjects ?? []).map(s => (typeof s === "object" ? s._id : String(s)))
      )
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
  }

  const handleEditChange = (name: string, value: string) =>
    setEditForm(prev => ({ ...prev, [name]: value }))

  const handleSave = async () => {
    if (!editTarget) return
    setSaving(true)
    const map: Record<string, string> = { student: "students", teacher: "teachers", parent: "parents", class: "classes", subject: "subjects", admin: "admins"}
    try {
      const res = await fetch(`${API}/api/${map[editTarget.type]}/${editTarget.id}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify(editForm)
      })
      if (!res.ok) throw new Error()
      setSaveMsg("Saved!")
      await fetchData(section)
      setTimeout(() => setSaveMsg(null), 2500)
    } catch {
      setSaveMsg("Failed to save.")
    }
    setSaving(false)
  }

  const handleAddSubject = async () => {
    if (!editTarget || !addingSubjectId) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/teachers/${editTarget.id}/subjects`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ subject_id: addingSubjectId })
      })
      if (!res.ok) throw new Error()
      setTeacherSubjects(prev => [...prev, addingSubjectId])
      setAddingSubjectId("")
      setSaveMsg("Subject added!")
      await fetchData(section)
      setTimeout(() => setSaveMsg(null), 2000)
    } catch { setSaveMsg("Failed to add subject.") }
    setSaving(false)
  }

  const handleRemoveSubject = async (subjectId: string) => {
    if (!editTarget) return
    try {
      const res = await fetch(`${API}/api/teachers/${editTarget.id}/subjects/${subjectId}`, {
        method: "DELETE", headers: authHeaders()
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
        body: JSON.stringify({ student_id: addingChildId })
      })
      if (!res.ok) throw new Error()
      const added = availableStudents.find(s => s._id === addingChildId)
      if (added) setParentChildren(prev => [...prev, { _id: added._id, username: added.username, full_name: added.full_name }])
      setAvailableStudents(prev => prev.filter(s => s._id !== addingChildId))
      setAddingChildId("")
      setSaveMsg("Child linked!")
      await fetchData(section)
      setTimeout(() => setSaveMsg(null), 2000)
    } catch { setSaveMsg("Failed to link child.") }
    setSaving(false)
  }

  const handleRemoveChild = async (childId: string) => {
    if (!editTarget) return
    try {
      const res = await fetch(`${API}/api/parents/${editTarget.id}/children/${childId}`, {
        method: "DELETE", headers: authHeaders()
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

  const navItems: { key: Section; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "◈" },
    { key: "students", label: "Students", icon: "⊙" },
    { key: "teachers", label: "Teachers", icon: "⊕" },
    { key: "parents",  label: "Parents",  icon: "⊗" },
    { key: "classes", label: "Classes", icon: "▣" },
    { key: "subjects", label: "Subjects", icon: "◎" },
    { key: "admins", label: "Admins", icon: "⚑" },
    { key: "create",   label: "Create",   icon: "⊞" },
  ]

  const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse" }
  const thStyle: React.CSSProperties = {
    padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600,
    color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em",
    borderBottom: "1px solid #2d3140", whiteSpace: "nowrap"
  }
  const tdStyle: React.CSSProperties = {
    padding: "11px 14px", fontSize: 13, color: "#cbd5e1", borderBottom: "1px solid #1e2130"
  }
  const actionBtn = (color: string): React.CSSProperties => ({
    padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${color}55`, background: color + "18", color, marginRight: 6
  })
  const avatarDiv = (initial: string, bg: string, color: string) => (
    <div style={{
      width: 28, height: 28, borderRadius: "50%", background: bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color
    }}>{initial}</div>
  )

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb", fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Sidebar */}
      <aside style={{
        width: 220, background: "#f9fafb", borderRight: "1px solid #2d3140",
        display: "flex", flexDirection: "column", padding: "1.5rem 0",
        flexShrink: 0, position: "sticky", top: 0, height: "100vh"
      }}>
        <div style={{ padding: "0 1.25rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
            }}>⚙</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>SmartGuard</p>
              <p style={{ margin: 0, fontSize: 10, color: "#6b7280" }}>Admin Panel</p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "0 0.75rem" }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => { setSection(item.key); setSearch("") }} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "9px 12px", marginBottom: 2, borderRadius: 8, border: "none",
              cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 500,
              background: section === item.key ? "#3b82f611" : "transparent",
              color: section === item.key ? "#60a5fa" : "#111827",
              borderLeft: section === item.key ? "2px solid #3b82f6" : "2px solid transparent",
            }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "0 0.75rem" }}>
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 13, color: "#f87171", background: "#f8717111", fontWeight: 500
          }}>
            <span>⏻</span> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "2rem 2.5rem", overflowY: "auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111827" }}>
            {navItems.find(n => n.key === section)?.label}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>{dateStr}</p>
        </div>

        {loading && <p style={{ color: "#6b7280" }}>Loading...</p>}

        {/* Overview */}
        {section === "overview" && !loading && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: "2rem" }}>
              <StatCard label="Total Students" value={students.length} color="#3b82f6" />
              <StatCard label="Total Teachers" value={teachers.length} color="#a855f7" />
              <StatCard label="Total Parents"  value={parents.length}  color="#10b981" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #2d3140", overflow: "hidden" }}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #2d3140", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#111827" }}>Recent Students</p>
                  <button onClick={() => setSection("students")} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 12 }}>View all →</button>
                </div>
                {students.slice(0, 5).map(s => (
                  <div key={s._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 1.25rem", borderBottom: "1px solid #1e2130" }}>
                    {avatarDiv((s.full_name || s.username || "?").charAt(0).toUpperCase(), "rgba(15, 64, 106, 0.13)", "#60a5fa")}
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: "#111827" }}>{s.full_name || s.username}</p>
                      {/* <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>Grade {s.grade_level ?? "—"}</p> */}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #2d3140", overflow: "hidden" }}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #2d3140", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#111827" }}>Recent Teachers</p>
                  <button onClick={() => setSection("teachers")} style={{ background: "none", border: "none", color: "#c084fc", cursor: "pointer", fontSize: 12 }}>View all →</button>
                </div>
                {teachers.slice(0, 5).map(t => (
                  <div key={t._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 1.25rem", borderBottom: "1px solid #1e2130" }}>
                    {avatarDiv((t.username || "?").charAt(0).toUpperCase(), "#a855f722", "#c084fc")}
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: "#111827" }}>{t.username}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "#111827" }}>{t.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        {(section === "students" || section === "teachers" || section === "parents") && (
          <div style={{ marginBottom: "1.25rem" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${section}...`}
              style={{
                width: 320, padding: "9px 14px", background: "#f9fafb",
                border: "1px solid #2d3140", borderRadius: 8, color: "#111827", fontSize: 13, outline: "none"
              }}
            />
          </div>
        )}

        {/* Students */}
        {section === "students" && !loading && (
          <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #2d3140", overflow: "hidden" }}>
            <table style={tableStyle}>
              <thead><tr>{["Name","Username","Language","Region","Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s._id}>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {avatarDiv((s.full_name || s.username || "?").charAt(0).toUpperCase(), "#3b82f622", "#60a5fa")}
                        <span style={{ color: "#111827" }}>{s.full_name || "—"}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: "#111827" }}>@{s.username}</td>
                    {/* <td style={tdStyle}><Badge text={`Grade ${s.grade_level ?? "—"}`} color="#3b82f6" /></td> */}
                    <td style={{ ...tdStyle, color: "#111827" }}>{s.preferred_language || "—"}</td>
                    <td style={{ ...tdStyle, color: "#111827" }}>{s.context?.region || "—"}</td>
                    <td style={tdStyle}>
                      <button style={actionBtn("#60a5fa")} onClick={() => setViewTarget({ type: "Student", data: s as unknown as Record<string, unknown> })}>View</button>
                      <button style={actionBtn("#a78bfa")} onClick={() => openEdit("student", s._id, s as unknown as Record<string, unknown>)}>Edit</button>
                      <button style={actionBtn("#f87171")} onClick={() => handleDelete("student", s._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#4b5563", padding: "2rem" }}>No students found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Teachers */}
        {section === "teachers" && !loading && (
          <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #2d3140", overflow: "hidden" }}>
            <table style={tableStyle}>
              <thead><tr>{["Username","Email","Joined","Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {filteredTeachers.map(t => (
                  <tr key={t._id}>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {avatarDiv((t.username || "?").charAt(0).toUpperCase(), "#a855f722", "#c084fc")}
                        <span style={{ color: "#111827" }}>{t.username}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: "#111827" }}>{t.email}</td>
                    <td style={{ ...tdStyle, color: "#111827" }}>{t.created_at ? new Date(t.created_at).toLocaleDateString("en-GB") : "—"}</td>
                    <td style={tdStyle}>
                      <button style={actionBtn("#60a5fa")} onClick={() => setViewTarget({ type: "Teacher", data: t as unknown as Record<string, unknown> })}>View</button>
                      <button style={actionBtn("#a78bfa")} onClick={() => openEdit("teacher", t._id, t as unknown as Record<string, unknown>)}>Edit</button>
                      <button style={actionBtn("#f87171")} onClick={() => handleDelete("teacher", t._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredTeachers.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "#4b5563", padding: "2rem" }}>No teachers found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Parents */}
        {section === "parents" && !loading && (
          <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #2d3140", overflow: "hidden" }}>
            <table style={tableStyle}>
              <thead><tr>{["Username","Email","Relationship","Children","Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {filteredParents.map(p => (
                  <tr key={p._id}>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {avatarDiv((p.username || "?").charAt(0).toUpperCase(), "#10b98122", "#34d399")}
                        <span style={{ color: "#e2e8f0" }}>{p.username}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: "#94a3b8" }}>{p.email}</td>
                    <td style={tdStyle}><Badge text={p.relationship_type} color="#10b981" /></td>
                    <td style={{ ...tdStyle, color: "#94a3b8" }}>
                      {p.children_ids?.length > 0 ? p.children_ids.map(c => c.full_name || c.username).join(", ") : "—"}
                    </td>
                    <td style={tdStyle}>
                      <button style={actionBtn("#60a5fa")} onClick={() => setViewTarget({ type: "Parent", data: p as unknown as Record<string, unknown> })}>View</button>
                      <button style={actionBtn("#a78bfa")} onClick={() => openEdit("parent", p._id, p as unknown as Record<string, unknown>)}>Edit</button>
                      <button style={actionBtn("#f87171")} onClick={() => handleDelete("parent", p._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredParents.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "#4b5563", padding: "2rem" }}>No parents found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {section === "classes" && (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Class</th>
                <th style={thStyle}>Grade</th>
                <th style={thStyle}>School</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(c => (
                <tr key={c._id}>
                  <td style={tdStyle}>{c.class_name}</td>
                  <td style={tdStyle}>{c.grade_level}</td>
                  <td style={tdStyle}>{c.school_name}</td>
                  <td style={tdStyle}>
                    <button onClick={() => openEdit("class", c._id, c)}>Edit</button>
                    <button onClick={() => handleDelete("class", c._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {section === "subjects" && (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s._id}>
                  <td style={tdStyle}>{s.name}</td>
                  <td style={tdStyle}>{s.category}</td>
                  <td style={tdStyle}>
                    <button onClick={() => openEdit("subject", s._id, s)}>Edit</button>
                    <button onClick={() => handleDelete("subject", s._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {section === "admins" && (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(a => (
                <tr key={a._id}>
                  <td style={tdStyle}>{a.username}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleDelete("admin", a._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Create */}
        {section === "create" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 700 }}>
            {[
              { label: "New Student", href: "/admin/create-student", color: "#3b82f6", icon: "⊙" },
              { label: "New Teacher", href: "/admin/create-teacher", color: "#a855f7", icon: "⊕" },
              { label: "New Parent",  href: "/admin/create-parent",  color: "#10b981", icon: "⊗" },
              { label: "New Subject", href: "/admin/create-subject", color: "#f59e0b", icon: "◎" },
              { label: "New Class",   href: "/admin/create-class",   color: "#ef4444", icon: "⊞" },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "#ffffff", border: `1px solid ${item.color}33`,
                  borderRadius: 12, padding: "1.5rem", cursor: "pointer",
                  borderTop: `3px solid ${item.color}`
                }}>
                  <div style={{ fontSize: 28, marginBottom: 10, color: item.color }}>{item.icon}</div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#111827" }}>{item.label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>Create new record →</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* View modal */}
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
            style={{ marginTop: 16, padding: "9px 20px", background: "#a78bfa22", border: "1px solid #a78bfa55", borderRadius: 8, color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Edit this profile →
          </button>
        </Modal>
      )}

      {/* Edit modal */}
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
              {/* <EditField label="Grade Level"        name="grade_level"        value={editForm.grade_level ?? ""}        onChange={handleEditChange} type="number" /> */}
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
                {teacherSubjects.length === 0 && <span style={{ fontSize: 12, color: "#6b7280" }}>No subjects assigned yet.</span>}
                {teacherSubjects.map(sid => {
                  const subj = allSubjects.find(s => s._id === sid)
                  return (
                    <div key={sid} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, fontSize: 12, background: "#a855f722", border: "1px solid #a855f744", color: "#c084fc" }}>
                      {subj?.name ?? sid}
                      <button onClick={() => handleRemoveSubject(sid)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={addingSubjectId} onChange={e => setAddingSubjectId(e.target.value)}
                  style={{ flex: 1, padding: "8px 10px", background: "#f9fafb", border: "1px solid #2d3140", borderRadius: 8, color: "#111827", fontSize: 13, outline: "none" }}>
                  <option value="">Select subject to add...</option>
                  {allSubjects.filter(s => !teacherSubjects.includes(s._id)).map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.category})</option>
                  ))}
                </select>
                <button onClick={handleAddSubject} disabled={!addingSubjectId || saving}
                  style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: addingSubjectId ? "pointer" : "not-allowed", background: "#a855f722", border: "1px solid #a855f755", color: "#c084fc" }}>
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Parent */}
          {editTarget.type === "parent" && (
            <div>
              <EditField label="Username" name="username" value={editForm.username ?? ""} onChange={handleEditChange} />
              <EditField label="Email"    name="email"    value={editForm.email ?? ""}    onChange={handleEditChange} type="email" />
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>Relationship Type</label>
                <select value={editForm.relationship_type ?? ""} onChange={e => handleEditChange("relationship_type", e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", background: "#f9fafb", border: "1px solid #2d3140", borderRadius: 8, color: "#111827", fontSize: 13, outline: "none" }}>
                  <option value="mother">Mother</option>
                  <option value="father">Father</option>
                </select>
              </div>

              <SectionLabel text="Linked Children" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {parentChildren.length === 0 && <span style={{ fontSize: 12, color: "#6b7280" }}>No children linked yet.</span>}
                {parentChildren.map(child => (
                  <div key={child._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "#10b98118", border: "1px solid #10b98133" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {avatarDiv((child.full_name || child.username).charAt(0).toUpperCase(), "#10b98122", "#34d399")}
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: "#e2e8f0" }}>{child.full_name || child.username}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>@{child.username}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveChild(child._id)} style={{ background: "none", border: "1px solid #f8717144", borderRadius: 6, color: "#f87171", cursor: "pointer", fontSize: 12, padding: "3px 10px" }}>Remove</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={addingChildId} onChange={e => setAddingChildId(e.target.value)}
                  style={{ flex: 1, padding: "8px 10px", background: "#f9fafb", border: "1px solid #2d3140", borderRadius: 8, color: "#111827", fontSize: 13, outline: "none" }}>
                  <option value="">Select student to link...</option>
                  {availableStudents.map(s => (
                    <option key={s._id} value={s._id}>{s.full_name || s.username}</option>
                  ))}
                </select>
                <button onClick={handleAddChild} disabled={!addingChildId || saving}
                  style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: addingChildId ? "pointer" : "not-allowed", background: "#10b98122", border: "1px solid #10b98155", color: "#34d399" }}>
                  Link
                </button>
              </div>
            </div>
          )}

          {saveMsg && (
            <p style={{ color: saveMsg.includes("Failed") ? "#f87171" : "#34d399", fontSize: 13, margin: "14px 0 0", fontWeight: 500 }}>
              {saveMsg}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: "9px 22px", background: "#3b82f622", border: "1px solid #3b82f655", borderRadius: 8, color: "#60a5fa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => setEditTarget(null)} style={{ padding: "9px 16px", background: "none", border: "1px solid #2d3140", borderRadius: 8, color: "#6b7280", fontSize: 13, cursor: "pointer" }}>
              Close
            </button>
          </div>
        </Modal>
      )}

    </div>
  )
}