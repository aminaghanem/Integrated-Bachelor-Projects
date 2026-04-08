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

// Check URL
router.post("/check", protect, async (req, res) => {
  const { url } = req.body;

  try {

    const student = await Student.findById(req.user.id).populate("class_id")

    if (!student) {
      return res.status(404).json({ error: "Student not found" })
    }

    // 2. Prepare Payload (Ensuring types match Judy's Pydantic expectations)
    const age = Number(calculateAge(student.date_of_birth));
    const grade_level = student.class_id ? Number(student.class_id.grade_level) : 1;
    const interests = Array.isArray(student.interests) ? student.interests : [];

    //const age = calculateAge(student.date_of_birth);

    // Update your payload structure in the /check route
    const orchestratorPayload = {
      url: url, // URL remains at the root level
      profile: {
        user_id: student._id.toString(),
        age: Number(calculateAge(student.date_of_birth)),
        grade_level: student.class_id ? Number(student.class_id.grade_level) : 1,
        interests: student.interests.interest_scores.map(item => ({
          interest: item.category,
          rating: Number(item.score)
        }))
      }
    };
        
    const orchResponse = await axios.post("http://127.0.0.1:8000/evaluate", orchestratorPayload, {
      headers: { "Content-Type": "application/json" }
    });

    console.log("Data forwarded to Orchestrator");

    const { decision, ui_message, normalized_url } = orchResponse.data;

    // 4. Handle BLOCKED decision (Test Cases 10, 12, 13, 17)
    if (decision === "Blocked") {
      console.log(`🚫 Blocked by Orchestrator: ${ui_message}`);
      return res.status(403).json({ 
        success: false, 
        decision: "Blocked", 
        message: ui_message 
      });
    }

    res.json(orchResponse.data);

  } 
  catch (err) {
    console.error("DEBUG - Payload sent:", JSON.stringify(err.config?.data, null, 2));
    console.error("DEBUG - Orchestrator Error:", err.response?.data || err.message);
    
    // If Python crashes, we block by default for safety
    res.status(502).json({ 
      decision: "Blocked", 
      ui_message: "The security orchestrator is having trouble validating this request." 
    });
  }
});

// POST /api/activity/log
router.post("/log", protect, async (req, res) => {

  console.log("Log received body:", req.body);

  const { url, interaction_type, visit_duration } = req.body;

  if (!url || !interaction_type) {
    return res.status(400).json({ error: "Missing required logging data (url or interaction_type)" });
  }

  const student_id = req.user.id;
  const student = await Student.findById(req.user.id).populate("class_id")
  let category = "General";
  let title = ""

  try {

      const page = await axios.get(url)
      const $ = cheerio.load(page.data)

      title = $("title").text()

  } catch (err) {

      console.log("Title fetch failed")

  }

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
          else if (url.includes("khanacademy")) category = "Learning";
          else category = "General" // fallback
        }

        // 💾 SAVE TO CACHE
        await CategoryCache.findOneAndUpdate(
          { url: domain },
          { category, updatedAt: new Date() },
          { upsert: true, returnDocument: "after"  }
        )
    }

    // 6. Save activity to DB (Test Cases 11, 14, 15, 16)
    const activity = new BrowserActivity({
      student_id,
      age: calculateAge(student.date_of_birth),
      grade: student.class_id ? student.class_id.grade_level : undefined,
      interests: student.interests || [],
      url: url,
      category,
      interaction_type,
      visit_duration,
      decision: "Allowed",
      timestamp: new Date()
    });

    await activity.save();
    res.status(201).json({ success: true, category, decision: "Allowed" });
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