import { SignupData, ACCENT, mcInputStyle, mcErrorStyle, mcSectionDivider } from "./SignupWizard"

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
    <label className="mc-check-item" style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      borderRadius: 8, cursor: "pointer",
      background: checked ? "rgba(91,141,238,0.12)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${checked ? "rgba(91,141,238,0.45)" : "rgba(255,255,255,0.07)"}`,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: `1px solid ${checked ? ACCENT : "rgba(255,255,255,0.2)"}`,
        background: checked ? `rgba(91,141,238,0.3)` : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, color: ACCENT,
        transition: "all 0.15s",
      }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
        {checked && "✓"}
      </div>
      <span style={{ fontSize: 12, color: checked ? ACCENT : "rgba(255,255,255,0.45)", fontFamily: "'Exo 2', sans-serif", fontWeight: checked ? 600 : 400, transition: "color 0.15s" }}>
        {label}
      </span>
    </label>
  )
}

export default function Step4Accessibility({ data, update, next, back, errors }: Props) {
  const handleSensoryChange = (value: string, checked: boolean) => {
    const list = checked ? [...data.accessibility.sensory_limitations, value] : data.accessibility.sensory_limitations.filter(i => i !== value)
    update({ sensory_limitations: list })
    if (value === "Other" && !checked) update({ sensory_other: "" })
  }

  const handleNeuroChange = (value: string, checked: boolean) => {
    const list = checked ? [...data.accessibility.neurodiversity_flags, value] : data.accessibility.neurodiversity_flags.filter(i => i !== value)
    update({ neurodiversity_flags: list })
    if (value === "Other" && !checked) update({ neuro_other: "" })
  }

  return (
    <div>
      <p style={{ margin: "0 0 20px", fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em", lineHeight: 1.6 }}>
        THIS INFORMATION HELPS US MAKE YOUR EXPERIENCE MORE ACCESSIBLE. ALL FIELDS ARE OPTIONAL.
      </p>

      {/* Master toggle */}
      <label className="mc-check-item" style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
        borderRadius: 10, cursor: "pointer", marginBottom: 4,
        background: data.accessibility.has_accessibility_needs ? "rgba(91,141,238,0.12)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${data.accessibility.has_accessibility_needs ? "rgba(91,141,238,0.45)" : "rgba(255,255,255,0.07)"}`,
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          border: `1px solid ${data.accessibility.has_accessibility_needs ? ACCENT : "rgba(255,255,255,0.2)"}`,
          background: data.accessibility.has_accessibility_needs ? "rgba(91,141,238,0.3)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: ACCENT, transition: "all 0.15s",
        }}>
          <input type="checkbox" checked={data.accessibility.has_accessibility_needs}
            onChange={e => update({ has_accessibility_needs: e.target.checked })}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
          {data.accessibility.has_accessibility_needs && "✓"}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: data.accessibility.has_accessibility_needs ? ACCENT : "rgba(255,255,255,0.6)", fontFamily: "'Exo 2', sans-serif", transition: "color 0.15s" }}>
            I have accessibility needs
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.04em", marginTop: 2 }}>
            CHECK TO SPECIFY SENSORY OR NEURODIVERSITY NEEDS
          </div>
        </div>
      </label>

      {data.accessibility.has_accessibility_needs && (
        <>
          <div style={mcSectionDivider()}>SENSORY LIMITATIONS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            {SENSORY_OPTIONS.map(s => (
              <CheckItem key={s} label={s} checked={data.accessibility.sensory_limitations.includes(s)} onChange={v => handleSensoryChange(s, v)} />
            ))}
            <CheckItem label="Other" checked={data.accessibility.sensory_limitations.includes("Other")} onChange={v => handleSensoryChange("Other", v)} />
            {data.accessibility.sensory_limitations.includes("Other") && (
              <input value={data.accessibility.sensory_other ?? ""} onChange={e => update({ sensory_other: e.target.value })}
                placeholder="Please describe your sensory limitation" className="mc-input"
                style={{ ...mcInputStyle, marginLeft: 28, width: "calc(100% - 28px)", borderColor: "rgba(91,141,238,0.4)" }} />
            )}
          </div>

          <div style={mcSectionDivider()}>NEURODIVERSITY</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {NEURO_OPTIONS.map(n => (
              <CheckItem key={n} label={n} checked={data.accessibility.neurodiversity_flags.includes(n)} onChange={v => handleNeuroChange(n, v)} />
            ))}
            <CheckItem label="Other" checked={data.accessibility.neurodiversity_flags.includes("Other")} onChange={v => handleNeuroChange("Other", v)} />
            {data.accessibility.neurodiversity_flags.includes("Other") && (
              <input value={data.accessibility.neuro_other ?? ""} onChange={e => update({ neuro_other: e.target.value })}
                placeholder="Please describe your neurodiversity" className="mc-input"
                style={{ ...mcInputStyle, marginLeft: 28, width: "calc(100% - 28px)", borderColor: "rgba(91,141,238,0.4)" }} />
            )}
          </div>
        </>
      )}

      {errors.accessibility && (
        <div style={{ margin: "14px 0 0", padding: "10px 14px", borderRadius: 8, background: "rgba(255,80,60,0.1)", border: "1px solid rgba(255,80,60,0.3)" }}>
          <p style={{ ...mcErrorStyle, margin: 0 }}>⚠ {errors.accessibility}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
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