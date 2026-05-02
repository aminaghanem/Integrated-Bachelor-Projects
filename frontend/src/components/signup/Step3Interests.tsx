import { SignupData, ACCENT, mcInputStyle, mcErrorStyle } from "./SignupWizard"
import { useState } from "react"

interface Props {
  data: SignupData
  update: (data: Partial<SignupData>) => void
  next: () => void
  back: () => void
  errors: Record<string, string>
}

const CATEGORY_COLORS: Record<string, string> = {
  Math: "#5b8dee", English: "#cb6ce6", Science: "#00ff88",
  Programming: "#ffa500", History: "#ff503c",
}
const DEFAULT_COLOR = "rgba(255,255,255,0.35)"

export default function Step3Interests({ data, update, next, back, errors }: Props) {
  const [newInterest, setNewInterest] = useState("")

  const calculateAge = (dob: string) => {
    const birth = new Date(dob); const today = new Date()
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
      <p style={{ margin: "0 0 20px", fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em", lineHeight: 1.6 }}>
        RATE YOUR INTEREST IN EACH SUBJECT. THIS HELPS US PERSONALISE YOUR CONTENT.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {categories.map(category => {
          const rating = getRating(category)
          const color = CATEGORY_COLORS[category] ?? DEFAULT_COLOR
          const isCustom = !["Math", "English", "Science", "Programming", "History"].includes(category)

          return (
            <div key={category} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: 10,
              background: rating > 0 ? `${color}12` : "rgba(255,255,255,0.02)",
              border: `1px solid ${rating > 0 ? color + "44" : "rgba(255,255,255,0.07)"}`,
              transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: rating > 0 ? color : "rgba(255,255,255,0.45)", fontFamily: "'Exo 2', sans-serif" }}>
                  {category}
                </span>
                {isCustom && (
                  <span style={{ fontSize: 8, padding: "2px 7px", borderRadius: 10, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.06em" }}>CUSTOM</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setRating(category, star)} className="mc-star-btn"
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: "0 1px", lineHeight: 1, color: rating >= star ? color : "rgba(255,255,255,0.1)", transition: "all 0.15s" }}>
                    ★
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {errors.interests && (
        <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(255,80,60,0.1)", border: "1px solid rgba(255,80,60,0.3)" }}>
          <p style={{ ...mcErrorStyle, margin: 0 }}>⚠ {errors.interests}</p>
        </div>
      )}

      {/* Add custom interest */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontFamily: "'Orbitron', monospace", fontSize: 8, color: `${ACCENT}88`, letterSpacing: "0.15em", marginBottom: 8 }}>ADD ANOTHER INTEREST</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text" value={newInterest} onChange={e => setNewInterest(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addInterest() } }}
            placeholder="e.g. Geography, Art, Music..." className="mc-input"
            style={{ ...mcInputStyle, flex: 1 }}
          />
          <button type="button" onClick={addInterest} className="mc-add-btn"
            style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid rgba(91,141,238,0.35)`, background: "rgba(91,141,238,0.1)", color: ACCENT, fontFamily: "'Share Tech Mono', monospace", fontSize: 11, cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.06em" }}>
            ADD
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={back} className="mc-back-btn"
          style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.35)", fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 600, cursor: "pointer", letterSpacing: "0.1em", transition: "all 0.15s" }}>
          ← BACK
        </button>
        <button onClick={next} className="mc-next-btn"
          style={{ flex: 2, padding: "10px", borderRadius: 8, border: `1px solid ${ACCENT}55`, background: "rgba(91,141,238,0.2)", color: ACCENT, fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.12em", transition: "all 0.2s" }}>
          NEXT →
        </button>
      </div>
    </div>
  )
}