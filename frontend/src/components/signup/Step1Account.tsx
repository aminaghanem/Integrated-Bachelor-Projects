import { SignupData } from "./SignupWizard";

interface Props {
  data: SignupData;
  update: (data: Partial<SignupData>) => void;
  next: () => void;
  errors: Record<string, string>;
}

export default function Step1Account({ data, update, next, errors }: Props) {
  return (
    <div className="card">

      <h2>Create Account</h2>

      <input
        placeholder="Username"
        value={data.username}
        onChange={(e) => update({ username: e.target.value })}
        required
      />
      {errors.username && (
        <p className="error">{errors.username}</p>
      )}

      <input
        type="password"
        placeholder="Password (at least 6 characters)"
        value={data.password}
        onChange={(e) => update({ password: e.target.value })}
        minLength={6}
        required
      />
      {errors.password && (
        <p className="error">{errors.password}</p>
      )}

      <input
        type="password"
        placeholder="Confirm Password"
        value={data.confirm_password}
        onChange={(e) => update({ confirm_password: e.target.value })}
      />
      {errors.confirm_password && (
        <p className="error">{errors.confirm_password}</p>
      )}

      <button
        disabled={!data.username || !data.password || !data.confirm_password || Object.keys(errors).length > 0}
        onClick={next}>
          Next
      </button>

    </div>
  );
}