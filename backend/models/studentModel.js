const mongoose = require("mongoose");

const proficiencySchema = new mongoose.Schema({
  category: { type: String, required: true },
  level: {
    type: String,
    enum: ["beginner", "advanced", "expert"],
    default: "beginner"
  },
  assigned_by: { type: String }, // "system" or teacher_id
  last_updated: { type: Date, default: Date.now }
});

const learningHistorySchema = new mongoose.Schema({
  resource_id: String,
  resource_title: String,
  category: String,
  completion_status: {
    type: String,
    enum: ["completed", "in_progress"]
  },
  grade: Number,
  completion_date: Date,
  source: {
    type: String,
    enum: ["self-reported", "system-tracked"]
  }
});

const studentSchema = new mongoose.Schema({
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parent"
  },

  // teacher_ids: [
  //   {
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: "Teacher"
  //   }
  // ],

  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },

  full_name: {
  type: String,
  required: true,
  trim: true
  },

  personal_email: {
    type: String,
    required: false,
    trim: true
  },

  // school_name: {
  //   type: String,
  //   required: true,
  //   trim: true
  // },

  // school_class: {
  //   type: String,
  //   required: true,
  //   trim: true
  // },

  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SchoolClass",
    default: null
  },

  date_of_birth: {
    type: Date,
    required: true
  },
  
  grade_level: Number,
  preferred_language: String,

  learning_preferences: {
    type: String,
    enum: ["Visual", "Auditory", "Reading/Writing", "Kinesthetic"]
  },

  accessibility: {
    has_accessibility_needs: { type: Boolean, default: false },
    sensory_limitations: [String],
    neurodiversity_flags: [String]
  },

  context: {
    region: String,
    school_type: String
  },

  interests: {
    interest_scores: [
      {
        category: String,
        score: { type: Number, default: 0 }
      }
    ],
    last_updated: { type: Date, default: Date.now }
  },

  learning_history: [learningHistorySchema],

  proficiency_levels: [proficiencySchema],

  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Student", studentSchema);