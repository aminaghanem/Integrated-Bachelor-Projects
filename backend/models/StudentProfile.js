// models/StudentProfile.js
const mongoose = require("mongoose")

const StudentProfileSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
  nickname: { type: String, default: null },
  avatar: { type: String, default: null },        // stores avatar key/id chosen in kids dashboard
  best_score: { type: Number, default: 0 },       // teens runner game high score
}, { timestamps: true })

module.exports = mongoose.model("StudentProfile", StudentProfileSchema)