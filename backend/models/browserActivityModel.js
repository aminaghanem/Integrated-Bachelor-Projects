const mongoose = require("mongoose");

const browserActivitySchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  url: { type: String, required: true },
  category: { type: String, required: true },

  interaction_type: {
    type: String,
    enum: ["view", "scroll", "click"],
    required: true
  },

  visit_duration: Number,

  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("BrowserActivity", browserActivitySchema);