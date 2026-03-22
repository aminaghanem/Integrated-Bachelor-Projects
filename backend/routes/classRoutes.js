const express = require("express");

const router = express.Router();

const {
  createClass,
  getClassById,
  addStudentToClass
} = require("../controllers/classController");


// create class
router.post("/create", createClass);


// get class by id
router.get("/:id", getClassById);


// add student to class
router.put("/:id/add-student", addStudentToClass);


module.exports = router;