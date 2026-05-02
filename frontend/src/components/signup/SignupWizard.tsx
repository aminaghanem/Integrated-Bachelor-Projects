"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Step1Account from "./Step1Account"
import Step2Profile from "./Step2Profile"
import Step3Interests from "./Step3Interests"
import Step4Accessibility from "./Step4Accessibility"
import Step5Review from "./Step5Review"
import Link from "next/link"

export interface SignupData {
  username: string
  password: string
  confirm_password: string
  full_name: string
  personal_email: string
  date_of_birth: string
  parent_email: string
  preferred_language: string
  region: string
  school_type: string
  learning_preferences: string
  interest_scores: { category: string; score: number }[]
  accessibility: {
    has_accessibility_needs: boolean
    sensory_limitations: string[]
    neurodiversity_flags: string[]
    sensory_other?: string
    neuro_other?: string
  }
}

type Errors = Record<string, string>

const STEP_LABELS = ["Account", "Profile", "Interests", "Access", "Review"]

// ── Shared design tokens (imported by all steps) ─────────────────
export const ACCENT = "#5b8dee"

export const mcInputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: 13,
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
  background: "rgba(255,255,255,0.04)", color: "#e8e8f0",
  fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.04em",
  outline: "none", boxSizing: "border-box",
  transition: "border-color 0.2s",
}

export const mcLabelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "'Orbitron', monospace", fontSize: 8,
  color: `${ACCENT}88`, letterSpacing: "0.15em", marginBottom: 7,
}

export const mcFieldStyle: React.CSSProperties = { marginBottom: 16 }

export const mcErrorStyle: React.CSSProperties = {
  margin: "6px 0 0", fontSize: 10, color: "#ff503c",
  fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em",
}

export const mcSectionDivider = (accent = ACCENT): React.CSSProperties => ({
  borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16,
  margin: "22px 0 14px", fontFamily: "'Orbitron', monospace",
  fontSize: 8, color: `${accent}88`, letterSpacing: "0.15em",
})

const WIZARD_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@400;600;700&display=swap');
  @keyframes mc-spinner { to { transform: rotate(360deg); } }
  @keyframes mc-fadein  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes mc-glow    { 0%,100% { text-shadow: 0 0 8px rgba(91,141,238,0.4); } 50% { text-shadow: 0 0 20px rgba(91,141,238,0.8), 0 0 40px rgba(91,141,238,0.3); } }
  @keyframes mc-prog    { from { width: 0; } }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-thumb { background: rgba(91,141,238,0.3); border-radius: 3px; }
  .mc-input { transition: border-color 0.2s; }
  .mc-input:focus { border-color: rgba(91,141,238,0.6) !important; outline: none; }
  .mc-input::placeholder { color: rgba(255,255,255,0.18); font-family: 'Share Tech Mono', monospace; }
  .mc-select { transition: border-color 0.2s; }
  .mc-select:focus { border-color: rgba(91,141,238,0.6) !important; outline: none; }
  .mc-select option { background: #1a0e2e; color: #e8e8f0; }
  .mc-back-link:hover { color: #ffe600 !important; }
  .mc-next-btn:not(:disabled):hover { filter: brightness(1.15); transform: translateY(-1px); }
  .mc-back-btn:hover { border-color: rgba(91,141,238,0.4) !important; color: #5b8dee !important; }
  .mc-check-item { transition: all 0.15s; }
  .mc-check-item:hover { border-color: rgba(91,141,238,0.4) !important; }
  .mc-star-btn:hover { transform: scale(1.2); }
  .mc-add-btn:hover { border-color: #ffe600 !important; color: #ffe600 !important; }
`

export default function SignupWizard() {
  const [errors, setErrors] = useState<Errors>({})
  const [step, setStep] = useState(1)
  const router = useRouter()
  const [formData, setFormData] = useState<SignupData>({
    username: "", password: "", confirm_password: "",
    full_name: "", personal_email: "", date_of_birth: "",
    parent_email: "", preferred_language: "", region: "",
    school_type: "", learning_preferences: "",
    interest_scores: [],
    accessibility: {
      has_accessibility_needs: false,
      sensory_limitations: [], neurodiversity_flags: [],
      sensory_other: "", neuro_other: ""
    }
  })

  useEffect(() => {
    const el = document.createElement("style"); el.textContent = WIZARD_STYLES
    document.head.appendChild(el); return () => { document.head.removeChild(el) }
  }, [])

  const nextStep = async () => { const valid = await validateStep(); if (valid) setStep(s => s + 1) }
  const prevStep = () => { setErrors({}); setStep(s => s - 1) }

  const updateField = (data: Partial<SignupData>) => {
    setFormData(prev => ({ ...prev, ...data }))
    setErrors(prev => { const next = { ...prev }; Object.keys(data).forEach(k => delete next[k]); return next })
  }

  const updateAccessibility = (data: Partial<SignupData["accessibility"]>) => {
    setFormData(prev => ({ ...prev, accessibility: { ...prev.accessibility, ...data } }))
    setErrors(prev => {
      const next = { ...prev }
      const updated = { ...formData.accessibility, ...data }
      if (updated.sensory_limitations.includes("Other") && !updated.sensory_other?.trim()) return next
      if (updated.neurodiversity_flags.includes("Other") && !updated.neuro_other?.trim()) return next
      delete next.accessibility; return next
    })
  }

  const validateStep = async (): Promise<boolean> => {
    const newErrors: Errors = {}
    if (step === 1) {
      if (!formData.username) newErrors.username = "USERNAME IS REQUIRED"
      else {
        const res = await fetch(`http://localhost:4000/api/students/check-username/${formData.username}`)
        const result = await res.json()
        if (result.exists) newErrors.username = "USERNAME ALREADY EXISTS"
      }
      if (!formData.password) newErrors.password = "PASSWORD IS REQUIRED"
      else if (formData.password.length < 6) newErrors.password = "PASSWORD MUST BE AT LEAST 6 CHARACTERS"
      if (!formData.confirm_password) newErrors.confirm_password = "PLEASE CONFIRM YOUR PASSWORD"
      else if (formData.password !== formData.confirm_password) newErrors.confirm_password = "PASSWORDS DO NOT MATCH"
    }
    if (step === 2) {
      if (!formData.full_name) newErrors.full_name = "FULL NAME IS REQUIRED"
      if (!formData.date_of_birth) newErrors.date_of_birth = "DATE OF BIRTH IS REQUIRED"
      const studentEmailRegex = /^[^\s@]+@student\.school\.edu\.eg$/
      if (formData.personal_email && !studentEmailRegex.test(formData.personal_email))
        newErrors.personal_email = "PLEASE USE YOUR SCHOOL STUDENT EMAIL"
      if (!formData.parent_email) newErrors.parent_email = "PARENT EMAIL IS REQUIRED"
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parent_email))
        newErrors.parent_email = "INVALID EMAIL ADDRESS"
      if (!formData.region) newErrors.region = "PLEASE SELECT A REGION"
      if (!formData.preferred_language) newErrors.preferred_language = "PLEASE SELECT A LANGUAGE"
      if (!formData.school_type) newErrors.school_type = "PLEASE SELECT A SCHOOL TYPE"
      if (!formData.learning_preferences) newErrors.learning_preferences = "PLEASE SELECT A LEARNING PREFERENCE"
    }
    if (step === 3) {
      if (!formData.interest_scores.some(i => i.score > 0))
        newErrors.interests = "PLEASE RATE AT LEAST ONE SUBJECT"
    }
    if (step === 4) {
      if (formData.accessibility.has_accessibility_needs &&
        formData.accessibility.sensory_limitations.length === 0 &&
        formData.accessibility.neurodiversity_flags.length === 0)
        newErrors.accessibility = "PLEASE SELECT AT LEAST ONE ACCESSIBILITY NEED"
      if (formData.accessibility.sensory_limitations.includes("Other") && !formData.accessibility.sensory_other?.trim())
        newErrors.accessibility = "PLEASE SPECIFY YOUR SENSORY LIMITATION"
      if (formData.accessibility.neurodiversity_flags.includes("Other") && !formData.accessibility.neuro_other?.trim())
        newErrors.accessibility = "PLEASE SPECIFY YOUR NEURODIVERSITY FLAG"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const submitSignup = async () => {
    try {
      const payload = {
        ...formData,
        context: { region: formData.region, school_type: formData.school_type },
        interests: { interest_scores: formData.interest_scores, last_updated: new Date() },
        accessibility: {
          ...formData.accessibility,
          sensory_limitations: formData.accessibility.sensory_limitations.map(v =>
            v === "Other" ? formData.accessibility.sensory_other : v),
          neurodiversity_flags: formData.accessibility.neurodiversity_flags.map(v =>
            v === "Other" ? formData.accessibility.neuro_other : v)
        }
      }
      const response = await fetch("http://localhost:4000/api/students/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      router.push("dashboard")
    } catch (error: unknown) {
      setErrors({ submit: error instanceof Error ? error.message.toUpperCase() : "SIGNUP FAILED. PLEASE TRY AGAIN." })
    }
  }

  const progressPct = ((step - 1) / 4) * 100

  return (
    <div style={{
      minHeight: "100vh", background: "#7a59af",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "2rem", fontFamily: "'Exo 2', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Grid bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(91,141,238,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(91,141,238,0.06) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 0%, rgba(91,141,238,0.12) 0%, transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 560, animation: "mc-fadein 0.3s ease" }}>

        <Link href="/admin/dashboard" className="mc-back-link" style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em", transition: "color 0.15s" }}>
          ← BACK TO DASHBOARD
        </Link>

        {/* Card */}
        <div style={{
          background: "rgba(10,10,26,0.72)",
          backdropFilter: "blur(16px)",
          borderRadius: 16,
          border: "1px solid rgba(91,141,238,0.35)",
          padding: "2rem",
          boxShadow: "0 0 40px rgba(91,141,238,0.12), 0 24px 48px rgba(0,0,0,0.4)",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "2rem" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(91,141,238,0.15)", border: "1px solid rgba(91,141,238,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>⊙</div>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13, color: ACCENT, letterSpacing: "0.08em", animation: "mc-glow 3s ease-in-out infinite" }}>STUDENT SIGN UP</div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginTop: 5 }}>SMARTGUARD · SCHOOL PORTAL</div>
            </div>
          </div>

          {/* Step indicator */}
          {step <= 5 && (
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                {STEP_LABELS.map((label, i) => {
                  const n = i + 1
                  const active = n === step
                  const done = n < step
                  return (
                    <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 700,
                        background: done ? "rgba(91,141,238,0.3)" : active ? "rgba(91,141,238,0.15)" : "rgba(255,255,255,0.04)",
                        color: done ? ACCENT : active ? ACCENT : "rgba(255,255,255,0.2)",
                        border: active ? `1px solid ${ACCENT}` : done ? `1px solid rgba(91,141,238,0.5)` : "1px solid rgba(255,255,255,0.08)",
                        marginBottom: 5,
                        boxShadow: active ? `0 0 10px rgba(91,141,238,0.3)` : "none",
                        transition: "all 0.2s",
                      }}>
                        {done ? "✓" : n}
                      </div>
                      <span style={{ fontSize: 8, color: active ? ACCENT : done ? `${ACCENT}88` : "rgba(255,255,255,0.2)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em", fontWeight: active ? 600 : 400 }}>
                        {label.toUpperCase()}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Progress bar */}
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                <div style={{ height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${ACCENT}, #a78bfa)`, width: `${progressPct}%`, transition: "width 0.35s ease", boxShadow: `0 0 8px rgba(91,141,238,0.5)` }} />
              </div>
            </div>
          )}

          {/* Steps */}
          {step === 1 && <Step1Account data={formData} update={updateField} next={nextStep} errors={errors} />}
          {step === 2 && <Step2Profile data={formData} update={updateField} next={nextStep} back={prevStep} errors={errors} />}
          {step === 3 && <Step3Interests data={formData} update={updateField} next={nextStep} back={prevStep} errors={errors} />}
          {step === 4 && <Step4Accessibility data={formData} update={updateAccessibility} next={nextStep} back={prevStep} errors={errors} />}
          {step === 5 && <Step5Review data={formData} back={prevStep} submit={submitSignup} errors={errors} />}
        </div>
      </div>
    </div>
  )
}