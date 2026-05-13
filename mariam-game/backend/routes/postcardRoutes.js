const express = require("express");
const router = express.Router();
const {
  getUserPostcards,
  getPostcardById,
  createPostcard,
  updatePostcard,
  deletePostcard,
} = require("../controllers/postcardController");

router.get("/user/:userId", getUserPostcards);
router.get("/:id", getPostcardById);
router.post("/", createPostcard);
router.put("/:id", updatePostcard);
router.delete("/:id", deletePostcard);

module.exports = router;
