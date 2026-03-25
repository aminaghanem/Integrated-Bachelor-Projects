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
  const teachers = await Teacher.find();
  res.json(teachers);
};

const addTeachableSubject = async (req, res) => {
  try {
    const { subject_id } = req.body

    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { teachable_subjects: subject_id }
      },
      { new: true }
    )

    res.json(teacher)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { createTeacher, getTeachers, addTeachableSubject };