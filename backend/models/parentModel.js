const mongoose = require("mongoose");

const parentSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },

  children_ids: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    }
  ],

  relationship_type: {
    type: String,
    enum: ["mother", "father"],
    required: true
  },

  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Parent", parentSchema);