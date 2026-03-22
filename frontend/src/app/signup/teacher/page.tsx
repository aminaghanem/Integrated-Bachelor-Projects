"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function TeacherSignup() {

  const router = useRouter()

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

  const [error, setError] = useState("")

  const handleChange = (e:any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const validateForm = () => {

    // email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(form.email)) {
      return "Invalid email format"
    }

    // password match
    if (form.password !== form.confirmPassword) {
      return "Passwords do not match"
    }

    // subjects comma format
    // if (form.subjects.includes(" ") && !form.subjects.includes(",")) {
    //   return "Subjects must be separated by commas (example: Math,Physics,English)"
    // }

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

        const res = await fetch("http://localhost:4000/api/auth/signup/teacher", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ...form
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
    
    //router.push("/dashboard")
  }

  return (
    <div>

      <h1>Teacher Signup</h1>

      {error && (
        <p style={{color:"red"}}>{error}</p>
      )}

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
          placeholder="Password (at least 6 characters)"
          onChange={handleChange}
        />

        <input
          name="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          onChange={handleChange}
        />

        {/* <input
          name="subjects"
          placeholder="Subjects (comma separated)"
          onChange={handleChange}
        /> */}

        <button type="submit">
          Signup
        </button>

      </form>

    </div>
  )
}