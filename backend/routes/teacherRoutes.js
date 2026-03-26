const express = require("express");
const router = express.Router();

const {
  createTeacher,
  getTeachers,
  addTeachableSubject,
  getTeacherProfile,
  updateTeacher
} = require("../controllers/teacherController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const Teacher = require("../models/teacherModel")
const Subject = require("../models/subjectModel")

// Create teacher (you may restrict this later to admin only)
router.post("/", createTeacher);

// Get all teachers (protected)
router.get(
  "/",
  //protect,
  //authorizeRoles("parent", "teacher"),
  getTeachers
);

router.put("/:id/add-subject", addTeachableSubject);
router.get("/profile", protect, authorizeRoles("teacher"), getTeacherProfile);
router.put("/:id", protect, authorizeRoles("teacher", "admin"), updateTeacher);

router.get("/subjects/all", protect, async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 })
  res.json(subjects)
})

router.put("/:id/subjects", protect, authorizeRoles("admin"), async (req, res) => {
  const teacher = await Teacher.findByIdAndUpdate(
    req.params.id,
    { $pull: { teachable_subjects: req.body.subjectId } },
    { returnDocument: 'after' }
  ).populate("teachable_subjects")
  res.json(teacher)
})

module.exports = router;