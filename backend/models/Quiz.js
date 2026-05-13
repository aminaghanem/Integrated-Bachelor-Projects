const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    validate: {
      validator: (arr) => arr.length === 4,
      message: "Each question must have exactly 4 options",
    },
    required: true,
  },
  correctAnswer: {
    type: String,
    required: true,
  },
});

const QuizSchema = new mongoose.Schema(
  {
    countryName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passThreshold: {
      type: Number,
      default: 80, // percentage
    },
    minToPass: {
      type: Number,
      default: 8, // number of correct answers needed
    },
    questions: {
      type: [QuestionSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "A quiz must have at least one question",
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Quiz", QuizSchema);
