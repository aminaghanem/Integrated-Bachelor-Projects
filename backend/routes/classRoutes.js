const express = require("express");

const router = express.Router();

const {
  createClass,
  getClassById,
  getAllClasses,
  updateClass,
  deleteClass,
  addStudentToClass
} = require("../controllers/classController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");


// create class
router.post("/create", protect, authorizeRoles("admin"), createClass);


// get class by id
router.get("/:id", protect, authorizeRoles("admin"), getClassById);


// add student to class
router.put("/:id/add-student", protect, authorizeRoles("admin"), addStudentToClass);

router.get("/", protect, authorizeRoles("admin"), getAllClasses);

router.put("/:id", protect, authorizeRoles("admin"), updateClass);

router.delete("/:id", protect, authorizeRoles("admin"), deleteClass);

module.exports = router;