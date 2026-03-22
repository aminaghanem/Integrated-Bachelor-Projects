const express = require("express");
const router = express.Router();

const {
  createTeacher,
  getTeachers
} = require("../controllers/teacherController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Create teacher (you may restrict this later to admin only)
router.post("/", createTeacher);

// Get all teachers (protected)
router.get(
  "/",
  protect,
  authorizeRoles("parent", "teacher"),
  getTeachers
);

module.exports = router;