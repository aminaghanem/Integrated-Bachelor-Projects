"use client";
import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    age: "",
    username: "",
    password: "",
    parentFirstName: "",
    parentLastName: "",
    parentEmail: "",
    avatar: "avatar1",
  });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setLoading(true);
    try {
      // First, find or create parent
      const parentRes = await fetch(
        "http://localhost:5000/api/parents/find-or-create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.parentFirstName,
            lastName: form.parentLastName,
            email: form.parentEmail,
          }),
        },
      );
      const parentData = await parentRes.json();
      if (!parentRes.ok)
        throw new Error(parentData.message || "Failed to process parent data");

      const parentId = parentData.parentId;

      // Then, signup user with parentId
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          age: Number(form.age),
          username: form.username,
          password: form.password,
          parentId,
          avatar: form.avatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      localStorage.setItem("token", data.token);
      localStorage.setItem("firstName", data.user.firstName);
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
          background-color: var(--midnight-blue);
          background-image:
            radial-gradient(circle at 80% 10%, rgba(255,109,183,0.15) 0%, transparent 40%),
            radial-gradient(circle at 10% 90%, rgba(78,205,255,0.12) 0%, transparent 40%),
            url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Crect x='0' y='0' width='2' height='2'/%3E%3Crect x='20' y='20' width='2' height='2'/%3E%3C/g%3E%3C/svg%3E");
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          font-family: 'Nunito', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .page::before {
          content: '🌍 🗺 ✈ 🌎 🗺 ✈ 🌏';
          position: absolute;
          top: 24px;
          left: 0; right: 0;
          text-align: center;
          font-size: 20px;
          opacity: 0.15;
          letter-spacing: 20px;
          pointer-events: none;
        }
        .page::after {
          content: '✈ 🌏 🗺 🌍 ✈ 🌎 🗺';
          position: absolute;
          bottom: 24px;
          left: 0; right: 0;
          text-align: center;
          font-size: 20px;
          opacity: 0.15;
          letter-spacing: 20px;
          pointer-events: none;
        }

        .card {
          background: #12125a;
          border: 4px solid #4ecfff;
          border-radius: 0px;
          box-shadow: 8px 8px 0px #4ecfff, 16px 16px 0px rgba(78,207,255,0.2);
          width: 100%;
          max-width: 500px;
          padding: 44px 44px;
          position: relative;
          animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .card::before {
          content: '';
          position: absolute;
          top: -4px; left: -4px;
          width: 16px; height: 16px;
          background: #ffd85a;
        }
        .card::after {
          content: '';
          position: absolute;
          bottom: -4px; right: -4px;
          width: 16px; height: 16px;
          background: #ff6db7;
        }

        .logo-area {
          text-align: center;
          margin-bottom: 28px;
        }

        .rocket-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 10px;
          animation: launch 2s ease-in-out infinite;
        }

        @keyframes launch {
          0%, 100% { transform: translateY(0) rotate(-10deg); }
          50%       { transform: translateY(-10px) rotate(-10deg); }
        }

        .brand {
          font-family: 'Press Start 2P', monospace;
          font-size: 16px;
          color: #4ecfff;
          letter-spacing: 2px;
          display: block;
          line-height: 1.6;
        }

        .tagline {
          font-size: 12px;
          color: #ffd85a;
          font-weight: 700;
          margin-top: 5px;
          letter-spacing: 1px;
        }

        .title {
          font-family: 'Press Start 2P', monospace;
          font-size: 13px;
          color: #ffffff;
          text-align: center;
          margin-bottom: 28px;
          line-height: 1.9;
        }

        .title span { color: #ffd85a; }

        .divider {
          height: 3px;
          background: repeating-linear-gradient(
            90deg,
            #4ecfff 0px, #4ecfff 8px,
            transparent 8px, transparent 16px
          );
          margin-bottom: 28px;
        }

        /* two columns for name fields */
        .row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .field { margin-bottom: 18px; }

        label {
          display: block;
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: #ffd85a;
          margin-bottom: 9px;
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
          padding: 12px 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          border-radius: 0;
        }

        input::placeholder { color: rgba(255,255,255,0.25); }

        input:focus {
          border-color: #4ecfff;
          box-shadow: 0 0 0 3px rgba(78,207,255,0.15), 4px 4px 0px #4ecfff;
        }

        .error-box {
          background: rgba(255,80,80,0.15);
          border: 2px solid #ff5050;
          color: #ff8080;
          font-size: 12px;
          font-weight: 700;
          padding: 10px 14px;
          margin-bottom: 18px;
          text-align: center;
        }

        .btn {
          width: 100%;
          background: #4ecfff;
          color: #0d0d4a;
          font-family: 'Press Start 2P', monospace;
          font-size: 11px;
          border: 3px solid #4ecfff;
          padding: 16px;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 4px 4px 0px #0077aa;
          margin-top: 8px;
          letter-spacing: 1px;
        }

        .btn:hover:not(:disabled) {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px #0077aa;
          background: #7de0ff;
        }

        .btn:active:not(:disabled) {
          transform: translate(4px, 4px);
          box-shadow: none;
        }

        .btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .footer-text {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          font-weight: 700;
        }

        .footer-text a {
          color: #ff6db7;
          text-decoration: none;
          font-weight: 900;
          border-bottom: 2px solid #ff6db7;
          padding-bottom: 1px;
          transition: color 0.2s;
        }

        .footer-text a:hover { color: #fff; border-color: #fff; }

        .stamp-deco {
          position: absolute;
          top: -18px;
          right: 24px;
          background: #4ecfff;
          color: #0d0d4a;
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          padding: 5px 8px;
          border: 2px solid #0d0d4a;
          letter-spacing: 1px;
        }

        .progress-bar {
          display: flex;
          gap: 6px;
          margin-bottom: 28px;
          justify-content: center;
        }

        .progress-dot {
          width: 10px; height: 10px;
          background: #2a2a8a;
          border: 2px solid #4ecfff;
        }

        .progress-dot.active { background: #4ecfff; }
      `}</style>

      <div className="page">
        <div className="card">
          <div className="stamp-deco">NEW EXPLORER</div>

          <div className="logo-area">
            <span className="rocket-icon">🚀</span>
            <span className="brand">PLANET PLAY</span>
            <p className="tagline">Start Your Journey!</p>
          </div>

          <h1 className="title">
            Join The <span>Adventure</span>!
          </h1>

          <div className="divider" />

          <form onSubmit={handleSubmit}>
            {error && <div className="error-box">⚠ {error}</div>}

            <div className="row">
              <div className="field">
                <label htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Farida"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Arafa"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label htmlFor="age">Age</label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  placeholder="10"
                  min={1}
                  max={120}
                  value={form.age}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="explorer42"
                  value={form.username}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="row">
              <div className="field">
                <label htmlFor="parentFirstName">Parent First Name</label>
                <input
                  id="parentFirstName"
                  name="parentFirstName"
                  type="text"
                  placeholder="Parent's first name"
                  value={form.parentFirstName}
                  onChange={handleChange}
                />
              </div>
              <div className="field">
                <label htmlFor="parentLastName">Parent Last Name</label>
                <input
                  id="parentLastName"
                  name="parentLastName"
                  type="text"
                  placeholder="Parent's last name"
                  value={form.parentLastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="parentEmail">Parent Email</label>
              <input
                id="parentEmail"
                name="parentEmail"
                type="email"
                placeholder="parent@example.com"
                value={form.parentEmail}
                onChange={handleChange}
              />
            </div>

            {/* Avatar picker */}
            <div className="field">
              <label>Your Avatar</label>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                style={{
                  width: "100%",
                  background: "#0d0d4a",
                  border: "3px solid",
                  borderColor:
                    form.avatar !== "avatar1" ? "#4ecfff" : "#2a2a8a",
                  color: "#ffffff",
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  padding: "12px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <img
                  src={`/avatars/${form.avatar}.jpeg`}
                  alt={form.avatar}
                  style={{
                    width: 32,
                    height: 32,
                    objectFit: "contain",
                    borderRadius: "50%",
                  }}
                />
                tap to change
              </button>
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Creating Account..." : "▶  Start Exploring!"}
            </button>
          </form>
          {/* Avatar popup */}
          {showAvatarPicker && (
            <div
              onClick={() => setShowAvatarPicker(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 200,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "fixed",
                  background: "#12125a",
                  border: "3px solid #4ecfff",
                  padding: "32px 28px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 24,
                  width: 1000,
                  maxWidth: "80vw",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 11,
                    color: "#ffd85a",
                    letterSpacing: 1,
                  }}
                >
                  PICK YOUR AVATAR
                </span>

                <div style={{ display: "flex", gap: 20 }}>
                  {["avatar1", "avatar2", "avatar3", "avatar4"].map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, avatar: av });
                        setShowAvatarPicker(false);
                      }}
                      style={{
                        background: form.avatar === av ? "#4ecfff" : "#0d0d4a",
                        border: `3px solid ${form.avatar === av ? "#ffd85a" : "#2a2a8a"}`,
                        cursor: "pointer",
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.15s",
                      }}
                    >
                      <img
                        src={`/avatars/${av}.jpeg`}
                        alt={av}
                        style={{
                          width: 250,
                          height: 250,
                          objectFit: "contain",
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: 8,
                          color: form.avatar === av ? "#0d0d4a" : "#ffffff",
                          letterSpacing: 1,
                        }}
                      >
                        {av.charAt(0).toUpperCase() + av.slice(1)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="footer-text">
            Already an explorer? <Link href="/login">Log in here</Link>
          </p>
        </div>
      </div>
    </>
  );
}
