const express = require("express");
const router = express.Router();
const {
  getQuizByCountry,
  submitQuiz,
  createQuiz,
  updateQuiz,
} = require("../controllers/quizController");

router.get("/:countryName", getQuizByCountry);
router.post("/:countryName/submit", submitQuiz);
router.post("/", createQuiz);
router.put("/:countryName", updateQuiz);

module.exports = router;
