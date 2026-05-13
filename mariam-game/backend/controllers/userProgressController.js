const UserProgress = require("../models/UserProgress");
const Country = require("../models/Country");

// GET all progress for a user
const getUserProgress = async (req, res) => {
  try {
    const progress = await UserProgress.find({
      userId: req.params.userId,
    }).populate("countryId", "name continent");
    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET progress for a specific user + country
const getProgressByCountry = async (req, res) => {
  try {
    const { userId, countryId } = req.params;
    const progress = await UserProgress.findOne({ userId, countryId }).populate(
      "countryId",
      "name continent",
    );
    if (!progress)
      return res.status(404).json({ message: "No progress found" });
    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET stamp count for a user (how many countries completed)
const getStampCount = async (req, res) => {
  try {
    const count = await UserProgress.countDocuments({
      userId: req.params.userId,
      hasStamp: true,
    });
    res.status(200).json({ stampCount: count });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST initialise progress when user enters a country for the first time
const initProgress = async (req, res) => {
  const { userId, countryId } = req.body;
  try {
    const existing = await UserProgress.findOne({ userId, countryId });
    if (existing) return res.status(200).json(existing); // already exists, return it
    const progress = await UserProgress.create({ userId, countryId });
    res.status(201).json(progress);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PATCH mark a category as completed
const completeCategory = async (req, res) => {
  const { userId, countryId } = req.params;
  const { category } = req.body; // 'food', 'landmark', or 'festival'
  try {
    const progress = await UserProgress.findOne({ userId, countryId });
    if (!progress)
      return res.status(404).json({ message: "Progress not found" });

    if (!progress.completedCategories.includes(category)) {
      progress.completedCategories.push(category);
      await progress.save();
    }
    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PATCH award stamp after passing quiz
const awardStamp = async (req, res) => {
  const { userId, countryId } = req.params;
  const { quizScore } = req.body;
  try {
    const progress = await UserProgress.findOneAndUpdate(
      { userId, countryId },
      {
        hasStamp: true,
        quizScore,
        quizPassed: true,
        completedAt: new Date(),
      },
      { new: true },
    );
    if (!progress)
      return res.status(404).json({ message: "Progress not found" });
    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PATCH update quiz result for a user and country
const updateQuizProgress = async (req, res) => {
  const { userId, countryId } = req.params;
  const { quizScore, quizPassed } = req.body;
  try {
    const update = {
      quizScore,
      quizPassed,
      completedAt: new Date(),
    };
    if (quizPassed) update.hasStamp = true;

    const progress = await UserProgress.findOneAndUpdate(
      { userId, countryId },
      {
        $set: update,
        $setOnInsert: {
          userId,
          countryId,
          completedCategories: [],
        },
      },
      { new: true, upsert: true },
    );

    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getUserProgress,
  getProgressByCountry,
  getStampCount,
  initProgress,
  completeCategory,
  awardStamp,
  updateQuizProgress,
};
