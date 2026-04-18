// models/CategoryCache.js

const mongoose = require("mongoose")

const categoryCacheSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  page_title: String,
  embedding: [Number], 
  linucb: {
    A: { type: [[Number]], default: undefined },
    b: { type: [Number],   default: undefined }
  },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

module.exports = mongoose.model("CategoryCache", categoryCacheSchema)