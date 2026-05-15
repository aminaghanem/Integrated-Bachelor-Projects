const express = require("express")
const router = express.Router()
const StudentProfile = require("../models/StudentProfile")
const {protect} = require("../middleware/authMiddleware") // your existing JWT middleware

// GET — fetch profile (called on every login)
router.get("/", protect, async (req, res) => {
  try {
    console.log("req.student:", req.student)   // ← add this
    console.log("req.user:", req.user)         // ← and this
    const profile = await StudentProfile.findOne({ student_id: req.user.id })
    res.json(profile || { student_id: req.user.id, nickname: null, avatar: null, best_score: 0 })
  } catch (err) {
    console.error("student-profile GET error:", err)  // ← change catch to log err
    res.status(500).json({ error: "Server error" })
  }
})

// POST — create or update profile
router.post("/", protect, async (req, res) => {
  try {
    const { nickname, avatar, best_score } = req.body
    const profile = await StudentProfile.findOneAndUpdate(
      { student_id: req.user.id },
      { $set: { ...(nickname !== undefined && { nickname }), ...(avatar !== undefined && { avatar }), ...(best_score !== undefined && { best_score }) } },
      { upsert: true, returnDocument: 'after' }
    )
    res.json(profile)
  } catch (err) {
    console.error("student-profile POST error:", err)  // ← change catch to log err
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router