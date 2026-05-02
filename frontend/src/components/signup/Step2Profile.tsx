import { SignupData, ACCENT, mcInputStyle, mcLabelStyle, mcFieldStyle, mcErrorStyle, mcSectionDivider } from "./SignupWizard"

interface Props {
  data: SignupData
  update: (data: Partial<SignupData>) => void
  next: () => void
  back: () => void
  errors: Record<string, string>
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: 13,
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
  background: "rgba(255,255,255,0.04)", color: "#e8e8f0",
  fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.04em",
  outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  appearance: "none" as React.CSSProperties["appearance"],
  cursor: "pointer",
}

export default function Step2Profile({ data, update, next, back, errors }: Props) {
  const hasErrors = Object.keys(errors).length > 0

  const errBorder = (key: string) => ({ borderColor: errors[key] ? "rgba(255,80,60,0.6)" : "rgba(255,255,255,0.1)" })

  return (
    <div>
      <p style={{ margin: "0 0 20px", fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em", lineHeight: 1.6 }}>
        TELL US ABOUT YOURSELF SO WE CAN PERSONALISE YOUR EXPERIENCE.
      </p>

      {/* Personal info row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={mcLabelStyle}>FULL NAME</label>
          <input value={data.full_name} onChange={e => update({ full_name: e.target.value })} placeholder="Your full name" className="mc-input" style={{ ...mcInputStyle, ...errBorder("full_name") }} />
          {errors.full_name && <p style={mcErrorStyle}>⚠ {errors.full_name}</p>}
        </div>
        <div>
          <label style={mcLabelStyle}>DATE OF BIRTH</label>
          <input type="date" value={data.date_of_birth} onChange={e => update({ date_of_birth: e.target.value })} className="mc-input" style={{ ...mcInputStyle, ...errBorder("date_of_birth") }} />
          {errors.date_of_birth && <p style={mcErrorStyle}>⚠ {errors.date_of_birth}</p>}
        </div>
      </div>

      <div style={mcFieldStyle}>
        <label style={mcLabelStyle}>PARENT EMAIL</label>
        <input type="email" value={data.parent_email} onChange={e => update({ parent_email: e.target.value })} placeholder="parent@email.com" className="mc-input" style={{ ...mcInputStyle, ...errBorder("parent_email") }} />
        {errors.parent_email && <p style={mcErrorStyle}>⚠ {errors.parent_email}</p>}
      </div>

      <div style={mcFieldStyle}>
        <label style={mcLabelStyle}>
          SCHOOL EMAIL{" "}
          <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400, textTransform: "none", fontFamily: "'Share Tech Mono', monospace" }}>(optional)</span>
        </label>
        <input type="email" value={data.personal_email} onChange={e => update({ personal_email: e.target.value })} placeholder="you@student.school.edu.eg" className="mc-input" style={{ ...mcInputStyle, ...errBorder("personal_email") }} />
        {errors.personal_email && <p style={mcErrorStyle}>⚠ {errors.personal_email}</p>}
        <p style={{ margin: "5px 0 0", fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em" }}>MUST END IN @student.school.edu.eg IF PROVIDED</p>
      </div>

      {/* School & Region */}
      <div style={mcSectionDivider()}>SCHOOL & REGION</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={mcLabelStyle}>SCHOOL TYPE</label>
          <select value={data.school_type} onChange={e => update({ school_type: e.target.value })} className="mc-select" style={{ ...selectStyle, ...errBorder("school_type") }}>
            <option value="" disabled>SELECT TYPE</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="international">International</option>
          </select>
          {errors.school_type && <p style={mcErrorStyle}>⚠ {errors.school_type}</p>}
        </div>
        <div>
          <label style={mcLabelStyle}>REGION</label>
          <select value={data.region} onChange={e => update({ region: e.target.value })} className="mc-select" style={{ ...selectStyle, ...errBorder("region") }}>
            <option value="" disabled>SELECT REGION</option>
            <option value="Egypt">Egypt</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
            <option value="Germany">Germany</option>
          </select>
          {errors.region && <p style={mcErrorStyle}>⚠ {errors.region}</p>}
        </div>
      </div>

      {/* Learning style */}
      <div style={mcSectionDivider()}>LEARNING STYLE</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div>
          <label style={mcLabelStyle}>PREFERRED LANGUAGE</label>
          <select value={data.preferred_language} onChange={e => update({ preferred_language: e.target.value })} className="mc-select" style={{ ...selectStyle, ...errBorder("preferred_language") }}>
            <option value="" disabled>SELECT LANGUAGE</option>
            <option value="Arabic">Arabic</option>
            <option value="English">English</option>
            <option value="German">German</option>
          </select>
          {errors.preferred_language && <p style={mcErrorStyle}>⚠ {errors.preferred_language}</p>}
        </div>
        <div>
          <label style={mcLabelStyle}>LEARNING PREFERENCE</label>
          <select value={data.learning_preferences} onChange={e => update({ learning_preferences: e.target.value })} className="mc-select" style={{ ...selectStyle, ...errBorder("learning_preferences") }}>
            <option value="" disabled>SELECT STYLE</option>
            <option value="Visual">Visual</option>
            <option value="Auditory">Auditory</option>
            <option value="Reading/Writing">Reading / Writing</option>
            <option value="Kinesthetic">Kinesthetic</option>
          </select>
          {errors.learning_preferences && <p style={mcErrorStyle}>⚠ {errors.learning_preferences}</p>}
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={back} className="mc-back-btn"
          style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.35)", fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 600, cursor: "pointer", letterSpacing: "0.1em", transition: "all 0.15s" }}>
          ← BACK
        </button>
        <button onClick={next} disabled={hasErrors} className="mc-next-btn"
          style={{ flex: 2, padding: "10px", borderRadius: 8, border: `1px solid ${hasErrors ? "rgba(255,255,255,0.08)" : ACCENT + "55"}`, background: hasErrors ? "rgba(255,255,255,0.04)" : `rgba(91,141,238,0.2)`, color: hasErrors ? "rgba(255,255,255,0.2)" : ACCENT, fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 700, cursor: hasErrors ? "not-allowed" : "pointer", letterSpacing: "0.12em", transition: "all 0.2s" }}>
          NEXT →
        </button>
      </div>
    </div>
  )
}