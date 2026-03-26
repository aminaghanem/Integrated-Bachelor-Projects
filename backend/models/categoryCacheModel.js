// models/CategoryCache.js

const mongoose = require("mongoose")

const categoryCacheSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

module.exports = mongoose.model("CategoryCache", categoryCacheSchema)