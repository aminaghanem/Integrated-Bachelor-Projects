"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ParentSignup() {

  const router = useRouter()

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    relationship_type: "",
    children: ""
  })

  const [error, setError] = useState("")

  const handleChange = (e:any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const validateForm = () => {

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(form.email)) {
      return "Invalid email format"
    }

    if (form.password !== form.confirmPassword) {
      return "Passwords do not match"
    }

    if (!form.relationship_type) {
      return "Please select relationship type"
    }

    if (!form.children) {
      return "Please enter children usernames"
    }


    if (form.children.includes(" ") &&!form.children.includes(",")) {
      return "Enter children usernames separated by commas"
    }

    return null
  }

  const handleSubmit = async (e:any) => {

    try{
        e.preventDefault()

        setError("")

        const validationError = validateForm()

        if (validationError) {
            setError(validationError)
            return
        }

        const children_usernames = form.children.split(",").map((c)=>c.trim())

        const res = await fetch("http://localhost:4000/api/auth/signup/parent", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: form.username,
                email: form.email,
                password: form.password,
                relationship_type: form.relationship_type,
                children_usernames
            })
        })

        const data = await res.json()

        if (!res.ok) {
            setError(data.message)
            return
        }

        localStorage.setItem("token", data.token)

        alert("Signup successful!")

        console.log(data)
    }

    catch(error){
      console.log(error)
      alert("Signup failed")
    }
    
  }

  return (
    <div>

      <h1>Parent Signup</h1>

      {error && <p style={{color:"red"}}>{error}</p>}

      <form onSubmit={handleSubmit}>

        <input
          name="username"
          placeholder="Username"
          onChange={handleChange}
        />

        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
        />

        <input
          name="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          onChange={handleChange}
        />

        <select
          name="relationship_type"
          onChange={handleChange}
          required
        >
          <option value="">Select Relationship</option>
          <option value="mother">Mother</option>
          <option value="father">Father</option>
        </select>

        <input
          name="children"
          placeholder="Child usernames (comma separated)"
          onChange={handleChange}
        />

        <button type="submit">
          Signup
        </button>

      </form>

    </div>
  )
}
