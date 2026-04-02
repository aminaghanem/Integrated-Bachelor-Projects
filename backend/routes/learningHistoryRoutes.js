const express = require("express")
const router = express.Router()
const Student = require("../models/studentModel")
const { protect, authorizeRoles } = require("../middleware/authMiddleware")

// POST /api/learning-history  — add or update an entry
router.post("/", protect, authorizeRoles("student"), async (req, res) => {
  try {
    const { url, resource_title, category, completion_status } = req.body
    const student = await Student.findById(req.user.id)
    if (!student) return res.status(404).json({ error: "Student not found" })

    // update if already exists for this url, otherwise push
    const existing = student.learning_history.find(h => h.resource_id === url)
    if (existing) {
      existing.completion_status = completion_status
      if (completion_status === "completed") existing.completion_date = new Date()
    } else {
      student.learning_history.push({
        resource_id: url,
        resource_title: resource_title || url,
        category: category || "General",
        completion_status,
        source: "system-tracked",
        completion_date: completion_status === "completed" ? new Date() : undefined
      })
    }

    await student.save()
    res.json({ success: true, learning_history: student.learning_history })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/learning-history
router.get("/", protect, authorizeRoles("student"), async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("learning_history")
    res.json(student?.learning_history ?? [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router