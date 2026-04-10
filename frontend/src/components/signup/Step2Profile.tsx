import { SignupData, inputStyle, labelStyle, fieldStyle, errorStyle } from "./SignupWizard"

interface Props {
  data: SignupData
  update: (data: Partial<SignupData>) => void
  next: () => void
  back: () => void
  errors: Record<string, string>
}

const selectStyle: React.CSSProperties = {
  ...({
    width: "100%", padding: "10px 12px", fontSize: 14,
    border: "1px solid #e5e7eb", borderRadius: 8,
    background: "#f9fafb", color: "#111827",
    outline: "none", boxSizing: "border-box",
    appearance: "none"
  } as React.CSSProperties)
}

const sectionDivider: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.08em",
  borderTop: "1px solid #e5e7eb", paddingTop: 16,
  margin: "20px 0 14px"
}

export default function Step2Profile({ data, update, next, back, errors }: Props) {
  const hasErrors = Object.keys(errors).length > 0

  return (
    <div>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
        Tell us a bit about yourself so we can personalise your experience.
      </p>

      {/* Personal info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Full Name</label>
          <input value={data.full_name} onChange={e => update({ full_name: e.target.value })}
            placeholder="Your full name"
            style={{ ...inputStyle, borderColor: errors.full_name ? "#fca5a5" : "#e5e7eb" }} />
          {errors.full_name && <p style={errorStyle}>{errors.full_name}</p>}
        </div>
        <div>
          <label style={labelStyle}>Date of Birth</label>
          <input type="date" value={data.date_of_birth} onChange={e => update({ date_of_birth: e.target.value })}
            style={{ ...inputStyle, borderColor: errors.date_of_birth ? "#fca5a5" : "#e5e7eb" }} />
          {errors.date_of_birth && <p style={errorStyle}>{errors.date_of_birth}</p>}
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Parent Email</label>
        <input type="email" value={data.parent_email} onChange={e => update({ parent_email: e.target.value })}
          placeholder="parent@email.com"
          style={{ ...inputStyle, borderColor: errors.parent_email ? "#fca5a5" : "#e5e7eb" }} />
        {errors.parent_email && <p style={errorStyle}>{errors.parent_email}</p>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>School Email <span style={{ color: "#9ca3af", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
        <input type="email" value={data.personal_email} onChange={e => update({ personal_email: e.target.value })}
          placeholder="you@student.school.edu.eg"
          style={{ ...inputStyle, borderColor: errors.personal_email ? "#fca5a5" : "#e5e7eb" }} />
        {errors.personal_email && <p style={errorStyle}>{errors.personal_email}</p>}
        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#9ca3af" }}>Must end in @student.school.edu.eg if provided</p>
      </div>

      {/* School context */}
      <p style={sectionDivider}>School & Region</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>School Type</label>
          <select value={data.school_type} onChange={e => update({ school_type: e.target.value })}
            style={{ ...selectStyle, borderColor: errors.school_type ? "#fca5a5" : "#e5e7eb" }}>
            <option value="" disabled>Select type</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="international">International</option>
            <option value="homeschooled">Homeschool</option>
          </select>
          {errors.school_type && <p style={errorStyle}>{errors.school_type}</p>}
        </div>
        <div>
          <label style={labelStyle}>Region</label>
          <select value={data.region} onChange={e => update({ region: e.target.value })}
            style={{ ...selectStyle, borderColor: errors.region ? "#fca5a5" : "#e5e7eb" }}>
            <option value="" disabled>Select region</option>
            <option value="Africa">Africa</option>
            <option value="Middle East">Middle East</option>
            <option value="Europe">Europe</option>
            <option value="Asia">Asia</option>
            <option value="North America">North America</option>
          </select>
          {errors.region && <p style={errorStyle}>{errors.region}</p>}
        </div>
      </div>

      {/* Learning preferences */}
      <p style={sectionDivider}>Learning Style</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Preferred Language</label>
          <select value={data.preferred_language} onChange={e => update({ preferred_language: e.target.value })}
            style={{ ...selectStyle, borderColor: errors.preferred_language ? "#fca5a5" : "#e5e7eb" }}>
            <option value="" disabled>Select language</option>
            <option value="Arabic">Arabic</option>
            <option value="English">English</option>
            <option value="French">French</option>
            <option value="German">German</option>
          </select>
          {errors.preferred_language && <p style={errorStyle}>{errors.preferred_language}</p>}
        </div>
        <div>
          <label style={labelStyle}>Learning Preference</label>
          <select value={data.learning_preferences} onChange={e => update({ learning_preferences: e.target.value })}
            style={{ ...selectStyle, borderColor: errors.learning_preferences ? "#fca5a5" : "#e5e7eb" }}>
            <option value="" disabled>Select style</option>
            <option value="Visual">Visual 👁</option>
            <option value="Auditory">Auditory 👂</option>
            <option value="Reading/Writing">Reading / Writing 📖</option>
            <option value="Kinesthetic">Kinesthetic 🤲</option>
          </select>
          {errors.learning_preferences && <p style={errorStyle}>{errors.learning_preferences}</p>}
        </div>
      </div>

      {/* Nav buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={back}
          style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          ← Back
        </button>
        <button onClick={next} disabled={hasErrors}
          style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: hasErrors ? "#e5e7eb" : "linear-gradient(135deg, #3b82f6, #6366f1)", color: hasErrors ? "#9ca3af" : "#fff", fontWeight: 700, fontSize: 14, cursor: hasErrors ? "not-allowed" : "pointer" }}>
          Next →
        </button>
      </div>
    </div>
  )
}