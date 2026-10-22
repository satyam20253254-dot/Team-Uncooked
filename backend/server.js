
require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const driveRoutes = require("./routes/driveRoutes");
const participantRoutes = require("./routes/participantRoutes");
const configRoutes = require("./routes/configRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const schedulingRoutes = require("./routes/schedulingRoutes");
const evaluationRoutes = require("./routes/evaluationRoutes");

// Register all 9 Mongoose models
require("./models/User");
require("./models/Drive");
require("./models/DriveParticipant");
require("./models/Round");
require("./models/Room");
require("./models/Availability");
require("./models/ScheduleVersion");
require("./models/Interview");
require("./models/Evaluation");

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/drives", driveRoutes);
app.use("/api/drives", participantRoutes);
app.use("/api/drives", configRoutes);
app.use("/api/drives", availabilityRoutes);
app.use("/api/drives", schedulingRoutes);
app.use("/api", evaluationRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Interview Scheduler API is running",
  });
});

async function startServer() {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
