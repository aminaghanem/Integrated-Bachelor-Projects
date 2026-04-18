const express = require("express")
const router = express.Router()
const FeedbackResponse = require("../models/feedbackResponseModel")
const Student = require("../models/studentModel")
const CategoryCache = require("../models/categoryCacheModel")
const { protect, authorizeRoles } = require("../middleware/authMiddleware")
const { buildContextVector, updateArm, initArmState, rewardFromFeedback } = require("../utils/linucb");

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

    const student = await Student.findById(req.user.id).populate("class_id");

    if (cached) {
      const contextVector = buildContextVector(student);
      const currentState = cached.linucb || initArmState();
      
      const reward = rewardFromFeedback({
        completion_status: req.body.completion_status,
        interest_rating: req.body.interest_rating,
        usefulness_rating: req.body.usefulness_rating,
        visit_duration: req.body.visit_duration,
        interaction_type: req.body.interaction_type
      });

      const updatedState = updateArm(currentState, contextVector, reward);
      
      await CategoryCache.findOneAndUpdate(
        { url: domain },
        { linucb: updatedState },
        { upsert: false }
      );
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router