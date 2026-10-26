
import { Router } from "express";

import {
  createDrive,
  getAllDrives,
  getDriveById,
  updateDrive,
  updateDriveStatus,
  deleteDrive,
} from "../controllers/driveController.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// View all drives (authenticated users)
router.get("/", verifyJWT, getAllDrives);

// View a specific drive (authenticated users)
router.get("/:id", verifyJWT, getDriveById);

// Admin/Coordinator drive management
router.post(
  "/",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  createDrive
);

router.put(
  "/:id",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  updateDrive
);

router.patch(
  "/:id/status",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  updateDriveStatus
);

router.delete(
  "/:id",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  deleteDrive
);

export default router;
