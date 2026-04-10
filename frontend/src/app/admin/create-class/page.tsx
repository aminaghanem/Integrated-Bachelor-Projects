"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type SubjectRow = { subject_id: string; teacher_username: string }

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

  // Fetch teachers once on mount
  useEffect(() => {
    fetch("http://localhost:4000/api/teachers")
      .then(r => r.json())
      .then(data => setTeachers(Array.isArray(data) ? data : data.teachers || []))
      .catch(() => {})
  }, [])

  // Fetch subjects when grade changes
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

  // Subject row handlers
  const handleSubjectChange = (index: number, field: keyof SubjectRow, value: string) => {
    const updated = [...subjects]
    updated[index][field] = value
    setSubjects(updated)
  }

  const addSubject = () => setSubjects([...subjects, { subject_id: "", teacher_username: "" }])
  const removeSubject = (index: number) => setSubjects(subjects.filter((_, i) => i !== index))

  // Teacher change — checks teachable_subjects and offers to add (logic unchanged from original)
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
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject_id: subjectId })
        })
      }
    }
  }

  // Student row handlers
  const handleStudentChange = (index: number, value: string) => {
    const updated = [...students]
    updated[index] = value
    setStudents(updated)
  }
  const addStudent = () => setStudents([...students, ""])
  const removeStudent = (index: number) => setStudents(students.filter((_, i) => i !== index))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.school_name.trim() || !form.grade_level.trim() || !form.class_name.trim()) {
      setError("School name, grade level, and class name are required."); return
    }

    setLoading(true)
    try {
      // Payload identical to original
      const res = await fetch("http://localhost:4000/api/classes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_name: form.school_name,
          grade_level: Number(form.grade_level),
          class_name: form.class_name,
          subjects,
          student_usernames: students.filter(s => s.trim())
        })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || data.message || "Something went wrong"); return }
      setSuccess("Class created successfully.")
      setForm({ school_name: "", grade_level: "", class_name: "" })
      setSubjects([{ subject_id: "", teacher_username: "" }])
      setStudents([""])
      setAvailableSubjects([])
      router.push("/admin/dashboard")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", fontSize: 14,
    border: "1px solid #e5e7eb", borderRadius: 8,
    background: "#f9fafb", color: "#111827",
    outline: "none", boxSizing: "border-box"
  }
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "#6b7280", marginBottom: 6,
    textTransform: "uppercase", letterSpacing: "0.05em"
  }
  const sectionHeading: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "#6b7280",
    textTransform: "uppercase", letterSpacing: "0.08em",
    borderTop: "1px solid #e5e7eb", paddingTop: 16, margin: "20px 0 12px"
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        <Link href="/admin/dashboard" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
          ← Back to Dashboard
        </Link>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.75rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #ef4444, #f97316)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              ▣
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>Create Class</h1>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>SmartGuard Admin Panel</p>
            </div>
          </div>

          {/* Basic info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>School Name</label>
              <input name="school_name" value={form.school_name} onChange={handleFormChange} placeholder="e.g. GUC" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Grade Level</label>
              <input name="grade_level" value={form.grade_level} onChange={handleFormChange} placeholder="e.g. 10" type="number" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 4 }}>
            <label style={labelStyle}>Class Name</label>
            <input name="class_name" value={form.class_name} onChange={handleFormChange} placeholder="e.g. A, B, C" style={inputStyle} />
          </div>

          {/* Subjects section */}
          <p style={sectionHeading}>Subjects & Teachers</p>

          {!form.grade_level && (
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>Enter a grade level above to load available subjects.</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {subjects.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                <select value={s.subject_id} onChange={e => handleSubjectChange(i, "subject_id", e.target.value)}
                  style={{ ...inputStyle, appearance: "none" as React.CSSProperties["appearance"] }}>
                  <option value="">Select Subject</option>
                  {availableSubjects.map(sub => (
                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                  ))}
                </select>

                <select value={s.teacher_username} onChange={e => handleTeacherChange(i, e.target.value)}
                  style={{ ...inputStyle, appearance: "none" as React.CSSProperties["appearance"] }}>
                  <option value="">Select Teacher</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t.username}>{t.username}</option>
                  ))}
                </select>

                <button type="button" onClick={() => removeSubject(i)}
                  style={{ background: "none", border: "1px solid #fecaca", borderRadius: 6, color: "#ef4444", cursor: "pointer", fontSize: 16, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  ×
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addSubject}
            style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "5px 12px", cursor: "pointer", marginBottom: 4 }}>
            + Add subject row
          </button>

          {/* Students section */}
          <p style={sectionHeading}>Students</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {students.map((student, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#ef4444", flexShrink: 0 }}>
                  {i + 1}
                </div>
                <input value={student} onChange={e => handleStudentChange(i, e.target.value)}
                  placeholder={`Student ${i + 1} username`}
                  style={{ ...inputStyle, flex: 1 }} />
                {students.length > 1 && (
                  <button type="button" onClick={() => removeStudent(i)}
                    style={{ background: "none", border: "1px solid #fecaca", borderRadius: 6, color: "#ef4444", cursor: "pointer", fontSize: 16, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={addStudent}
            style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "5px 12px", cursor: "pointer", marginBottom: 4 }}>
            + Add student
          </button>

          {/* Messages */}
          {error && (
            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontSize: 13 }}>
              {success}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: "100%", padding: "11px", marginTop: 20, borderRadius: 8, border: "none", background: loading ? "#e5e7eb" : "linear-gradient(135deg, #ef4444, #f97316)", color: loading ? "#9ca3af" : "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.02em" }}>
            {loading ? "Creating..." : "Create Class"}
          </button>
        </div>
      </div>
    </div>
  )
}