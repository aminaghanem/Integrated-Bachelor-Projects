const mongoose = require("mongoose");

const feedbackResponseSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  url: String,
  resource_category: String,

  interest_rating: { type: Number, min: 1, max: 5 },
  usefulness_rating: { type: Number, min: 1, max: 5 },

  perceived_difficulty: {
    type: String,
    enum: ["easy", "moderate", "hard"]
  },

  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("FeedbackResponse", feedbackResponseSchema);