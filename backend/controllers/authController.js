const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/studentModel.js");
const Parent = require("../models/parentModel.js");
const Teacher = require("../models/teacherModel.js");
const Admin = require("../models/adminModel") ;

const login = async (req, res) => {

  const { username, password } = req.body

  try {

    console.log("Login attempt:", username)

    let user = null
    let role = null

    // check students
    user = await Student.findOne({ username })

    if (user) {
      role = "student"
    }

    // check teachers
    if (!user) {
      user = await Teacher.findOne({ username })
      if (user) {
        role = "teacher"
      }
    }

    // check parents
    if (!user) {
      user = await Parent.findOne({ username })
      if (user) {
        role = "parent"
      }
    }

    // check admins
    if (!user) {
      user = await Admin.findOne({ username })
      if (user) {
        role = "admin"
      }
    }

    if (user) {

      const valid = await bcrypt.compare(password, user.password_hash)

      if (!valid) {
        return res.status(400).json({ error: "Invalid credentials" })
      }

      // ✅ generate token CORRECTLY
      const token = jwt.sign(
        { id: user._id, role },   // 🔥 USE REAL ROLE
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      )

      return res.json({
        token,
        role,
        userId: user._id
      })
    }

    return res.status(400).json({ error: "Invalid Username or Password" })

  } catch (err) {

    console.error("LOGIN ERROR:", err)
    res.status(500).json({ error: "Server error" })

  }

};

const signupTeacher = async (req, res) => {
  try {

    const { username, email, password} = req.body

    // Check duplicate username
    const existingStudent = await Student.findOne({ username })
    const existingTeacher = await Teacher.findOne({ username })
    const existingParent = await Parent.findOne({ username })

    if (existingStudent || existingTeacher || existingParent) {
      return res.status(400).json({
        error: "Username already exists"
      })
    }

    // Check duplicate email
    const existingEmail = await Teacher.findOne({ email })

    if (existingEmail) {
      return res.status(400).json({
        message: "Email already registered"
      })
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format"
      })
    }

    // Subjects validation
    // if (!Array.isArray(subjects) || subjects.length === 0) {
    //   return res.status(400).json({
    //     message: "Subjects must be provided"
    //   })
    // }

    const hashedPassword = await bcrypt.hash(password, 10)

    const teacher = new Teacher({
      username,
      email,
      password_hash: hashedPassword
    })

    await teacher.save()

    const token = jwt.sign(
      { id: teacher._id, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({
      token,
      role: "teacher",
      teacher
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
}

const signupParent = async (req, res) => {

  try {

    const { username, email, password, relationship_type, children_usernames } = req.body

    // check duplicate username
    const existingStudent = await Student.findOne({ username })
    const existingTeacher = await Teacher.findOne({ username })
    const existingParent = await Parent.findOne({ username })

    if (existingStudent || existingTeacher || existingParent) {
      return res.status(400).json({
        error: "Username already exists"
      })
    }

    // check duplicate email
    const existingEmail = await Parent.findOne({ email })
    if (existingEmail) {
      return res.status(400).json({
        message: "Email already registered"
      })
    }

    // email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format"
      })
    }

    // find children by username
    const children = await Student.find({
      username: { $in: children_usernames }
    })

    if (children.length !== children_usernames.length) {
      return res.status(400).json({
        message: "One or more student usernames do not exist"
      })
    }

    const children_ids = children.map(child => child._id)

    // check if parent role already exists
    for (let childId of children_ids) {

      const existingParent = await Parent.findOne({
        relationship_type,
        children_ids: childId
      })

      if (existingParent) {
        return res.status(400).json({
          message: `A ${relationship_type} is already registered for this student`
        })
      }

    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const parent = new Parent({
      username,
      email,
      password_hash: hashedPassword,
      relationship_type,
      children_ids
    })

    await parent.save()

    const token = jwt.sign(
      { id: parent._id, role: "parent" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.status(201).json({
      token,
      role: "parent",
      parent
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: "Server error"
    })

  }

}

module.exports = { login, signupTeacher, signupParent };