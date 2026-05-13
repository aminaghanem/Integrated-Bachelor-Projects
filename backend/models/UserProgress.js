const mongoose = require("mongoose");

const UserProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    hasStamp: {
      type: Boolean,
      default: false,
    },
    completedCategories: {
      type: [String], // e.g. ['food', 'landmark', 'festival']
      default: [],
    },
    quizScore: {
      type: Number,
      default: null, // null = not attempted yet
    },
    quizPassed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    quizAttempts: { type: Number, default: 0 },
quizWrongAnswers: { type: [String], default: [] }, // stores question text of wrong answers
  },
  { timestamps: true },
);

// One progress record per user per country
UserProgressSchema.index({ userId: 1, countryId: 1 }, { unique: true });

module.exports = mongoose.model("UserProgress", UserProgressSchema);
