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


// create class
router.post("/create", createClass);


// get class by id
router.get("/:id", getClassById);


// add student to class
router.put("/:id/add-student", addStudentToClass);

router.get("/", getAllClasses);

router.put("/:id", updateClass);

router.delete("/:id", deleteClass);

module.exports = router;