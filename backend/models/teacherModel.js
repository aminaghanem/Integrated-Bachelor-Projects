const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },

  teaching_assignments: [
    {
      class_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SchoolClass"
      },
      subject_name: String
    }
  ],

  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Teacher", teacherSchema);