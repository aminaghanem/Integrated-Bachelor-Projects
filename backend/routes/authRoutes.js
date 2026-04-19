const express = require("express");
const router = express.Router();
const { login,  signupTeacher, signupParent } = require("../controllers/authController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.post("/login", login);
router.post("/signup/teacher", protect, authorizeRoles("admin"), signupTeacher);
router.post("/signup/parent", protect, authorizeRoles("admin"),signupParent);

module.exports = router;