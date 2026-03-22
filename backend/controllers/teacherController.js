const Teacher = require("../models/teacherModel.js");
const bcrypt = require("bcryptjs");

const createTeacher = async (req, res) => {
  try {
    const { password, ...rest } = req.body;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const teacher = await Teacher.create({
      ...rest,
      password_hash
    });

    res.status(201).json(teacher);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTeachers = async (req, res) => {
  const teachers = await Teacher.find().populate("students_ids");
  res.json(teachers);
};

module.exports = { createTeacher, getTeachers };