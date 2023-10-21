// Import required modules
const express = require('express');
const mysql = require('mysql2');
const cors=require("cors")
const userRouter = require('./Router/userRouter');
const authMiddleware = require('./Midddleware/AuthenticationMiddelware');
const projectRouter = require('./Router/projectRouter');
const taskRouter = require('./Router/taskRouter');
const teamRouter = require('./Router/teamRouter');
const dashboardRouter = require('./Router/dashBoardRouter');

const app = express();
require("./db")

app.use(cors())
app.use(express.json())
app.use("/users",userRouter)

app.use(authMiddleware)

app.use("/projects",projectRouter)
app.use("/tasks",taskRouter)
app.use("/teams",teamRouter)
app.use("/dashboard",dashboardRouter)
// Define your API routes here

// Start the Express.js server

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
