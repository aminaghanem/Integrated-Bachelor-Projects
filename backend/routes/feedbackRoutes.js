const express = require("express")
const router = express.Router()
const FeedbackResponse = require("../models/feedbackResponseModel")
const Student = require("../models/studentModel")
const CategoryCache = require("../models/categoryCacheModel")
const { protect, authorizeRoles } = require("../middleware/authMiddleware")

const normalizeUrl = (url) => {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace("www.", "")
  } catch {
    return url
  }
}

// POST /api/feedback
router.post("/", protect, authorizeRoles("student"), async (req, res) => {
  try {
    const { url, resource_category, interest_rating, usefulness_rating, perceived_difficulty } = req.body
    
    // Try to fetch category from cache first
    let finalCategory = resource_category || "General"
    const domain = normalizeUrl(url)
    
    const cached = await CategoryCache.findOne({ url: domain })
    if (cached) {
      finalCategory = cached.category
    }
    
    const feedback = await FeedbackResponse.create({
      student_id: req.user.id,
      url,
      resource_category: finalCategory,
      interest_rating,
      usefulness_rating,
      perceived_difficulty
    })
    res.status(201).json(feedback)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router