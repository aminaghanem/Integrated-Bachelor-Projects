const express = require("express");
const router = express.Router();
const {
  signup,
  getParentById,
  findOrCreateParent,
} = require("../controllers/parentController");

router.post("/signup", signup);
router.post("/find-or-create", findOrCreateParent);
router.get("/:parentId", getParentById);

module.exports = router;
