const Student = require("../models/studentModel.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// CREATE student
const createStudent = async (req, res) => {
  const { 
    username,
    full_name,
    personal_email,
    date_of_birth,
    parent_email,
    region,
    preferred_language,
    school_type,
    password,
    learning_preferences,
    interest_scores,
    accessibility } = req.body;

  // Validate required fields
  if (
  !username ||
  !password ||
  !date_of_birth ||
  !parent_email
  ) {
    return res.status(400).json({ error: "Username, password, date of birth, and parent email are required" })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (personal_email && !emailRegex.test(personal_email) && !emailRegex.test(parent_email)) {
    return res.status(400).json({ error: "Invalid email format" })
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({
      error: "Password must be at least 6 characters"
    })
  }

  try {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create student with correct field mappings
    const student = await Student.create({
      username,
      password_hash,
      full_name,
      date_of_birth,

      ...(personal_email && { personal_email }),
      // ...(school_name && { school_name }),
      // ...(school_class && { school_class }),

      //...(grade_level && { grade_level: parseInt(grade_level) }),
      ...(preferred_language && { preferred_language }),
      ...(learning_preferences && { learning_preferences }),

      ...(region && school_type && {
        context: {
          region,
          school_type
        }
      }),

      ...(interest_scores && {
        interests: {
          interest_scores,
          last_updated: new Date()
        }
      }),

      ...(accessibility && { accessibility })

    });

    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// GET all students
const getStudents = async (req, res) => {
  const students = await Student.find()
    .populate("parent_id")

  res.json(students);
};

// GET one
const getStudent = async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate("parent_id")

  if (!student)
    return res.status(404).json({ message: "Student not found" });

  res.json(student);
};

// UPDATE
const updateStudent = async (req, res) => {
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.json(student);
};

// DELETE
const deleteStudent = async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.json({ message: "Student deleted" });
};

const loginStudent = async (req, res) => {

  const { username, password } = req.body || {}

  if (!username || !password) {
    return res.status(400).json({
      error: "Username and password are required"
    })
  }

  try {

    // check username exists
    const student = await Student.findOne({ username })

    if (!student) {
      return res.status(400).json({
        error: "Invalid username or password"
      })
    }

    // compare password with hashed password
    const match = await bcrypt.compare(password, student.password_hash)

    if (!match) {
      return res.status(400).json({
        error: "Invalid username or password"
      })
    }

    // create JWT token
    const token = jwt.sign(
      { id: student._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({
      message: "Login successful",
      token,
      student: {
        id: student._id,
        username: student.username
      }
    })

  } catch (error) {

    res.status(500).json({
      error: "Server error during login"
    })

  }

};

const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id)  // ← req.user not req.student

    if (!student) {
      return res.status(404).json({ error: "Student not found" })
    }

    res.json(student)
  } catch (error) {
    console.error("Profile error:", error)
    res.status(500).json({ error: "Server error" })
  }
}

module.exports = {
  createStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  loginStudent,
  getStudentProfile
};