"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ParentSignup() {
  const router = useRouter()

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    relationship_type: ""
  })

  // Dynamic children list — replaces the comma-separated input
  // Backend still receives: children_usernames: string[]
  const [childUsernames, setChildUsernames] = useState<string[]>([""])

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleChildChange = (index: number, value: string) => {
    const updated = [...childUsernames]
    updated[index] = value
    setChildUsernames(updated)
  }

  const addChild = () => setChildUsernames([...childUsernames, ""])

  const removeChild = (index: number) => {
    if (childUsernames.length === 1) return   // keep at least one
    setChildUsernames(childUsernames.filter((_, i) => i !== index))
  }

  const validateForm = () => {
    if (!form.username.trim()) return "Username is required"
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) return "Invalid email format"
    if (form.password.length < 6) return "Password must be at least 6 characters"
    if (form.password !== form.confirmPassword) return "Passwords do not match"
    if (!form.relationship_type) return "Please select your relationship type"
    const filledChildren = childUsernames.filter(c => c.trim())
    if (filledChildren.length === 0) return "Please enter at least one child's username"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault()
      setError("")
      const validationError = validateForm()
      if (validationError) { setError(validationError); return }

      setLoading(true)

      // Same backend payload as before — just built from array instead of split string
      const children_usernames = childUsernames.map(c => c.trim()).filter(Boolean)

      const res = await fetch("http://localhost:4000/api/auth/signup/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          relationship_type: form.relationship_type,
          children_usernames
        })
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
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #10b981, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              ⊗
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>Parent Sign Up</h1>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>SmartGuard · School Portal</p>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Username</label>
            <input name="username" value={form.username} onChange={handleChange} placeholder="e.g. parent_omar" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="your@email.com" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Password</label>
            <input name="password" value={form.password} onChange={handleChange} type="password" placeholder="Min. 6 characters" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Confirm Password</label>
            <input name="confirmPassword" value={form.confirmPassword} onChange={handleChange} type="password" placeholder="Repeat password" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Relationship</label>
            <select name="relationship_type" value={form.relationship_type} onChange={handleChange}
              style={{ ...inputStyle, appearance: "none" as React.CSSProperties["appearance"] }}>
              <option value="">Select relationship type</option>
              <option value="mother">Mother</option>
              <option value="father">Father</option>
            </select>
          </div>

          {/* Children — dynamic rows instead of comma-separated text */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ ...labelStyle, margin: 0 }}>Children's Usernames</label>
              <button type="button" onClick={addChild}
                style={{ fontSize: 12, fontWeight: 600, color: "#10b981", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
                + Add child
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {childUsernames.map((child, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#10b981", flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <input
                    value={child}
                    onChange={e => handleChildChange(i, e.target.value)}
                    placeholder={`Child ${i + 1} username`}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {childUsernames.length > 1 && (
                    <button type="button" onClick={() => removeChild(i)}
                      style={{ background: "none", border: "1px solid #fecaca", borderRadius: 6, color: "#ef4444", cursor: "pointer", fontSize: 16, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#9ca3af" }}>
              Enter the username of each child registered in the system.
            </p>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", background: loading ? "#e5e7eb" : "linear-gradient(135deg, #10b981, #06b6d4)", color: loading ? "#9ca3af" : "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.02em" }}>
            {loading ? "Creating account..." : "Create Parent Account"}
          </button>

          <p style={{ margin: "16px 0 0", fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#10b981", textDecoration: "none", fontWeight: 600 }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}