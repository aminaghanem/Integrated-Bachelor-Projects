const express = require("express");
const router = express.Router();
const { login,  signupTeacher, signupParent } = require("../controllers/authController");

router.post("/login", login);
router.post("/signup/teacher", signupTeacher);
router.post("/signup/parent", signupParent);

module.exports = router;