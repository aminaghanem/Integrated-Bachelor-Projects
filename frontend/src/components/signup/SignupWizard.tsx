"use client"

import { useState, useEffect } from "react"

import Step1Account from "./Step1Account"
import Step2Profile from "./Step2Profile"
import Step3Interests from "./Step3Interests"
import Step4Accessibility from "./Step4Accessibility"
import Step5Review from "./Step5Review"

export interface SignupData {

  username: string
  password: string
  confirm_password: string

  full_name: string
  personal_email: string
  // school_name: string
  // school_class: string
  date_of_birth: string

  parent_email: string
  //grade_level: string

  preferred_language: string
  region: string
  school_type: string

  learning_preferences: string

  interest_scores: {
    category: string
    score: number
  }[]

  accessibility: {
    has_accessibility_needs: boolean
    sensory_limitations: string[]
    neurodiversity_flags: string[]
    sensory_other?: string
    neuro_other?: string
  }

}

type Errors = Record<string, string>

export default function SignupWizard() {

  const [errors, setErrors] = useState<Errors>({})

  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState<SignupData>({
  username: "",
  password: "",
  confirm_password: "",

  full_name: "",
  personal_email: "",
  // school_name: "",
  // school_class: "",
  date_of_birth: "",
  parent_email: "",
  //grade_level: "",

  preferred_language: "",
  region: "",
  school_type: "",

  learning_preferences: "",

  interest_scores: [],

  accessibility: {
    has_accessibility_needs: false,
    sensory_limitations: [],
    neurodiversity_flags: [],
    sensory_other: "",
    neuro_other: ""
  }
  });

  const nextStep = async () => {
    const valid = await validateStep()

    if (!valid) return

    setStep(step + 1)
  }

  const prevStep = async () => {
    const valid = await validateStep()

    if (!valid) return

    setStep(step - 1)
  }

  const updateField = (data: Partial<SignupData>) => {
    setFormData({
      ...formData,
      ...data
    })
    // Clear errors for updated fields
    setErrors((prev: Errors) => {
      const newErrors = { ...prev }
      Object.keys(data).forEach(key => {
        delete newErrors[key]
      })
      return newErrors
    })
  }

  const updateAccessibility = (data: Partial<SignupData['accessibility']>) => {
    setFormData({
      ...formData,
      accessibility: {
        ...formData.accessibility,
        ...data
      }
    })
    // Clear accessibility errors only if not selecting "Other" without text
    setErrors((prev: Errors) => {
      const newErrors = { ...prev }
      const updatedAccessibility = { ...formData.accessibility, ...data }
      
      // Don't clear error if selecting "Other" without text
      if (updatedAccessibility.sensory_limitations.includes("Other") && !updatedAccessibility.sensory_other?.trim()) {
        return newErrors
      }
      if (updatedAccessibility.neurodiversity_flags.includes("Other") && !updatedAccessibility.neuro_other?.trim()) {
        return newErrors
      }
      
      delete newErrors.accessibility
      return newErrors
    })
  }

  const validateStep = async () => {

    const newErrors: Errors = {}

    if (step === 1) {

      if (!formData.username)
        newErrors.username = "Username is required"

      const res = await fetch(`http://localhost:4000/api/students/check-username/${formData.username}`)
      const result = await res.json()

      if (result.exists)
        newErrors.username = "Username already exists"
        
      if (!formData.password)
        newErrors.password = "Password is required"

      if (formData.password.length != 0 && formData.password.length < 6)
        newErrors.password = "Password must be at least 6 characters"

      if (!formData.confirm_password) {
        newErrors.confirm_password = "Please confirm your password"
      }

      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = "Passwords do not match"
      }

      if (Object.keys(newErrors).length > 0)
        setErrors(newErrors)

    }

    if (step === 2) {

      if (!formData.full_name)
        newErrors.full_name = "Full name is required"

      if (!formData.date_of_birth)
        newErrors.date_of_birth = "Date of birth is required"

      if (formData.personal_email && !/\S+@\S+\.\S+/.test(formData.personal_email)) {
        newErrors.personal_email = "Invalid email format"
        }

      if (!formData.parent_email)
        newErrors.parent_email = "Parent email is required"

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (!emailRegex.test(formData.parent_email))
        newErrors.parent_email = "Invalid email address"

      // if (!formData.school_name)
      //   newErrors.school_name = "School name is required"

      // if (!formData.school_class)
      //   newErrors.school_class = "School class is required"

      // if (!formData.grade_level)
      //   newErrors.grade_level = "Grade level is required"

      if (!formData.region)
        newErrors.region = "Please select a region"

      if (!formData.preferred_language)
        newErrors.preferred_language = "Please select a language"

      if (!formData.school_type)
        newErrors.school_type = "Please select a school type"

      if (!formData.learning_preferences)
        newErrors.learning_preferences = "Please select a learning preference"

    }

    if (step === 3) {

      const hasInterest =
        formData.interest_scores.some((item: any) => item.score > 0)

      if (!hasInterest)
        newErrors.interests = "Please rate at least one subject"

    }

    if (step === 4) {

      if (
        formData.accessibility.has_accessibility_needs &&
        formData.accessibility.sensory_limitations.length === 0 &&
        formData.accessibility.neurodiversity_flags.length === 0
      ) {
        newErrors.accessibility =
          "Please select at least one accessibility need"
      }

      if (formData.accessibility.sensory_limitations.includes("Other") && !formData.accessibility.sensory_other?.trim()) {
        newErrors.accessibility = "Please specify your sensory limitation"
      }

      if (formData.accessibility.neurodiversity_flags.includes("Other") && !formData.accessibility.neuro_other?.trim()) {
        newErrors.accessibility = "Please specify your neurodiversity flag"
      }

    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  const submitSignup = async () => {

    try {

      const payload = {
        ...formData,

        context: {
          region: formData.region,
          school_type: formData.school_type
        },

        interests: {
          interest_scores: formData.interest_scores,
          last_updated: new Date()
        },

        accessibility: {
          ...formData.accessibility,
          sensory_limitations: formData.accessibility.sensory_limitations.map(v =>
            v === "Other" ? formData.accessibility.sensory_other : v
          ),
          neurodiversity_flags: formData.accessibility.neurodiversity_flags.map(v =>
            v === "Other" ? formData.accessibility.neuro_other : v
          )
        }
      }

      const response = await fetch("http://localhost:4000/api/students/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw Error(data.error)
      }

      alert("Signup successful!")

      console.log(data)

    } catch (error) {
      console.log(error)
      alert("Signup failed")
    }

  }

  return (
    <div className="signup-container">

      <h2>Student Signup</h2>

      <div className="step-indicator">
        Step {step} of 5
      </div>

      {step === 1 && (
        <Step1Account
          data={formData}
          update={updateField}
          next={nextStep}
          errors={errors}
        />
      )}

      {step === 2 && (
        <Step2Profile
          data={formData}
          update={updateField}
          next={nextStep}
          back={prevStep}
          errors={errors}
        />
      )}

      {step === 3 && (
        <Step3Interests
          data={formData}
          update={updateField}
          next={nextStep}
          back={prevStep}
          errors={errors}
        />
      )}

      {step === 4 && (
        <Step4Accessibility
          data={formData}
          update={updateAccessibility}
          next={nextStep}
          back={prevStep}
          errors={errors}
        />
      )}

      {step === 5 && (
        <Step5Review
          data={formData}
          back={prevStep}
          submit={submitSignup}
        />
      )}

    </div>
  )
}