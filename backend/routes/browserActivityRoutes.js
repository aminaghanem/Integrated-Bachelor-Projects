require("dotenv").config();

const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");

const axios = require("axios")
const cheerio = require("cheerio")

const BrowserActivity = require("../models/browserActivityModel.js");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Create activity (system/student)
router.post("/", protect, authorizeRoles("student"), async (req, res) => {
  const { student_id, url, interaction_type, visit_duration } = req.body;

  let title = ""

  try {

    const page = await axios.get(url)
    const $ = cheerio.load(page.data)

    title = $("title").text()

  } catch (err) {

    console.log("Title fetch failed")

  }

  let category = "General"; // Default fallback
  
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
  }

  try {
    const activity = new BrowserActivity({
      student_id,
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