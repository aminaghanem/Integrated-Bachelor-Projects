const express = require("express");
const router = express.Router();
const FeedbackResponse = require("../models/feedbackResponseModel.js");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Submit feedback (student only)
router.post(
  "/",
  protect,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const feedback = await FeedbackResponse.create({
        ...req.body,
        student_id: req.user.id
      });

      res.status(201).json(feedback);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// View feedback (teacher only)
router.get(
  "/",
  protect,
  authorizeRoles("teacher"),
  async (req, res) => {
    const feedback = await FeedbackResponse.find().populate("student_id");
    res.json(feedback);
  }
);

module.exports = router;