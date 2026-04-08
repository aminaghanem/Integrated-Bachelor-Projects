"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const API = "http://localhost:4000"

export default function CreateAdmin() {
  const router = useRouter()
  const [form, setForm] = useState({ username: "", password: "", confirmPassword: "" })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    setError(null)
    setSuccess(null)

    if (!form.username.trim() || !form.password.trim()) {
      setError("Username and password are required."); return
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters."); return
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match."); return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API}/api/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`
        },
        body: JSON.stringify({ username: form.username, password: form.password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create admin")
      setSuccess(`Admin "${data.username}" created successfully.`)
      setForm({ username: "", password: "", confirmPassword: "" })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", fontSize: 14,
    border: "1px solid #e5e7eb", borderRadius: 8,
    background: "#f9fafb", color: "#111827",
    outline: "none", boxSizing: "border-box"
  }
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em"
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Back link */}
        <Link href="/admin/dashboard" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
          ← Back to Dashboard
        </Link>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.75rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              ⚑
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>Create Admin</h1>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>SmartGuard Admin Panel</p>
            </div>
          </div>

          {/* Fields */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Username</label>
            <input name="username" value={form.username} onChange={handleChange}
              placeholder="e.g. admin_sara"
              style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Password</label>
            <input name="password" value={form.password} onChange={handleChange}
              type="password" placeholder="Min. 6 characters"
              style={inputStyle} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Confirm Password</label>
            <input name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
              type="password" placeholder="Repeat password"
              style={inputStyle} />
          </div>

          {/* Messages */}
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

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading}
            style={{
              width: "100%", padding: "11px", borderRadius: 8, border: "none",
              background: loading ? "#e5e7eb" : "linear-gradient(135deg, #3b82f6, #6366f1)",
              color: loading ? "#9ca3af" : "#fff",
              fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.02em"
            }}>
            {loading ? "Creating..." : "Create Admin Account"}
          </button>
        </div>
      </div>
    </div>
  )
}