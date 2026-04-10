"use client"

import { useState } from "react"
import {useRouter} from "next/navigation"
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

const STEP_LABELS = ["Account", "Profile", "Interests", "Accessibility", "Review"]

// ── Shared style tokens used across all steps ─────────────────────
export const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: 14,
  border: "1px solid #e5e7eb", borderRadius: 8,
  background: "#f9fafb", color: "#111827",
  outline: "none", boxSizing: "border-box"
}
export const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "#6b7280", marginBottom: 6,
  textTransform: "uppercase", letterSpacing: "0.05em"
}
export const fieldStyle: React.CSSProperties = { marginBottom: 16 }
export const errorStyle: React.CSSProperties = {
  margin: "5px 0 0", fontSize: 12, color: "#dc2626"
}

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

  const nextStep = async () => { const valid = await validateStep(); if (valid) setStep(s => s + 1) }
  const prevStep = () => { setErrors({}); setStep(s => s - 1) }

  const updateField = (data: Partial<SignupData>) => {
    setFormData(prev => ({ ...prev, ...data }))
    setErrors(prev => {
      const next = { ...prev }
      Object.keys(data).forEach(k => delete next[k])
      return next
    })
  }

  const updateAccessibility = (data: Partial<SignupData["accessibility"]>) => {
    setFormData(prev => ({ ...prev, accessibility: { ...prev.accessibility, ...data } }))
    setErrors(prev => {
      const next = { ...prev }
      const updated = { ...formData.accessibility, ...data }
      if (updated.sensory_limitations.includes("Other") && !updated.sensory_other?.trim()) return next
      if (updated.neurodiversity_flags.includes("Other") && !updated.neuro_other?.trim()) return next
      delete next.accessibility
      return next
    })
  }

  const validateStep = async (): Promise<boolean> => {
    const newErrors: Errors = {}

    if (step === 1) {
      if (!formData.username) newErrors.username = "Username is required"
      else {
        const res = await fetch(`http://localhost:4000/api/students/check-username/${formData.username}`)
        const result = await res.json()
        if (result.exists) newErrors.username = "Username already exists"
      }
      if (!formData.password) newErrors.password = "Password is required"
      else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters"
      if (!formData.confirm_password) newErrors.confirm_password = "Please confirm your password"
      else if (formData.password !== formData.confirm_password) newErrors.confirm_password = "Passwords do not match"
    }

    if (step === 2) {
      if (!formData.full_name) newErrors.full_name = "Full name is required"
      if (!formData.date_of_birth) newErrors.date_of_birth = "Date of birth is required"
      const studentEmailRegex = /^[^\s@]+@student\.school\.edu\.eg$/
      if (formData.personal_email && !studentEmailRegex.test(formData.personal_email))
        newErrors.personal_email = "Please use your school student email"
      if (!formData.parent_email) newErrors.parent_email = "Parent email is required"
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parent_email))
        newErrors.parent_email = "Invalid email address"
      if (!formData.region) newErrors.region = "Please select a region"
      if (!formData.preferred_language) newErrors.preferred_language = "Please select a language"
      if (!formData.school_type) newErrors.school_type = "Please select a school type"
      if (!formData.learning_preferences) newErrors.learning_preferences = "Please select a learning preference"
    }

    if (step === 3) {
      if (!formData.interest_scores.some(i => i.score > 0))
        newErrors.interests = "Please rate at least one subject"
    }

    if (step === 4) {
      if (formData.accessibility.has_accessibility_needs &&
        formData.accessibility.sensory_limitations.length === 0 &&
        formData.accessibility.neurodiversity_flags.length === 0)
        newErrors.accessibility = "Please select at least one accessibility need"
      if (formData.accessibility.sensory_limitations.includes("Other") && !formData.accessibility.sensory_other?.trim())
        newErrors.accessibility = "Please specify your sensory limitation"
      if (formData.accessibility.neurodiversity_flags.includes("Other") && !formData.accessibility.neuro_other?.trim())
        newErrors.accessibility = "Please specify your neurodiversity flag"
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      // Success — move to a "done" step
      router.push("dashboard")
    } catch (error: unknown) {
      setErrors({ submit: error instanceof Error ? error.message : "Signup failed. Please try again." })
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        <Link href="/admin/dashboard" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
          ← Back to Dashboard
        </Link>

        {/* Card shell */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              ⊙
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>Student Sign Up</h1>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>SmartGuard · School Portal</p>
            </div>
          </div>

          {/* Step indicator */}
          {step <= 5 && (
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                {STEP_LABELS.map((label, i) => {
                  const n = i + 1
                  const active = n === step
                  const done = n < step
                  return (
                    <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", display: "flex",
                        alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                        background: done ? "#3b82f6" : active ? "#eff6ff" : "#f3f4f6",
                        color: done ? "#fff" : active ? "#3b82f6" : "#9ca3af",
                        border: active ? "2px solid #3b82f6" : "2px solid transparent",
                        marginBottom: 4
                      }}>
                        {done ? "✓" : n}
                      </div>
                      <span style={{ fontSize: 10, color: active ? "#3b82f6" : "#9ca3af", fontWeight: active ? 600 : 400 }}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Progress bar */}
              <div style={{ height: 3, background: "#f3f4f6", borderRadius: 2, marginTop: 8 }}>
                <div style={{ height: 3, borderRadius: 2, background: "linear-gradient(90deg, #3b82f6, #6366f1)", width: `${((step - 1) / 4) * 100}%`, transition: "width 0.3s ease" }} />
              </div>
            </div>
          )}

          {/* Steps */}
          {step === 1 && <Step1Account data={formData} update={updateField} next={nextStep} errors={errors} />}
          {step === 2 && <Step2Profile data={formData} update={updateField} next={nextStep} back={prevStep} errors={errors} />}
          {step === 3 && <Step3Interests data={formData} update={updateField} next={nextStep} back={prevStep} errors={errors} />}
          {step === 4 && <Step4Accessibility data={formData} update={updateAccessibility} next={nextStep} back={prevStep} errors={errors} />}
          {step === 5 && <Step5Review data={formData} back={prevStep} submit={submitSignup} errors={errors} />}

          {/* Success state */}
          {/* {step === 6 && (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#111827" }}>Account Created!</h2>
              <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6b7280" }}>Your student account has been set up. You can now log in.</p>
              <Link href="/login"
                style={{ display: "inline-block", padding: "10px 28px", borderRadius: 8, background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                Go to Login →
              </Link>
            </div>
          )} */}
        </div>
      </div>
    </div>
  )
}