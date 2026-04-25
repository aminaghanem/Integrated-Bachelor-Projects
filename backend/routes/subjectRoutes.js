const express = require("express")
const router = express.Router()

const {
  createSubject,
  getAllSubjects,
  getSubjectsByGrade,
  updateSubject,
  deleteSubject
} = require("../controllers/subjectController")

const { protect, authorizeRoles } = require("../middleware/authMiddleware")

// POST /api/subjects
router.post("/", protect, authorizeRoles("admin"), createSubject)

// GET /api/subjects
router.get("/", getAllSubjects)

// GET /api/subjects/grade/10
router.get("/grade/:grade", getSubjectsByGrade)

router.put("/:id", protect, authorizeRoles("admin"), updateSubject);

router.delete("/:id", protect, authorizeRoles("admin"), deleteSubject);

module.exports = router