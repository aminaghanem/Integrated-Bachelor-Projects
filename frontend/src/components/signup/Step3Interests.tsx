import { SignupData, inputStyle, errorStyle } from "./SignupWizard"
import { useState } from "react"

interface Props {
  data: SignupData
  update: (data: Partial<SignupData>) => void
  next: () => void
  back: () => void
  errors: Record<string, string>
}

const CATEGORY_COLORS: Record<string, string> = {
  Math: "#3b82f6", English: "#8b5cf6", Science: "#10b981",
  Programming: "#f59e0b", History: "#ef4444",
}
const DEFAULT_COLOR = "#6b7280"

export default function Step3Interests({ data, update, next, back, errors }: Props) {
  const [newInterest, setNewInterest] = useState("")

  const calculateAge = (dob: string) => {
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const age = calculateAge(data.date_of_birth)
  const baseCategories = age <= 10 ? ["Math", "English"] : ["Math", "English", "Science", "Programming", "History"]
  const customCategories = data.interest_scores.map(i => i.category).filter(c => !baseCategories.includes(c))
  const categories = [...baseCategories, ...customCategories]

  const getRating = (category: string) => data.interest_scores.find(i => i.category === category)?.score ?? 0

  const setRating = (category: string, score: number) => {
    const updated = [...data.interest_scores]
    const existing = updated.find(i => i.category === category)
    if (existing) existing.score = score
    else updated.push({ category, score })
    update({ interest_scores: updated })
  }

  const addInterest = () => {
    const value = newInterest.trim()
    if (!value) return
    const exists = data.interest_scores.find(i => i.category.toLowerCase() === value.toLowerCase())
    if (!exists) update({ interest_scores: [...data.interest_scores, { category: value, score: 0 }] })
    setNewInterest("")
  }

  return (
    <div>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
        Rate your interest in each subject. This helps us personalise your content.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {categories.map(category => {
          const rating = getRating(category)
          const color = CATEGORY_COLORS[category] ?? DEFAULT_COLOR
          const isCustom = !["Math", "English", "Science", "Programming", "History"].includes(category)

          return (
            <div key={category} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: 10,
              background: rating > 0 ? color + "0d" : "#f9fafb",
              border: `1px solid ${rating > 0 ? color + "33" : "#e5e7eb"}`,
              transition: "all 0.2s"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: rating > 0 ? color : "#374151" }}>
                  {category}
                </span>
                {isCustom && (
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "#f3f4f6", color: "#9ca3af" }}>custom</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setRating(category, star)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 20, padding: "0 1px", lineHeight: 1,
                      color: rating >= star ? color : "#d1d5db",
                      transition: "color 0.15s"
                    }}>
                    ★
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {errors.interests && <p style={{ ...errorStyle, marginBottom: 12 }}>{errors.interests}</p>}

      {/* Add custom interest */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Add another interest
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={newInterest}
            onChange={e => setNewInterest(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addInterest() } }}
            placeholder="e.g. Geography, Art, Music..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" onClick={addInterest}
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Add
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={back}
          style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          ← Back
        </button>
        <button onClick={next}
          style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Next →
        </button>
      </div>
    </div>
  )
}