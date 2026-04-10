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

  if (url === undefined || url === null) {
    return res.status(400).json({ error: "URL is required" })
  }

  if (typeof url !== "string") {
    return res.status(400).json({ error: "URL must be a string" })
  }

  try {

    const student = await Student.findById(req.user.id).populate("class_id")

    if (!student) {
      return res.status(404).json({ error: "Student not found" })
    }

    const age = Number(calculateAge(student.date_of_birth))
    if (!age || age < 1) {
      return res.status(400).json({ error: "Your age could not be determined. Please contact your school administrator!" })
    }
    
    if (!student.class_id){
      return res.status(400).json({ error: "Your grade level could not be determined. Please contact your school administrator!" })
    }

    // Payload structure in the /check route
    const orchestratorPayload = {
      url: url,
      user_id: student._id.toString(),
      age: age,
      grade_level: Number(student.class_id.grade_level),
      interests: (student.interests?.interest_scores ?? [])
        .filter(item => item.category && String(item.category).length > 0)
        .map(item => ({
          interest: String(item.category),
          rating: Math.max(1, Math.min(5, Math.round(Number(item.score))))
        }))
    };
        
    console.log("Sending to orchestrator:", JSON.stringify(orchestratorPayload, null, 2))

    const orchResponse = await axios.post("http://127.0.0.1:8000/evaluate", orchestratorPayload, {
      headers: { "Content-Type": "application/json" }
    });

    console.log("Data forwarded to Orchestrator");

    const { decision, ui_message} = orchResponse.data;

    // Handle BLOCKED decision (Test Cases 10, 12, 13, 17)
    if (decision === "Blocked") {
      return res.status(403).json({
        success: false,
        decision: "Blocked",
        message: ui_message,
        retrigger_browser: orchResponse.data.retrigger_browser ?? false
      })
    }

    // Allowed — pass full orchestrator response to frontend
    return res.json({
      success: true,
      ...orchResponse.data
    })

  } 
  catch (err) {
    // Orchestrator returned a 400 (payload validation error)
    if (err.response?.status === 400) {
      console.error("Orchestrator validation error:", err.response.data)
      return res.status(400).json({
        error: "Payload validation failed",
        details: err.response.data
      })
    }

    // Orchestrator unreachable or crashed — block by default for safety
    console.error("Orchestrator error:", err.response?.data || err.message)
    return res.status(502).json({
      success: false,
      decision: "Blocked",
      message: "The security service is temporarily unavailable. Please try again."
    })
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

    // CHECK CACHE FIRST
    let cached = await CategoryCache.findOne({ url: domain })

    if (cached && !isExpired(cached.updatedAt)) {
      console.log("✅ Using cached category:", cached.category)
      category = cached.category
    }
    else {
      console.log("⚠️ Not cached → calling AI")
        try {
          // Use the new model identifier: gemini-2.5-flash
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

        // SAVE TO CACHE
        await CategoryCache.findOneAndUpdate(
          { url: domain },
          { category, updatedAt: new Date() },
          { upsert: true, returnDocument: "after"  }
        )
    }

    // Save activity to DB (Test Cases 11, 14, 15, 16)
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