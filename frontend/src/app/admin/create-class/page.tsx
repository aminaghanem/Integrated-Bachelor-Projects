"use client"

import { useState } from "react"
import { useEffect } from "react"

type Subject = {
  subject_id: string
  teacher_username: string
}

export default function CreateClass() {

  const [form, setForm] = useState({
    school_name: "",
    grade_level: "",
    class_name: "",
    subjects: "",
    students: ""
  })

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const [subjects, setSubjects] = useState([
    { subject_id: "", teacher_username: "" }
  ])

  const [availableSubjects, setAvailableSubjects] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])

  const [students, setStudents] = useState([""])

  const fetchSubjectsByGrade = async (grade: string) => {
    if (!grade) return

    const res = await fetch(`http://localhost:4000/api/subjects/grade/${grade}`)
    const data = await res.json()
    setAvailableSubjects(data)
  }

  const fetchTeachers = async () => {
    const res = await fetch("http://localhost:4000/api/teachers")
    const data = await res.json()

    setTeachers(Array.isArray(data) ? data : data.teachers || [])
  }

  const handleSubjectChange = (index: number, field: keyof Subject, value: string) => {
    const updated = [...subjects]
    updated[index][field] = value
    setSubjects(updated)
  }

  const addSubject = () => {
    setSubjects([...subjects, { subject_id: "", teacher_username: "" }])
  }

  const removeSubject = (index: number) => {
    const updated = subjects.filter((_, i) => i !== index)
    setSubjects(updated)
  }

  const handleStudentChange = (index: number, value: string) => {
    const updated = [...students]
    updated[index] = value
    setStudents(updated)
  }

  const addStudent = () => {
    setStudents([...students, ""])
  }

  const removeStudent = (index: number) => {
    const updated = students.filter((_, i) => i !== index)
    setStudents(updated)
  }

  const handleChange = (e:any) => {
    setForm({...form, [e.target.name]: e.target.value})

    if (e.target.name === "grade_level") {
      fetchSubjectsByGrade(e.target.value)
    }
  }

  useEffect(() => {
    fetchTeachers()
  }, [])

  const handleSubmit = async (e:any) => {

    e.preventDefault()

    const res = await fetch("http://localhost:4000/api/classes/create",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        school_name:form.school_name,
        grade_level:Number(form.grade_level),
        class_name:form.class_name,
        subjects,
        student_usernames: students
      })
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      return
    }

    setMessage("Class created successfully")
  }

  return(
    <div>

      <h1>Create Class</h1>

      {error && <p style={{color:"red"}}>{error}</p>}
      {message && <p style={{color:"green"}}>{message}</p>}

      <form onSubmit={handleSubmit}>

        <input name="school_name" placeholder="School name" onChange={handleChange}/>

        <input name="grade_level" placeholder="Grade level" onChange={handleChange}/>

        <input name="class_name" placeholder="Class name (A,B,C)" onChange={handleChange}/>

        <h3> </h3>
        <table>
        <thead>
            <tr>
            <th>Subject</th>
            <th>Teacher Username</th>
            <th></th>
            </tr>
        </thead>
        <tbody>
            {subjects.map((s, i) => (
            <tr key={i}>
                <td>
                <select
                  value={s.subject_id || ""}
                  onChange={(e) =>
                    handleSubjectChange(i, "subject_id", e.target.value)
                  }
                >
                  <option value="">Select Subject</option>
                  {availableSubjects.map((sub) => (
                    <option key={sub._id} value={sub._id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
                </td>

                <td>
                <select
                  value={s.teacher_username}
                  onChange={async (e) => {
                    const selectedUsername = e.target.value

                    handleSubjectChange(i, "teacher_username", selectedUsername)

                    const teacher = teachers.find(t => t.username === selectedUsername)

                    if (!teacher || !s.subject_id) return

                    const canTeach = teacher.teachable_subjects?.includes(s.subject_id)

                    if (!canTeach) {
                      const confirmAdd = confirm(
                        "This teacher does not teach this subject. Do you want to add it?"
                      )

                      if (confirmAdd) {
                        await fetch(`http://localhost:4000/api/teachers/${teacher._id}/add-subject`, {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify({ subject_id: s.subject_id })
                        })

                        alert("Subject added to teacher ✅")
                      }
                    }
                  }}
                >
                  <option value="">Select Teacher</option>
                  {Array.isArray(teachers) &&
                    teachers.map((t) => (
                      <option key={t._id} value={t.username}>
                        {t.username}
                      </option>
                  ))}
                </select>
                </td>

                <td>
                <button type="button" onClick={() => removeSubject(i)}>
                    Remove
                </button>
                </td>
            </tr>
            ))}
        </tbody>
        </table>

        <button type="button" onClick={addSubject}>
        Add Subject
        </button>


        <h3> </h3>

        {students.map((student, i) => (
        <div key={i}>

            <input
            placeholder="Student username"
            value={student}
            onChange={(e) => handleStudentChange(i, e.target.value)}
            />

            <button type="button" onClick={() => removeStudent(i)}>
            Remove
            </button>

        </div>
        ))}

        <button type="button" onClick={addStudent}>
        Add Student
        </button>

        <button type="submit">Create Class</button>

      </form>

    </div>
  )
}
