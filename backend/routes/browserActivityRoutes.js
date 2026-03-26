require("dotenv").config();

const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");

const axios = require("axios")
const cheerio = require("cheerio")

const BrowserActivity = require("../models/browserActivityModel.js");
const Student = require("../models/studentModel");
const CategoryCache = require("../models/categoryCacheModel");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const calculateAge = (dob) => {
  const today = new Date()
  const birthDate = new Date(dob)

  let age = today.getFullYear() - birthDate.getFullYear()

  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--
  }

  return age
}

const normalizeUrl = (url) => {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace("www.", "")
  } catch {
    return url
  }
}

const isExpired = (date) => {
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000
  return Date.now() - new Date(date).getTime() > ONE_WEEK
}

// Create activity (system/student)
router.post("/", protect, authorizeRoles("student"), async (req, res) => {
  const { student_id, url, interaction_type, visit_duration } = req.body;

  const student = await Student.findById(req.user.id).populate("class_id")

  if (!student) {
    return res.status(404).json({ error: "Student not found" })
  }

  let title = ""

  try {

    const page = await axios.get(url)
    const $ = cheerio.load(page.data)

    title = $("title").text()

  } catch (err) {

    console.log("Title fetch failed")

  }

  let category = "General"; // Default fallback
  const domain = normalizeUrl(url)

  // 🔍 1. CHECK CACHE FIRST
  let cached = await CategoryCache.findOne({ url: domain })

  if (cached && !isExpired(cached.updatedAt)) {
    console.log("✅ Using cached category:", cached.category)
    category = cached.category
  }
  else {
    console.log("⚠️ Not cached → calling AI")
      try {
        // 1. Use the new model identifier: gemini-2.5-flash
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash", 
          contents: [{ role: "user", parts: [{ text:
            `You are classifying websites for a school monitoring system.
            URL: ${url}
            Title: ${title}
            Choose ONE category:
            Algebra
            Geometry
            Biology
            Chemistry
            Physics
            Geography
            History
            Art
            Social
            Entertainment
            Space
            Games
            Sports

            OR any other MORE specific category that fits better.

            Return ONLY the category name.` }] }]
        });

        const aiText = response.text.trim();
        if (aiText) category = aiText;

      } catch (error) {
        console.error("AI Error (Falling back to local logic):", error.message);
        // Simple local fallback as a safety net
        if (url.includes("wikipedia")) category = "Research";
        else if (url.includes("khanacademy")) category = "Math";
        else category = "General" // fallback
      }

      // 💾 SAVE TO CACHE
      await CategoryCache.findOneAndUpdate(
        { url: domain },
        { category, updatedAt: new Date() },
        { upsert: true, returnDocument: "after"  }
      )
  }

  const age = calculateAge(student.date_of_birth);

  try {
    const activity = new BrowserActivity({
      student_id,
      age,
      grade: student.class_id ? student.class_id.grade_level : undefined,
      interests: student.interests || [],
      url,
      category,
      interaction_type,
      visit_duration,
      timestamp: new Date()
    });

    await activity.save();
    res.status(201).json({ success: true, category });
  } catch (dbError) {
    res.status(500).json({ error: "Database save failed" });
  }
});


// Get all activity (teacher only)
// router.get(
//   "/",
//   protect,
//   authorizeRoles("teacher"),
//   async (req, res) => {
//     const activity = await BrowserActivity.find().populate("student_id");
//     res.json(activity);
//   }
// );

module.exports = router;