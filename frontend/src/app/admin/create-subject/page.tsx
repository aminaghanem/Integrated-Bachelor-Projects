"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@400;600;700&display=swap');
  @keyframes mc-spinner { to { transform: rotate(360deg); } }
  @keyframes mc-fadein  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes mc-glow    { 0%,100% { text-shadow: 0 0 8px rgba(255,230,0,0.4); } 50% { text-shadow: 0 0 20px rgba(255,230,0,0.8), 0 0 40px rgba(255,230,0,0.3); } }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,230,0,0.3); border-radius: 3px; }
  .mc-input { transition: border-color 0.2s; }
  .mc-input:focus { border-color: rgba(255,230,0,0.5) !important; outline: none; }
  .mc-input::placeholder { color: rgba(255,255,255,0.18); font-family: 'Share Tech Mono', monospace; }
  .mc-select:focus { border-color: rgba(255,230,0,0.5) !important; outline: none; }
  .mc-select option { background: #1a0e2e; color: #e8e8f0; }
  .mc-back:hover { color: #ffe600 !important; }
  .mc-submit:not(:disabled):hover { filter: brightness(1.15); transform: translateY(-1px); }
  .mc-cat-badge { transition: all 0.15s; cursor: pointer; }
  .mc-cat-badge:hover { filter: brightness(1.25); }
`

const CATEGORIES = ["STEM", "Mathematics", "Sciences", "Languages", "Humanities", "Arts"]

const CAT_ACCENTS: Record<string, string> = {
  STEM: "#5b8dee", Mathematics: "#cb6ce6", Sciences: "#00ff88",
  Languages: "#ffa500", Humanities: "#ff503c", Arts: "#ff69b4",
}

export default function CreateSubject() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", category: "STEM", grade_levels: "" })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const el = document.createElement("style"); el.textContent = STYLES
    document.head.appendChild(el); return () => { document.head.removeChild(el) }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("")
    if (!form.name.trim()) { setError("SUBJECT NAME IS REQUIRED"); return }
    if (!form.grade_levels.trim()) { setError("AT LEAST ONE GRADE LEVEL IS REQUIRED"); return }
    setLoading(true)
    try {
      const res = await fetch("http://localhost:4000/api/subjects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, grade_levels: form.grade_levels.split(",").map(g => g.trim()).filter(Boolean) })
      })
      const data = await res.json()
      if (!res.ok) { setError((data.error || "SOMETHING WENT WRONG").toUpperCase()); return }
      router.push("/admin/dashboard")
    } catch { setError("SOMETHING WENT WRONG. PLEASE TRY AGAIN.") }
    finally { setLoading(false) }
  }

  const accent = "#ffe600"
  const catAccent = CAT_ACCENTS[form.category] ?? accent

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", fontSize: 13,
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
    background: "rgba(255,255,255,0.04)", color: "#e8e8f0",
    fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.04em",
  }

  return (
    <div style={{ minHeight: "100vh", background: "#7a59af", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Exo 2', sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(255,230,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,230,0,0.05) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 0%, rgba(255,230,0,0.08) 0%, transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480, animation: "mc-fadein 0.3s ease" }}>
        <Link href="/admin/dashboard" className="mc-back" style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em", transition: "color 0.15s" }}>
          ← BACK TO DASHBOARD
        </Link>

        <div style={{ background: "rgba(10,10,26,0.7)", backdropFilter: "blur(16px)", borderRadius: 16, border: `1px solid ${accent}44`, padding: "2rem", boxShadow: `0 0 40px ${accent}15, 0 24px 48px rgba(0,0,0,0.4)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "2rem" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${catAccent}18`, border: `1px solid ${catAccent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, transition: "all 0.3s" }}>◎</div>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: accent, letterSpacing: "0.08em", animation: "mc-glow 3s ease-in-out infinite" }}>CREATE SUBJECT</div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginTop: 5 }}>PLAY & LEARN · ADMIN PANEL</div>
            </div>
          </div>

          {/* Subject name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontFamily: "'Orbitron', monospace", fontSize: 8, color: `${accent}88`, letterSpacing: "0.15em", marginBottom: 7 }}>SUBJECT NAME</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Algebra, Biology, World History" className="mc-input" style={inputStyle} />
          </div>

          {/* Category select */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontFamily: "'Orbitron', monospace", fontSize: 8, color: `${accent}88`, letterSpacing: "0.15em", marginBottom: 7 }}>CATEGORY</label>
            <select name="category" value={form.category} onChange={handleChange} className="mc-select"
              style={{ ...inputStyle, appearance: "none" as React.CSSProperties["appearance"], cursor: "pointer" }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Category badge picker */}
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIES.map(c => {
                const col = CAT_ACCENTS[c]
                const isActive = form.category === c
                return (
                  <span key={c} onClick={() => setForm(f => ({ ...f, category: c }))} className="mc-cat-badge"
                    style={{ padding: "4px 12px", borderRadius: 20, fontSize: 9, fontWeight: 600, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em", background: isActive ? `${col}22` : "rgba(255,255,255,0.04)", color: isActive ? col : "rgba(255,255,255,0.25)", border: `1px solid ${isActive ? col + "55" : "rgba(255,255,255,0.08)"}` }}>
                    {c.toUpperCase()}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Grade levels */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontFamily: "'Orbitron', monospace", fontSize: 8, color: `${accent}88`, letterSpacing: "0.15em", marginBottom: 7 }}>GRADE LEVELS</label>
            <input name="grade_levels" value={form.grade_levels} onChange={handleChange} placeholder="e.g. 10, 11, 12" className="mc-input" style={inputStyle} />
            <div style={{ marginTop: 5, fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em" }}>COMMA-SEPARATED GRADE NUMBERS.</div>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(255,80,60,0.1)", border: "1px solid rgba(255,80,60,0.35)", color: "#ff503c", fontSize: 10, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em" }}>
              ⚠ {error}
            </div>
          )}
          {success && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88", fontSize: 10, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em" }}>
              ✓ {success}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className="mc-submit"
            style={{ width: "100%", padding: "12px", borderRadius: 8, border: `1px solid ${catAccent}55`, background: loading ? "rgba(255,255,255,0.05)" : `${catAccent}20`, color: loading ? "rgba(255,255,255,0.2)" : catAccent, fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><div style={{ width: 12, height: 12, border: `2px solid ${catAccent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "mc-spinner 0.7s linear infinite" }} />CREATING…</> : "CREATE SUBJECT"}
          </button>
        </div>
      </div>
    </div>
  )
}