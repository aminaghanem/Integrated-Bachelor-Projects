const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  category: {
    type: String,
    enum: ["STEM", "Humanities", "Languages", "Arts", "Mathematics", "Sciences"],
    required: true
  },

  grade_levels: [String],

  created_at: {
    type: Date,
    default: Date.now
  }

})

module.exports = mongoose.model("Subject", subjectSchema);