
import { Router } from "express";

import {
  addParticipant,
  getDriveParticipants,
  updateParticipantStatus,
  removeParticipant,
} from "../controllers/participantController.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// View participants in a drive (logged-in users)
router.get(
  "/:driveId/participants",
  verifyJWT,
  getDriveParticipants
);

// Admin/Coordinator participant management
router.post(
  "/:driveId/participants",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  addParticipant
);

router.patch(
  "/:driveId/participants/:participantId",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  updateParticipantStatus
);

router.delete(
  "/:driveId/participants/:participantId",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  removeParticipant
);

export default router;
