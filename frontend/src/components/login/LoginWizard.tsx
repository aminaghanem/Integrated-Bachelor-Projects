"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function StudentLogin() {

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = async () => {

    try {

      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      localStorage.setItem("token", data.token)
      localStorage.setItem("role", data.role)
      localStorage.setItem("userId", data.userId)

      if (data.role === "student") {
        window.location.href = "/student/dashboard"
      }

      if (data.role === "teacher") {
        window.location.href = "/teacher/dashboard"
      }

      if (data.role === "parent") {
        window.location.href = "/parent/dashboard"
      }

    } catch (err) {

      setError("Network error")

    }

  }

  return (

    <div>

      <h2>Login</h2>

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>
        Login
      </button>

      {error && <p>{error}</p>}

    </div>

  )

}