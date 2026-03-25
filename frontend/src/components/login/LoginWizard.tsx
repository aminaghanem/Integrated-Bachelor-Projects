"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function Login() {

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const router = useRouter()

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
        router.push("/student/dashboard")
      }

      if (data.role === "teacher") {
        router.push("/teacher/dashboard")
      }

      if (data.role === "parent") {
        router.push ("/parent/dashboard")
      }

      if (data.role === "admin") {
        router.push ("/admin/dashboard")
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