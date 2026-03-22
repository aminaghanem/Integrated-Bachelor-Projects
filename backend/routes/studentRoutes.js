const express = require("express");
const router = express.Router();
const {
  createStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  loginStudent,
  getStudentProfile
} = require("../controllers/studentController");
const Student = require("../models/studentModel");
const Parent = require("../models/parentModel.js");
const Teacher = require("../models/teacherModel.js");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.post("/signup", createStudent);

router.get("/", protect, authorizeRoles("teacher", "parent"), getStudents);

router.patch("/:id", protect, updateStudent);

router.delete("/:id", protect, authorizeRoles("teacher"), deleteStudent);

router.post("/login", loginStudent);

router.get("/profile", protect, getStudentProfile);

router.get("/:id", protect, getStudent);

router.get("/check-username/:username", async (req, res) => {
  try {

    const { username } = req.params;

    console.log("Checking username:", username);

    const existingStudent = await Student.findOne({ username: username });
    const existingTeacher = await Teacher.findOne({ username: username });
    const existingParent = await Parent.findOne({ username: username });

    if (existingStudent || existingTeacher || existingParent) {
      return res.json({ exists: true });
    }

    return res.json({ exists: false });

  } catch (error) {

    console.error("Username check error:", error);

    return res.status(500).json({
      error: "Server error checking username"
    });

  }
});

module.exports = router;