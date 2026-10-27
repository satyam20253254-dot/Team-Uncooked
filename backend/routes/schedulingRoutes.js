
import { Router } from "express";

import {
  generateSchedule,
  publishSchedule,
  discardDraftSchedule,
  getScheduleVersions,
  getInterviewsByVersion,
  getAvailableSlotsForRound,
  selfBookSlot,
} from "../controllers/schedulingController.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// Schedule generation & publishing
router.post(
  "/:driveId/schedules/generate",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  generateSchedule
);

router.patch(
  "/:driveId/schedules/:versionId/publish",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  publishSchedule
);

router.delete(
  "/:driveId/schedules/:versionId",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  discardDraftSchedule
);

router.get(
  "/:driveId/schedules",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  getScheduleVersions
);

router.get(
  "/:driveId/schedules/:versionId/interviews",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  getInterviewsByVersion
);

// Candidate Self-Booking (PS Foundational Scope)
router.get(
  "/:driveId/rounds/:roundId/available-slots",
  verifyJWT,
  getAvailableSlotsForRound
);

router.post(
  "/:driveId/rounds/:roundId/self-book",
  verifyJWT,
  authorizeRoles("candidate"),
  selfBookSlot
);

export default router;
