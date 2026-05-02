import { SignupData, ACCENT, mcInputStyle, mcLabelStyle, mcFieldStyle, mcErrorStyle } from "./SignupWizard"

interface Props {
  data: SignupData
  update: (data: Partial<SignupData>) => void
  next: () => void
  errors: Record<string, string>
}

export default function Step1Account({ data, update, next, errors }: Props) {
  const canNext = data.username && data.password && data.confirm_password && Object.keys(errors).length === 0

  return (
    <div>
      <p style={{ margin: "0 0 20px", fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em", lineHeight: 1.6 }}>
        CHOOSE A USERNAME AND PASSWORD TO SECURE YOUR ACCOUNT.
      </p>

      <div style={mcFieldStyle}>
        <label style={mcLabelStyle}>USERNAME</label>
        <input
          value={data.username} onChange={e => update({ username: e.target.value })}
          placeholder="e.g. student_ali" className="mc-input"
          style={{ ...mcInputStyle, borderColor: errors.username ? "rgba(255,80,60,0.6)" : "rgba(255,255,255,0.1)" }}
        />
        {errors.username && <p style={mcErrorStyle}>⚠ {errors.username}</p>}
      </div>

      <div style={mcFieldStyle}>
        <label style={mcLabelStyle}>PASSWORD</label>
        <input
          type="password" value={data.password} onChange={e => update({ password: e.target.value })}
          placeholder="Min. 6 characters" className="mc-input"
          style={{ ...mcInputStyle, borderColor: errors.password ? "rgba(255,80,60,0.6)" : "rgba(255,255,255,0.1)" }}
        />
        {errors.password && <p style={mcErrorStyle}>⚠ {errors.password}</p>}
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={mcLabelStyle}>CONFIRM PASSWORD</label>
        <input
          type="password" value={data.confirm_password} onChange={e => update({ confirm_password: e.target.value })}
          placeholder="Repeat your password" className="mc-input"
          style={{ ...mcInputStyle, borderColor: errors.confirm_password ? "rgba(255,80,60,0.6)" : "rgba(255,255,255,0.1)" }}
        />
        {errors.confirm_password && <p style={mcErrorStyle}>⚠ {errors.confirm_password}</p>}
      </div>

      <button onClick={next} disabled={!canNext} className="mc-next-btn"
        style={{
          width: "100%", padding: "12px", borderRadius: 8,
          border: `1px solid ${canNext ? ACCENT + "55" : "rgba(255,255,255,0.08)"}`,
          background: canNext ? `rgba(91,141,238,0.2)` : "rgba(255,255,255,0.04)",
          color: canNext ? ACCENT : "rgba(255,255,255,0.2)",
          fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.12em", cursor: canNext ? "pointer" : "not-allowed",
          transition: "all 0.2s",
        }}>
        NEXT →
      </button>
    </div>
  )
}