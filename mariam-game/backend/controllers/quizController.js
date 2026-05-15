const Quiz = require("../models/Quiz");

// GET quiz by country name
const getQuizByCountry = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      countryName: new RegExp(`^${req.params.countryName}$`, "i"),
    });
    if (!quiz)
      return res
        .status(404)
        .json({ message: "Quiz not found for this country" });
    res.status(200).json(quiz);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST submit quiz answers — returns score + pass/fail
const submitQuiz = async (req, res) => {
  // answers: [{ questionId, selectedAnswer }]
  const { answers } = req.body;
  try {
    const quiz = await Quiz.findOne({
      countryName: new RegExp(`^${req.params.countryName}$`, "i"),
    });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    let correct = 0;
    const results = answers.map((a) => {
      const question = quiz.questions.id(a.questionId);
      if (!question) return { questionId: a.questionId, correct: false };
      const isCorrect = question.correctAnswer === a.selectedAnswer;
      if (isCorrect) correct++;
      return {
        questionId: a.questionId,
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
      };
    });

    const score = Math.round((correct / quiz.questions.length) * 100);
    const passed = correct >= quiz.minToPass;

    res
      .status(200)
      .json({ score, correct, total: quiz.questions.length, passed, results });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST create quiz (admin/seed use)
const createQuiz = async (req, res) => {
  const { countryName, passThreshold, minToPass, questions } = req.body;
  try {
    const existing = await Quiz.findOne({ countryName });
    if (existing)
      return res
        .status(400)
        .json({ message: "Quiz already exists for this country" });
    const quiz = await Quiz.create({
      countryName,
      passThreshold,
      minToPass,
      questions,
    });
    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PUT update quiz
const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndUpdate(
      { countryName: new RegExp(`^${req.params.countryName}$`, "i") },
      req.body,
      { new: true },
    );
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.status(200).json(quiz);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getQuizByCountry, submitQuiz, createQuiz, updateQuiz };
