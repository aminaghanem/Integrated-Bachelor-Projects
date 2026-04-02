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

    const teacherEmailRegex = /^[^\s@]+@teacher\.school\.edu\.eg$/;

    if (!teacherEmailRegex.test(req.body.email)) {
      return res.status(400).json({
        message: "Invalid teacher email domain"
      });
    }

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
      { returnDocument: 'after' }
    )

    res.json(teacher)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getTeacherProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id)
      .populate("teachable_subjects")
      .populate({
        path: "teaching_assignments.class_id",
        model: "SchoolClass",
        populate: {
          path: "students subjects.subject",
        }
      })
      .populate("teaching_assignments.subject")

    if (!teacher) return res.status(404).json({ error: "Teacher not found" })
    res.json(teacher)
  } catch (err) {
    res.status(500).json({ error: "Server error" })
  }
}

const updateTeacher = async (req, res) => {
  const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after'})
  res.json(teacher)
}

module.exports = { createTeacher, getTeachers, addTeachableSubject, getTeacherProfile, updateTeacher };