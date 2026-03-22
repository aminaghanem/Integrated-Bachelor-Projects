const mongoose = require("mongoose");

const schoolClassSchema = new mongoose.Schema(
{
  class_name: {
    type: String,
    required: true,
    trim: true
  },

  school_name: {
    type: String,
    required: true,
    trim: true
  },

  grade_level: {
    type: Number,
    required: true
  },

  subjects: [
    {
      subject_name: {
        type: String,
        required: true
      },

      teacher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
        required: true
      }
    }
  ],

  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student"
    }
  ]

},
{ timestamps: true }
);

// enforce unique class identifier
schoolClassSchema.index(
  { school_name: 1, grade_level: 1, class_name: 1 },
  { unique: true }
);

module.exports = mongoose.model("SchoolClass", schoolClassSchema);
