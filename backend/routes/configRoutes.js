
import { Router } from "express";

import {
  createRound,
  getRoundsByDrive,
  updateRound,
  deleteRound,
  createRoom,
  getRoomsByDrive,
  updateRoom,
  deleteRoom,
} from "../controllers/configController.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// Rounds Routes
router.get(
  "/:driveId/rounds",
  verifyJWT,
  getRoundsByDrive
);

router.post(
  "/:driveId/rounds",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  createRound
);

router.put(
  "/:driveId/rounds/:roundId",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  updateRound
);

router.delete(
  "/:driveId/rounds/:roundId",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  deleteRound
);

// Rooms Routes
router.get(
  "/:driveId/rooms",
  verifyJWT,
  getRoomsByDrive
);

router.post(
  "/:driveId/rooms",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  createRoom
);

router.put(
  "/:driveId/rooms/:roomId",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  updateRoom
);

router.delete(
  "/:driveId/rooms/:roomId",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  deleteRoom
);

export default router;
