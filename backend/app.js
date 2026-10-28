import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import authRoutes from "./routes/authRoutes.js";
import driveRoutes from "./routes/driveRoutes.js";
import participantRoutes from "./routes/participantRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";
import schedulingRoutes from "./routes/schedulingRoutes.js";
import evaluationRoutes from "./routes/evaluationRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { getMyInterviews, getInterviewsByVersion } from "./controllers/schedulingController.js";
import { verifyJWT } from "./middleware/auth.middleware.js";

const app = express();
app.use(helmet());


const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Root & Health check endpoints
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Interview Scheduler API Server is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", uptime: process.uptime() });
});



app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/drives", driveRoutes);
app.use("/api/v1/drives", participantRoutes);
app.use("/api/v1/drives", configRoutes);
app.use("/api/v1/drives", availabilityRoutes);
app.use("/api/v1/drives", schedulingRoutes);
app.use("/api/v1/drives", evaluationRoutes);
app.use("/api/v1/interviews", interviewRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// Top-level convenience aliases
app.get("/api/v1/my-interviews", verifyJWT, getMyInterviews);
app.get("/api/v1/schedules/:versionId/interviews", verifyJWT, getInterviewsByVersion);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    statusCode,
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
    data: null,
  });
});

export { app };









