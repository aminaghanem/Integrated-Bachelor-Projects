import { SignupData, inputStyle, errorStyle } from "./SignupWizard"
import { useState } from "react"

interface Props {
  data: SignupData
  update: (data: Partial<SignupData["accessibility"]>) => void
  next: () => void
  back: () => void
  errors: Record<string, string>
}

const SENSORY_OPTIONS = ["Visual impairment", "Hearing impairment"]
const NEURO_OPTIONS   = ["ADHD", "Dyslexia", "Autism"]

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      borderRadius: 8, cursor: "pointer",
      background: checked ? "#eff6ff" : "#f9fafb",
      border: `1px solid ${checked ? "#93c5fd" : "#e5e7eb"}`,
      transition: "all 0.15s"
    }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: "#3b82f6", cursor: "pointer" }} />
      <span style={{ fontSize: 13, fontWeight: checked ? 500 : 400, color: checked ? "#1d4ed8" : "#374151" }}>
        {label}
      </span>
    </label>
  )
}

export default function Step4Accessibility({ data, update, next, back, errors }: Props) {
  const handleSensoryChange = (value: string, checked: boolean) => {
    const list = checked
      ? [...data.accessibility.sensory_limitations, value]
      : data.accessibility.sensory_limitations.filter(i => i !== value)
    update({ sensory_limitations: list })
    if (value === "Other" && !checked) update({ sensory_other: "" })
  }

  const handleNeuroChange = (value: string, checked: boolean) => {
    const list = checked
      ? [...data.accessibility.neurodiversity_flags, value]
      : data.accessibility.neurodiversity_flags.filter(i => i !== value)
    update({ neurodiversity_flags: list })
    if (value === "Other" && !checked) update({ neuro_other: "" })
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "#6b7280",
    textTransform: "uppercase", letterSpacing: "0.08em",
    borderTop: "1px solid #e5e7eb", paddingTop: 16,
    margin: "20px 0 10px"
  }

  return (
    <div>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
        This information helps us make your experience more accessible. All fields are optional.
      </p>

      {/* Toggle */}
      <label style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px",
        borderRadius: 10, cursor: "pointer", marginBottom: 4,
        background: data.accessibility.has_accessibility_needs ? "#eff6ff" : "#f9fafb",
        border: `1px solid ${data.accessibility.has_accessibility_needs ? "#93c5fd" : "#e5e7eb"}`
      }}>
        <input type="checkbox" checked={data.accessibility.has_accessibility_needs}
          onChange={e => update({ has_accessibility_needs: e.target.checked })}
          style={{ width: 18, height: 18, accentColor: "#3b82f6", cursor: "pointer" }} />
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: data.accessibility.has_accessibility_needs ? "#1d4ed8" : "#374151" }}>
            I have accessibility needs
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>
            Check this to specify any sensory or neurodiversity needs
          </p>
        </div>
      </label>

      {data.accessibility.has_accessibility_needs && (
        <>
          <p style={sectionLabel}>Sensory Limitations</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            {SENSORY_OPTIONS.map(s => (
              <CheckItem key={s} label={s}
                checked={data.accessibility.sensory_limitations.includes(s)}
                onChange={v => handleSensoryChange(s, v)} />
            ))}
            <CheckItem label="Other"
              checked={data.accessibility.sensory_limitations.includes("Other")}
              onChange={v => handleSensoryChange("Other", v)} />
            {data.accessibility.sensory_limitations.includes("Other") && (
              <input
                value={data.accessibility.sensory_other ?? ""}
                onChange={e => update({ sensory_other: e.target.value })}
                placeholder="Please describe your sensory limitation"
                style={{ ...inputStyle, marginLeft: 28, width: "calc(100% - 28px)", borderColor: "#93c5fd" }}
              />
            )}
          </div>

          <p style={sectionLabel}>Neurodiversity</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {NEURO_OPTIONS.map(n => (
              <CheckItem key={n} label={n}
                checked={data.accessibility.neurodiversity_flags.includes(n)}
                onChange={v => handleNeuroChange(n, v)} />
            ))}
            <CheckItem label="Other"
              checked={data.accessibility.neurodiversity_flags.includes("Other")}
              onChange={v => handleNeuroChange("Other", v)} />
            {data.accessibility.neurodiversity_flags.includes("Other") && (
              <input
                value={data.accessibility.neuro_other ?? ""}
                onChange={e => update({ neuro_other: e.target.value })}
                placeholder="Please describe your neurodiversity"
                style={{ ...inputStyle, marginLeft: 28, width: "calc(100% - 28px)", borderColor: "#93c5fd" }}
              />
            )}
          </div>
        </>
      )}

      {errors.accessibility && (
        <div style={{ margin: "12px 0 0", padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca" }}>
          <p style={{ ...errorStyle, margin: 0 }}>{errors.accessibility}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
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