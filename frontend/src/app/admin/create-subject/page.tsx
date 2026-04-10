"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const CATEGORIES = ["STEM", "Mathematics", "Sciences", "Languages", "Humanities", "Arts"]

export default function CreateSubject() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", category: "STEM", grade_levels: "" })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.name.trim()) { setError("Subject name is required"); return }
    if (!form.grade_levels.trim()) { setError("At least one grade level is required"); return }

    setLoading(true)
    try {
      // Backend payload unchanged
      const res = await fetch("http://localhost:4000/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          grade_levels: form.grade_levels.split(",").map(g => g.trim()).filter(Boolean)
        })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Something went wrong"); return }
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

  const categoryColors: Record<string, string> = {
    STEM: "#3b82f6", Mathematics: "#8b5cf6", Sciences: "#10b981",
    Languages: "#f59e0b", Humanities: "#ef4444", Arts: "#ec4899"
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        <Link href="/admin/dashboard" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
          ← Back to Dashboard
        </Link>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.75rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #f59e0b, #ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              ◎
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>Create Subject</h1>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>SmartGuard Admin Panel</p>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Subject Name</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Algebra, Biology, World History" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Category</label>
            <select name="category" value={form.category} onChange={handleChange}
              style={{ ...inputStyle, appearance: "none" as React.CSSProperties["appearance"] }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Category badge preview */}
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIES.map(c => (
                <span key={c} onClick={() => setForm(f => ({ ...f, category: c }))}
                  style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: form.category === c ? categoryColors[c] + "22" : "#f3f4f6",
                    color: form.category === c ? categoryColors[c] : "#9ca3af",
                    border: `1px solid ${form.category === c ? categoryColors[c] + "55" : "#e5e7eb"}`
                  }}>
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Grade Levels</label>
            <input name="grade_levels" value={form.grade_levels} onChange={handleChange}
              placeholder="e.g. 10, 11, 12" style={inputStyle} />
            <p style={{ margin: "5px 0 0", fontSize: 11, color: "#9ca3af" }}>
              Comma-separated grade numbers.
            </p>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontSize: 13 }}>
              {success}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", background: loading ? "#e5e7eb" : "linear-gradient(135deg, #f59e0b, #ef4444)", color: loading ? "#9ca3af" : "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.02em" }}>
            {loading ? "Creating..." : "Create Subject"}
          </button>
        </div>
      </div>
    </div>
  )
}