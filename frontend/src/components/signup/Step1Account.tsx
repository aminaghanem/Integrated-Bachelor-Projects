import { SignupData, inputStyle, labelStyle, fieldStyle, errorStyle } from "./SignupWizard"

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
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
        Choose a username and password to secure your account.
      </p>

      <div style={fieldStyle}>
        <label style={labelStyle}>Username</label>
        <input
          value={data.username}
          onChange={e => update({ username: e.target.value })}
          placeholder="e.g. student_ali"
          style={{ ...inputStyle, borderColor: errors.username ? "#fca5a5" : "#e5e7eb" }}
        />
        {errors.username && <p style={errorStyle}>{errors.username}</p>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Password</label>
        <input
          type="password"
          value={data.password}
          onChange={e => update({ password: e.target.value })}
          placeholder="Min. 6 characters"
          style={{ ...inputStyle, borderColor: errors.password ? "#fca5a5" : "#e5e7eb" }}
        />
        {errors.password && <p style={errorStyle}>{errors.password}</p>}
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Confirm Password</label>
        <input
          type="password"
          value={data.confirm_password}
          onChange={e => update({ confirm_password: e.target.value })}
          placeholder="Repeat your password"
          style={{ ...inputStyle, borderColor: errors.confirm_password ? "#fca5a5" : "#e5e7eb" }}
        />
        {errors.confirm_password && <p style={errorStyle}>{errors.confirm_password}</p>}
      </div>

      <button
        onClick={next}
        disabled={!canNext}
        style={{
          width: "100%", padding: "11px", borderRadius: 8, border: "none",
          background: canNext ? "linear-gradient(135deg, #3b82f6, #6366f1)" : "#e5e7eb",
          color: canNext ? "#fff" : "#9ca3af",
          fontWeight: 700, fontSize: 14, cursor: canNext ? "pointer" : "not-allowed",
          letterSpacing: "0.02em"
        }}
      >
        Next →
      </button>
    </div>
  )
}