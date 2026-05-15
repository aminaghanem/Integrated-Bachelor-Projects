"use client";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      // store token, user data and redirect
      localStorage.setItem("token", data.token);
      localStorage.setItem("firstName", data.user.firstName);
      localStorage.setItem("age", String(data.user.age));
      localStorage.setItem("avatar", data.user.avatar);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Nunito:wght@400;700;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .page {
          min-height: 100vh;
          background-color: #1a1a6e;
          background-image:
            radial-gradient(circle at 15% 20%, rgba(255,109,183,0.15) 0%, transparent 40%),
            radial-gradient(circle at 85% 80%, rgba(78,205,255,0.12) 0%, transparent 40%),
            url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Crect x='0' y='0' width='2' height='2'/%3E%3Crect x='20' y='20' width='2' height='2'/%3E%3C/g%3E%3C/svg%3E");
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          font-family: 'Nunito', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* floating decorative stars/dots */
        .page::before {
          content: '✈ ★ ✈ ★ ✈ ★ ✈ ★';
          position: absolute;
          top: 30px;
          left: 0; right: 0;
          text-align: center;
          font-size: 18px;
          color: rgba(255,216,90,0.25);
          letter-spacing: 28px;
          pointer-events: none;
        }
        .page::after {
          content: '★ ✈ ★ ✈ ★ ✈ ★ ✈';
          position: absolute;
          bottom: 30px;
          left: 0; right: 0;
          text-align: center;
          font-size: 18px;
          color: rgba(255,216,90,0.25);
          letter-spacing: 28px;
          pointer-events: none;
        }

        .card {
          background: #12125a;
          border: 4px solid #ff6db7;
          border-radius: 0px;
          box-shadow: 8px 8px 0px #ff6db7, 16px 16px 0px rgba(255,109,183,0.2);
          width: 100%;
          max-width: 460px;
          padding: 48px 44px;
          position: relative;
          animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* corner pixel decorations */
        .card::before {
          content: '';
          position: absolute;
          top: -4px; left: -4px;
          width: 16px; height: 16px;
          background: #ffd85a;
          border: 4px solid #ffd85a;
        }
        .card::after {
          content: '';
          position: absolute;
          bottom: -4px; right: -4px;
          width: 16px; height: 16px;
          background: #4ecfff;
          border: 4px solid #4ecfff;
        }

        .logo-area {
          text-align: center;
          margin-bottom: 32px;
        }

        .globe-icon {
          font-size: 52px;
          display: block;
          margin-bottom: 12px;
          animation: spin 8s linear infinite;
        }

        @keyframes spin {
          0%   { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }

        .brand {
          font-family: 'Press Start 2P', monospace;
          font-size: 18px;
          color: #ff6db7;
          letter-spacing: 2px;
          display: block;
          line-height: 1.5;
        }

        .tagline {
          font-size: 13px;
          color: #ffd85a;
          font-weight: 700;
          margin-top: 6px;
          letter-spacing: 1px;
        }

        .title {
          font-family: 'Press Start 2P', monospace;
          font-size: 14px;
          color: #ffffff;
          text-align: center;
          margin-bottom: 32px;
          line-height: 1.8;
        }

        .title span {
          color: #ffd85a;
        }

        .divider {
          height: 3px;
          background: repeating-linear-gradient(
            90deg,
            #ff6db7 0px, #ff6db7 8px,
            transparent 8px, transparent 16px
          );
          margin-bottom: 32px;
          border-radius: 2px;
        }

        .field {
          margin-bottom: 20px;
        }

        label {
          display: block;
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          color: #ffd85a;
          margin-bottom: 10px;
          letter-spacing: 1px;
        }

        input {
          width: 100%;
          background: #0d0d4a;
          border: 3px solid #2a2a8a;
          color: #ffffff;
          font-family: 'Nunito', sans-serif;
          font-size: 15px;
          font-weight: 700;
          padding: 13px 16px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          border-radius: 0;
        }

        input::placeholder { color: rgba(255,255,255,0.25); }

        input:focus {
          border-color: #ff6db7;
          box-shadow: 0 0 0 3px rgba(255,109,183,0.2), 4px 4px 0px #ff6db7;
        }

        .error-box {
          background: rgba(255,80,80,0.15);
          border: 2px solid #ff5050;
          color: #ff8080;
          font-size: 12px;
          font-weight: 700;
          padding: 10px 14px;
          margin-bottom: 20px;
          text-align: center;
        }

        .btn {
          width: 100%;
          background: #ff6db7;
          color: #1a1a6e;
          font-family: 'Press Start 2P', monospace;
          font-size: 12px;
          border: 3px solid #ff6db7;
          padding: 16px;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 4px 4px 0px #c4006e;
          margin-top: 8px;
          letter-spacing: 1px;
        }

        .btn:hover:not(:disabled) {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px #c4006e;
          background: #ff8dcc;
        }

        .btn:active:not(:disabled) {
          transform: translate(4px, 4px);
          box-shadow: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .footer-text {
          text-align: center;
          margin-top: 28px;
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          font-weight: 700;
        }

        .footer-text a {
          color: #ffd85a;
          text-decoration: none;
          font-weight: 900;
          border-bottom: 2px solid #ffd85a;
          padding-bottom: 1px;
          transition: color 0.2s;
        }

        .footer-text a:hover { color: #fff; border-color: #fff; }

        .stamp-deco {
          position: absolute;
          top: -18px;
          right: 24px;
          background: #ffd85a;
          color: #1a1a6e;
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          padding: 5px 8px;
          border: 2px solid #1a1a6e;
          letter-spacing: 1px;
        }
      `}</style>

      <div className="page">
        <div className="card">
          <div className="stamp-deco">LOGIN</div>

          <div className="logo-area">
            <span className="globe-icon">🌍</span>
            <span className="brand">PLANET PLAY</span>
            <p className="tagline">No Passport Needed!</p>
          </div>

          <h1 className="title">
            Welcome <span>Back</span>,<br />
            Explorer!
          </h1>

          <div className="divider" />

          <form onSubmit={handleSubmit}>
            {error && <div className="error-box">⚠ {error}</div>}

            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username"
                value={form.username}
                onChange={handleChange}
                required
                autoComplete="username"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Loading..." : "▶  Log In"}
            </button>
          </form>

          <p className="footer-text">
            New explorer? <Link href="/signup">Create an account</Link>
          </p>
        </div>
      </div>
    </>
  );
}
