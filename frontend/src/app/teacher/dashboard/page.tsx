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

// group assignments by subject name
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

// ── Component ──────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [error, setError] = useState<string | null>(null)

  // selected state
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

  // proficiency editing
  const [editingStudent, setEditingStudent] = useState<string | null>(null)
  const [profLevel, setProfLevel] = useState<string>("beginner")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }

    fetch(`${API}/api/teachers/profile`, {
      headers: { Authorization: `Bearer ${token}` }
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

  const getStudentProficiency = (student: StudentInClass, category: string) => {
    return student.proficiency_levels?.find(p => p.category === category)?.level ?? "not set"
  }

  const handleSaveProficiency = async (studentId: string) => {
    if (!selectedSubject) return
    setSaving(true)
    setSaveMsg(null)
    const token = localStorage.getItem("token")

    try {
      const res = await fetch(`${API}/api/students/proficiency/${studentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: selectedSubject.name,
          level: profLevel
        })
      })

      if (!res.ok) throw new Error("Failed to save")

      // update local state so UI reflects change immediately
      setSelectedClass(prev => {
        if (!prev) return prev
        return {
          ...prev,
          students: prev.students.map(s => {
            if (s._id !== studentId) return s
            const existing = s.proficiency_levels.find(p => p.category === selectedSubject.name)
            if (existing) {
              return {
                ...s,
                proficiency_levels: s.proficiency_levels.map(p =>
                  p.category === selectedSubject.name ? { ...p, level: profLevel } : p
                )
              }
            }
            return {
              ...s,
              proficiency_levels: [...s.proficiency_levels, { category: selectedSubject.name, level: profLevel, assigned_by: "teacher" }]
            }
          })
        }
      })

      setSaveMsg("Saved!")
      setEditingStudent(null)
    } catch (err) {
      setSaveMsg("Failed to save.")
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  const levelColor: Record<string, string> = {
    beginner: "#dbeafe",
    advanced: "#fef9c3",
    expert:   "#dcfce7",
    "not set": "#f3f4f6"
  }
  const levelText: Record<string, string> = {
    beginner: "#1e40af",
    advanced: "#854d0e",
    expert:   "#166534",
    "not set": "#6b7280"
  }

  if (error) return <p style={{ color: "red", padding: "2rem" }}>Error: {error}</p>
  if (!teacher) return <p style={{ padding: "2rem" }}>Loading...</p>

  const grouped = groupBySubject(teacher.teaching_assignments)

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif", fontSize: 14 }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 280, minHeight: "100vh", borderRight: "1px solid #e5e7eb",
        background: "#f9fafb", padding: "1.5rem 1rem", flexShrink: 0
      }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{teacher.username}</p>
          <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: 12 }}>{teacher.email}</p>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 1.25rem" }} />

        {grouped.length === 0 && (
          <p style={{ color: "#9ca3af", fontSize: 13 }}>No classes assigned yet.</p>
        )}

        {grouped.map(({ subject, classes }) => (
          <div key={subject._id} style={{ marginBottom: "1.25rem" }}>
            {/* Subject header */}
            <p style={{
              margin: "0 0 6px", fontSize: 11, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280"
            }}>
              {subject.name}
            </p>

            {classes.map(cls => {
              const isActive = selectedClass?._id === cls._id && selectedSubject?._id === subject._id
              return (
                <button
                  key={cls._id + subject._id}
                  onClick={() => handleSelectClass(cls, subject)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "8px 10px", marginBottom: 4, cursor: "pointer",
                    borderRadius: 8, border: "none",
                    background: isActive ? "#dbeafe" : "transparent",
                    color: isActive ? "#1e40af" : "#111827",
                    fontWeight: isActive ? 600 : 400
                  }}
                >
                  <span style={{ display: "block", fontSize: 13 }}>{cls.class_name}</span>
                  <span style={{ display: "block", fontSize: 11, color: isActive ? "#3b82f6" : "#9ca3af" }}>
                    {cls.school_name} · Grade {cls.grade_level}
                  </span>
                </button>
              )
            })}
          </div>
        ))}

        <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "1rem 0" }} />
        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: "8px", borderRadius: 8, cursor: "pointer",
            background: "none", border: "1px solid #e5e7eb", color: "#6b7280"
          }}
        >
          Logout
        </button>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, padding: "2rem" }}>
        {!selectedClass ? (
          <div style={{ color: "#9ca3af", marginTop: "4rem", textAlign: "center" }}>
            <p style={{ fontSize: 18 }}>Select a class from the sidebar</p>
          </div>
        ) : (
          <>
            {/* Class header */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
                {selectedClass.class_name}
              </h1>
              <p style={{ margin: "4px 0 0", color: "#6b7280" }}>
                {selectedClass.school_name} · Grade {selectedClass.grade_level} ·{" "}
                <span style={{
                  background: "#ede9fe", color: "#6d28d9",
                  borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 500
                }}>
                  {selectedSubject?.name}
                </span>
              </p>
              {saveMsg && (
                <p style={{ margin: "8px 0 0", color: saveMsg === "Saved!" ? "#16a34a" : "#dc2626", fontWeight: 500 }}>
                  {saveMsg}
                </p>
              )}
            </div>

            {/* Students table */}
            {selectedClass.students.length === 0 ? (
              <p style={{ color: "#9ca3af" }}>No students in this class.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Student</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Username</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Grade</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>
                      {selectedSubject?.name} Proficiency
                    </th>
                    <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedClass.students.map(student => {
                    const currentLevel = getStudentProficiency(student, selectedSubject?.name ?? "")
                    const isEditing = editingStudent === student._id

                    return (
                      <tr key={student._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                          {student.full_name || "—"}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>
                          {student.username}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>
                          {student.grade_level ?? "—"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {isEditing ? (
                            <select
                              value={profLevel}
                              onChange={e => setProfLevel(e.target.value)}
                              style={{
                                padding: "4px 8px", borderRadius: 6,
                                border: "1px solid #d1d5db", fontSize: 13
                              }}
                            >
                              <option value="beginner">Beginner</option>
                              <option value="advanced">Advanced</option>
                              <option value="expert">Expert</option>
                            </select>
                          ) : (
                            <span style={{
                              padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                              background: levelColor[currentLevel] ?? "#f3f4f6",
                              color: levelText[currentLevel] ?? "#6b7280"
                            }}>
                              {currentLevel}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => handleSaveProficiency(student._id)}
                                disabled={saving}
                                style={{
                                  padding: "4px 14px", borderRadius: 6, cursor: "pointer",
                                  background: "#2563eb", color: "#fff", border: "none", fontSize: 12
                                }}
                              >
                                {saving ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingStudent(null)}
                                style={{
                                  padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                                  background: "none", border: "1px solid #d1d5db", fontSize: 12
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingStudent(student._id)
                                setProfLevel(currentLevel === "not set" ? "beginner" : currentLevel)
                              }}
                              style={{
                                padding: "4px 14px", borderRadius: 6, cursor: "pointer",
                                background: "none", border: "1px solid #d1d5db",
                                fontSize: 12, color: "#374151"
                              }}
                            >
                              Set Level
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </main>
    </div>
  )
}