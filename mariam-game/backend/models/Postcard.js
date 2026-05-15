const mongoose = require("mongoose");

const PostcardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // stores the drag-and-drop layout as flexible JSON
    // e.g. [{ elementId: 'sphinx', x: 120, y: 340, width: 80, height: 80, rotation: 0 }]
    jsonLayout: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    postcardText: {
      type: String,
      trim: true,
      default: "",
    },
    backgroundName: {
      type: String,
      trim: true,
      default: "",
    },
    // optional: saved image URL if you later render + upload the postcard
    imageUrl: {
      type: String,
      default: null,
    },
    emotionAnalysis: {
      emotion: { type: String, default: "" },
      message: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Postcard", PostcardSchema);
