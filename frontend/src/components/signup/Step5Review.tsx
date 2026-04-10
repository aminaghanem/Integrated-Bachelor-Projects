import { SignupData, errorStyle } from "./SignupWizard"

interface Props {
  data: SignupData
  back: () => void
  submit: () => void
  errors: Record<string, string>
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: 12, color: "#9ca3af", minWidth: 150 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#111827", fontWeight: 500, textAlign: "right" }}>{value || "—"}</span>
    </div>
  )
}

export default function Step5Review({ data, back, submit, errors }: Props) {
  const topInterests = data.interest_scores
    .filter(i => i.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(i => `${i.category} (${"★".repeat(i.score)})`)
    .join(", ")

  const sensoryNeeds = data.accessibility.sensory_limitations.length > 0
    ? data.accessibility.sensory_limitations.map(v => v === "Other" ? data.accessibility.sensory_other || "Other" : v).join(", ")
    : null

  const neuroNeeds = data.accessibility.neurodiversity_flags.length > 0
    ? data.accessibility.neurodiversity_flags.map(v => v === "Other" ? data.accessibility.neuro_other || "Other" : v).join(", ")
    : null

  const sectionHeading: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "#6b7280",
    textTransform: "uppercase", letterSpacing: "0.08em",
    borderTop: "1px solid #e5e7eb", paddingTop: 16,
    margin: "16px 0 8px"
  }

  return (
    <div>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
        Please review your information before submitting. You can go back to make changes.
      </p>

      <p style={sectionHeading}>Account</p>
      <ReviewRow label="Username" value={data.username} />

      <p style={sectionHeading}>Profile</p>
      <ReviewRow label="Full Name" value={data.full_name} />
      <ReviewRow label="Date of Birth" value={data.date_of_birth} />
      <ReviewRow label="Parent Email" value={data.parent_email} />
      <ReviewRow label="School Email" value={data.personal_email || "Not provided"} />
      <ReviewRow label="School Type" value={data.school_type} />
      <ReviewRow label="Region" value={data.region} />
      <ReviewRow label="Preferred Language" value={data.preferred_language} />
      <ReviewRow label="Learning Preference" value={data.learning_preferences} />

      {topInterests && (
        <>
          <p style={sectionHeading}>Interests</p>
          <ReviewRow label="Top Interests" value={topInterests} />
        </>
      )}

      {data.accessibility.has_accessibility_needs && (
        <>
          <p style={sectionHeading}>Accessibility</p>
          {sensoryNeeds && <ReviewRow label="Sensory Limitations" value={sensoryNeeds} />}
          {neuroNeeds && <ReviewRow label="Neurodiversity" value={neuroNeeds} />}
        </>
      )}

      {errors.submit && (
        <div style={{ margin: "16px 0", padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca" }}>
          <p style={{ ...errorStyle, margin: 0 }}>{errors.submit}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button onClick={back}
          style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          ← Back
        </button>
        <button onClick={submit}
          style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Submit ✓
        </button>
      </div>
    </div>
  )
}