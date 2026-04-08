"use client"

import { useState } from "react"

export default function CreateSubject() {

  const [form, setForm] = useState({
    name: "",
    category: "STEM",
    grade_levels: ""
  })

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    setError("")
    setMessage("")

    const res = await fetch("http://localhost:4000/api/subjects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...form,
        grade_levels: form.grade_levels.split(",").map((g) => g.trim())
      })
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Something went wrong")
      return
    }

    setMessage("Subject created successfully")

    setForm({
      name: "",
      category: "STEM",
      grade_levels: ""
    })
  }

  return (
    <div>
      <h1>Create Subject</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}

      <form onSubmit={handleSubmit}>

        <input
          name="name"
          placeholder="Subject Name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <select name="category" value={form.category} onChange={handleChange}>
          <option>STEM</option>
          <option>Mathematics</option>
          <option>Sciences</option>
          <option>Languages</option>
          <option>Humanities</option>
          <option>Arts</option>
        </select>

        <input
          name="grade_levels"
          placeholder="Grades (comma separated e.g. 10,11)"
          value={form.grade_levels}
          onChange={handleChange}
          required
        />

        <button type="submit">Create Subject</button>

      </form>
    </div>
  )
}