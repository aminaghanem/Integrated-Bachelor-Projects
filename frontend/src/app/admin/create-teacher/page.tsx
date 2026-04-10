"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function TeacherSignup() {
  const router = useRouter()

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const validateForm = () => {
    if (!form.username.trim()) return "Username is required"
    const teacherEmailRegex = /^[^\s@]+@teacher\.school\.edu\.eg$/
    if (!teacherEmailRegex.test(form.email)) return "Please use your school teacher email (@teacher.school.edu.eg)"
    if (form.password.length < 6) return "Password must be at least 6 characters"
    if (form.password !== form.confirmPassword) return "Passwords do not match"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault()
      setError("")
      const validationError = validateForm()
      if (validationError) { setError(validationError); return }

      setLoading(true)
      const res = await fetch("http://localhost:4000/api/auth/signup/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password, confirmPassword: form.confirmPassword })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || "Signup failed"); return }
      localStorage.setItem("token", data.token)
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

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        <Link href="/admin/dashboard" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
          ← Back to Dashboard
        </Link>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.75rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #a855f7, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              ⊕
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>Teacher Sign Up</h1>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>SmartGuard · School Portal</p>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Username</label>
            <input name="username" value={form.username} onChange={handleChange} placeholder="e.g. mr_ahmed" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>School Email</label>
            <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="you@teacher.school.edu.eg" style={inputStyle} />
            <p style={{ margin: "5px 0 0", fontSize: 11, color: "#9ca3af" }}>Must end in @teacher.school.edu.eg</p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Password</label>
            <input name="password" value={form.password} onChange={handleChange} type="password" placeholder="Min. 6 characters" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Confirm Password</label>
            <input name="confirmPassword" value={form.confirmPassword} onChange={handleChange} type="password" placeholder="Repeat password" style={inputStyle} />
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", background: loading ? "#e5e7eb" : "linear-gradient(135deg, #a855f7, #6366f1)", color: loading ? "#9ca3af" : "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.02em" }}>
            {loading ? "Creating account..." : "Create Teacher Account"}
          </button>

          <p style={{ margin: "16px 0 0", fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#a855f7", textDecoration: "none", fontWeight: 600 }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}