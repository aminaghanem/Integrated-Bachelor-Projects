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

router.get("/", protect, authorizeRoles("admin"), getStudents);

router.put("/:id", protect, authorizeRoles("admin"), updateStudent);

router.delete("/:id", protect, authorizeRoles("admin"), deleteStudent);

router.get("/profile", protect, authorizeRoles("student"), getStudentProfile);

router.get("/:id", protect, authorizeRoles("admin"), getStudent);

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

router.put("/proficiency/:studentId", protect, authorizeRoles("teacher", "admin"), async (req, res) => {
  const { category, level } = req.body
  if (!category || !level)
    return res.status(400).json({ error: "category and level are required" })

  try {
    const student = await Student.findById(req.params.studentId)
    if (!student) return res.status(404).json({ error: "Student not found" })

    const existing = student.proficiency_levels.find(p => p.category === category)

    if (existing) {
      existing.level = level
      existing.assigned_by = req.user.id
      existing.last_updated = new Date()
    } else {
      student.proficiency_levels.push({
        category,
        level,
        assigned_by: req.user.id,
        last_updated: new Date()
      })
    }

    await student.save()
    res.json({ message: "Proficiency updated", proficiency_levels: student.proficiency_levels })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router;