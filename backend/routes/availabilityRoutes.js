
import { Router } from "express";

import {
  setAvailability,
  getDriveAvailabilities,
  deleteAvailability,
} from "../controllers/availabilityController.js";

import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// View availabilities for a drive
router.get(
  "/:driveId/availabilities",
  verifyJWT,
  getDriveAvailabilities
);

// Set an availability time window
router.post(
  "/:driveId/availabilities",
  verifyJWT,
  setAvailability
);

// Delete an availability time window
router.delete(
  "/:driveId/availabilities/:availabilityId",
  verifyJWT,
  deleteAvailability
);

export default router;
