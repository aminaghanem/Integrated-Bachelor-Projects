// routes/ai.js
const express = require("express");
const router = express.Router();
const UserProgress = require("../models/UserProgress");
const Country = require("../models/Country");
const Quiz = require("../models/Quiz");
const {
  generateQuizQuestion,
  generatePostcardKeywords,
  detectPostcardEmotion,
  recommendNextCountry,
} = require("../services/aiService");

// ─────────────────────────────────────────────
// POST /api/ai/quiz-difficulty
// Body: { userId, countryId }
// Called when child gets 2nd wrong answer on a retry attempt
// ─────────────────────────────────────────────
router.post("/quiz-difficulty", async (req, res) => {
  const { userId, countryId } = req.body;

  try {
    // 1. Get country name
    const country = await Country.findById(countryId);
    if (!country) return res.status(404).json({ message: "Country not found" });

    // 2. Get user progress for this country (attempts + wrong answers)
    const progress = await UserProgress.findOne({ userId, countryId });
    const attempt = progress?.quizAttempts ?? 1;
    const wrongAnswers = progress?.quizWrongAnswers ?? [];

    // 3. Get all existing quiz questions for this country
    const quizDoc = await Quiz.findOne({ countryId });
    const existingQuestions = quizDoc?.questions ?? [];

    // 4. Call AI
    const result = await generateQuizQuestion({
      countryName: country.name,
      attempt,
      wrongAnswers,
      existingQuestions,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("AI quiz-difficulty error:", error.message);
    res.status(500).json({ message: "AI error", error: error.message });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/ai/quiz-attempt
// Body: { userId, countryId, wrongAnswers: ["question text", ...] }
// Called when a quiz attempt ends — updates attempts count and wrong answers
// ─────────────────────────────────────────────
router.patch("/quiz-attempt", async (req, res) => {
  const { userId, countryId, wrongAnswers } = req.body;

  try {
    const progress = await UserProgress.findOneAndUpdate(
      { userId, countryId },
      {
        $inc: { quizAttempts: 1 },
        $set: { quizWrongAnswers: wrongAnswers ?? [] },
      },
      { new: true, upsert: true },
    );

    res.status(200).json(progress);
  } catch (error) {
    console.error("quiz-attempt update error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/ai/keywords
// Body: { userId } — backend fetches current country from progress
// OR Body: { countryName } — direct call with country name
// ─────────────────────────────────────────────
router.post("/keywords", async (req, res) => {
  let { countryName, userId } = req.body;

  try {
    // If countryName not provided, derive from user's most recent progress
    if (!countryName && userId) {
      const progress = await UserProgress.find({ userId })
        .populate("countryId", "name")
        .sort({ updatedAt: -1 })
        .limit(1);

      countryName = progress[0]?.countryId?.name ?? "the world";
    }

    if (!countryName) {
      return res
        .status(400)
        .json({ message: "countryName or userId required" });
    }

    const result = await generatePostcardKeywords({ countryName });
    res.status(200).json(result); // returns array of strings
  } catch (error) {
    console.error("AI keywords error:", error.message);
    res.status(500).json({ message: "AI error", error: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/ai/emotion
// Body: { text }
// ─────────────────────────────────────────────
router.post("/emotion", async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ message: "text is required" });
  }

  try {
    const result = await detectPostcardEmotion({ text });
    res.status(200).json(result);
  } catch (error) {
    console.error("AI emotion error:", error.message);
    res.status(500).json({ message: "AI error", error: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/ai/recommend
// Body: { userId }
// Backend fetches all countries this user has explored
// ─────────────────────────────────────────────
router.post("/recommend", async (req, res) => {
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ message: "userId required" });

  try {
    // Fetch all progress entries for this user and get country names
    const progressList = await UserProgress.find({ userId }).populate(
      "countryId",
      "name",
    );

    const exploredCountries = progressList
      .map((p) => p.countryId?.name)
      .filter(Boolean);

    if (exploredCountries.length === 0) {
      // No exploration yet — return a default starter country
      return res.status(200).json({
        country: "China",
        reason:
          "China is an amazing place to start your adventure — dragons, dumplings, and the Great Wall await!",
      });
    }

    const result = await recommendNextCountry({ exploredCountries });
    res.status(200).json(result);
  } catch (error) {
    console.error("AI recommend error:", error.message);
    res.status(500).json({ message: "AI error", error: error.message });
  }
});

module.exports = router;

//chinaid: 69d24da5217d2e2b8e55b042
//myuserid: 69d24c41ea1ae50e5e3279d4
