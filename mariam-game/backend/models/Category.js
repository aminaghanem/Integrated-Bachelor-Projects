const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    countryName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["food", "landmark", "festival"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    // funFacts empty array for food, populated for landmark/festival
    funFacts: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Category", CategorySchema);
