"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@400;600;700&display=swap');
  @keyframes mc-spinner { to { transform: rotate(360deg); } }
  @keyframes mc-fadein  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes mc-glow    { 0%,100% { text-shadow: 0 0 8px rgba(0,255,136,0.4); } 50% { text-shadow: 0 0 20px rgba(0,255,136,0.8), 0 0 40px rgba(0,255,136,0.3); } }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-thumb { background: rgba(0,255,136,0.3); border-radius: 3px; }
  .mc-input { transition: border-color 0.2s; }
  .mc-input:focus { border-color: rgba(0,255,136,0.5) !important; outline: none; }
  .mc-input::placeholder { color: rgba(255,255,255,0.18); font-family: 'Share Tech Mono', monospace; }
  .mc-select:focus { border-color: rgba(0,255,136,0.5) !important; outline: none; }
  .mc-select option { background: #1a0e2e; color: #e8e8f0; }
  .mc-back:hover { color: #ffe600 !important; }
  .mc-submit:not(:disabled):hover { filter: brightness(1.15); transform: translateY(-1px); }
  .mc-add-btn:hover { border-color: #ffe600 !important; color: #ffe600 !important; }
  .mc-remove-btn:hover { color: #ff503c !important; border-color: rgba(255,80,60,0.5) !important; }
`

export default function ParentSignup() {
  const router = useRouter()
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "", relationship_type: "" })
  const [childUsernames, setChildUsernames] = useState<string[]>([""])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const el = document.createElement("style"); el.textContent = STYLES
    document.head.appendChild(el); return () => { document.head.removeChild(el) }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleChildChange = (index: number, value: string) => {
    const updated = [...childUsernames]; updated[index] = value; setChildUsernames(updated)
  }
  const addChild = () => setChildUsernames([...childUsernames, ""])
  const removeChild = (index: number) => {
    if (childUsernames.length === 1) return
    setChildUsernames(childUsernames.filter((_, i) => i !== index))
  }

  const validateForm = () => {
    if (!form.username.trim()) return "USERNAME IS REQUIRED"
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) return "INVALID EMAIL FORMAT"
    if (form.password.length < 6) return "PASSWORD MUST BE AT LEAST 6 CHARACTERS"
    if (form.password !== form.confirmPassword) return "PASSWORDS DO NOT MATCH"
    if (!form.relationship_type) return "PLEASE SELECT YOUR RELATIONSHIP TYPE"
    if (childUsernames.filter(c => c.trim()).length === 0) return "PLEASE ENTER AT LEAST ONE CHILD'S USERNAME"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault(); setError("")
      const validationError = validateForm()
      if (validationError) { setError(validationError); return }
      setLoading(true)
      const children_usernames = childUsernames.map(c => c.trim()).filter(Boolean)
      const res = await fetch("http://localhost:4000/api/auth/signup/parent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password, relationship_type: form.relationship_type, children_usernames })
      })
      const data = await res.json()
      if (!res.ok) { setError((data.message || "SIGNUP FAILED").toUpperCase()); return }
      localStorage.setItem("token", data.token)
      router.push("/admin/dashboard")
    } catch { setError("SOMETHING WENT WRONG. PLEASE TRY AGAIN.") }
    finally { setLoading(false) }
  }

  const accent = "#00ff88"

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", fontSize: 13,
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
    background: "rgba(255,255,255,0.04)", color: "#e8e8f0",
    fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.04em",
  }

  return (
    <div style={{ minHeight: "100vh", background: "#7a59af", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem", fontFamily: "'Exo 2', sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(0,255,136,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.05) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 0%, rgba(0,255,136,0.08) 0%, transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480, animation: "mc-fadein 0.3s ease" }}>
        <Link href="/admin/dashboard" className="mc-back" style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em", transition: "color 0.15s" }}>
          ← BACK TO DASHBOARD
        </Link>

        <div style={{ background: "rgba(10,10,26,0.7)", backdropFilter: "blur(16px)", borderRadius: 16, border: `1px solid ${accent}33`, padding: "2rem", boxShadow: `0 0 40px ${accent}12, 0 24px 48px rgba(0,0,0,0.4)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "2rem" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${accent}15`, border: `1px solid ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>⊗</div>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: accent, letterSpacing: "0.06em", animation: "mc-glow 3s ease-in-out infinite" }}>PARENT SIGN UP</div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginTop: 5 }}>PLAY & LEARN · SCHOOL PORTAL</div>
            </div>
          </div>

          {/* Basic fields */}
          {[
            { label: "USERNAME",         name: "username",        type: "text",     placeholder: "e.g. parent_omar" },
            { label: "EMAIL",            name: "email",           type: "email",    placeholder: "your@email.com" },
            { label: "PASSWORD",         name: "password",        type: "password", placeholder: "Min. 6 characters" },
            { label: "CONFIRM PASSWORD", name: "confirmPassword", type: "password", placeholder: "Repeat password" },
          ].map(f => (
            <div key={f.name} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontFamily: "'Orbitron', monospace", fontSize: 8, color: `${accent}88`, letterSpacing: "0.15em", marginBottom: 7 }}>{f.label}</label>
              <input name={f.name} value={form[f.name as keyof typeof form]} onChange={handleChange} type={f.type} placeholder={f.placeholder} className="mc-input" style={inputStyle} />
            </div>
          ))}

          {/* Relationship */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontFamily: "'Orbitron', monospace", fontSize: 8, color: `${accent}88`, letterSpacing: "0.15em", marginBottom: 7 }}>RELATIONSHIP</label>
            <select name="relationship_type" value={form.relationship_type} onChange={handleChange} className="mc-select"
              style={{ ...inputStyle, appearance: "none" as React.CSSProperties["appearance"], cursor: "pointer" }}>
              <option value="">SELECT RELATIONSHIP TYPE</option>
              <option value="mother">Mother</option>
              <option value="father">Father</option>
            </select>
          </div>

          {/* Children */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={{ fontFamily: "'Orbitron', monospace", fontSize: 8, color: `${accent}88`, letterSpacing: "0.15em" }}>CHILDREN'S USERNAMES</label>
              <button type="button" onClick={addChild} className="mc-add-btn"
                style={{ fontSize: 9, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em", color: accent, background: `${accent}12`, border: `1px solid ${accent}44`, borderRadius: 6, padding: "4px 12px", cursor: "pointer", transition: "all 0.15s" }}>
                + ADD CHILD
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {childUsernames.map((child, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: `${accent}12`, border: `1px solid ${accent}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: accent, flexShrink: 0, fontFamily: "'Orbitron', monospace" }}>
                    {i + 1}
                  </div>
                  <input value={child} onChange={e => handleChildChange(i, e.target.value)} placeholder={`Child ${i + 1} username`} className="mc-input" style={{ ...inputStyle, flex: 1 }} />
                  {childUsernames.length > 1 && (
                    <button type="button" onClick={() => removeChild(i)} className="mc-remove-btn"
                      style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 6, fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em" }}>
              ENTER THE USERNAME OF EACH CHILD REGISTERED IN THE SYSTEM.
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(255,80,60,0.1)", border: "1px solid rgba(255,80,60,0.35)", color: "#ff503c", fontSize: 10, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em" }}>
              ⚠ {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className="mc-submit"
            style={{ width: "100%", padding: "12px", borderRadius: 8, border: `1px solid ${accent}44`, background: loading ? "rgba(255,255,255,0.05)" : `${accent}15`, color: loading ? "rgba(255,255,255,0.2)" : accent, fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><div style={{ width: 12, height: 12, border: `2px solid ${accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "mc-spinner 0.7s linear infinite" }} />CREATING…</> : "CREATE PARENT ACCOUNT"}
          </button>

        </div>
      </div>
    </div>
  )
}