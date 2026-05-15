const express = require("express");
const router = express.Router();
const {
  getUserProgress,
  getProgressByCountry,
  getStampCount,
  initProgress,
  completeCategory,
  awardStamp,
  updateQuizProgress,
} = require("../controllers/userProgressController");

router.get("/user/:userId", getUserProgress);
router.get("/user/:userId/stamps", getStampCount);
router.get("/user/:userId/country/:countryId", getProgressByCountry);
router.post("/", initProgress);
router.patch("/user/:userId/country/:countryId/category", completeCategory);
router.patch("/user/:userId/country/:countryId/stamp", awardStamp);
router.patch("/user/:userId/country/:countryId/quiz", updateQuizProgress);

module.exports = router;
