import { Router } from "express";

import {
  getMyInterviews,
  rescheduleInterview,
  downloadInterviewIcs,
} from "../controllers/schedulingController.js";

import {
  submitEvaluation,
  getEvaluationByInterview,
} from "../controllers/evaluationController.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// Get logged-in candidate or interviewer's scheduled interviews
router.get("/my-interviews", verifyJWT, getMyInterviews);

// Calendar Integration (PS Foundational Scope): One-click RFC-5545 .ics download
router.get("/:interviewId/calendar.ics", verifyJWT, downloadInterviewIcs);

// Automated Reschedule Engine (PS Victory Tier)
router.post(
  "/:interviewId/reschedule",
  verifyJWT,
  authorizeRoles("admin", "coordinator", "interviewer"),
  rescheduleInterview
);

// Get evaluation for a specific interview
router.get("/:interviewId/evaluation", verifyJWT, getEvaluationByInterview);

// Submit evaluation (Interviewer, Coordinator, Admin)
router.post(
  "/:interviewId/evaluation",
  verifyJWT,
  authorizeRoles("admin", "coordinator", "interviewer"),
  submitEvaluation
);

export default router;
