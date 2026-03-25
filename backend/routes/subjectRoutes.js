const express = require("express")
const router = express.Router()

const {
  createSubject,
  getAllSubjects,
  getSubjectsByGrade
} = require("../controllers/subjectController")

// POST /api/subjects
router.post("/", createSubject)

// GET /api/subjects
router.get("/", getAllSubjects)

// GET /api/subjects/grade/10
router.get("/grade/:grade", getSubjectsByGrade)

module.exports = router