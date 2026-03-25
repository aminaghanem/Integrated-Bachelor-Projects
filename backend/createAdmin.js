require("dotenv").config()

const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const Admin = require("./models/adminModel")

const createAdmin = async () => {
  try {
    console.log("MONGO_URI:", process.env.MONGO_URI) // debug

    await mongoose.connect(process.env.MONGO_URI)

    const existing = await Admin.findOne({ username: "admin" })

    if (existing) {
      console.log("Admin already exists")
      process.exit()
    }

    const hash = await bcrypt.hash("admin123", 10)

    await Admin.create({
      username: "admin",
      password_hash: hash
    })

    console.log("Admin created successfully")
    process.exit()

  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

createAdmin()