require('dotenv').config()

console.log('Starting server...')

const express = require('express')
const mongoose = require('mongoose')

console.log('Loaded dependencies...')

//express app
const app = express()

//middleware
app.use(express.json())
app.use((req, res, next) => {
    console.log(req.path, req.method)
    next()
})

const cors = require('cors');
app.use(cors());

console.log('Set up middleware...')

//routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/students", require("./routes/studentRoutes"));
app.use("/api/parents", require("./routes/parentRoutes"));
app.use("/api/teachers", require("./routes/teacherRoutes"));
app.use("/api/activity", require("./routes/browserActivityRoutes"));
app.use("/api/feedback", require("./routes/feedbackRoutes"));
app.use("/api/classes", require("./routes/classRoutes"));
app.use("/api/proxy", require("./routes/proxy"));

console.log('Set up routes...')

//connect to db
console.log('Connecting to MongoDB...')
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
})
    .then(() => {
        console.log('Connected to MongoDB')
        //listen for requests
        app.listen(process.env.PORT, () => {
        console.log('connected to  db & listening on port', process.env.PORT)
        })
    })
    .catch((error) => {
        console.log('MongoDB connection error:', error)
    })
