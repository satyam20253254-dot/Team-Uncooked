const express = require("express");
const router = express.Router();
const { 
  createRound, 
  getRoundsByDrive, 
  createRoom, 
  getRoomsByDrive 
} = require("../controllers/configController");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

// Rounds Routes
router.get("/:driveId/rounds", verifyToken, getRoundsByDrive);
router.post("/:driveId/rounds", verifyToken, authorizeRoles("admin", "coordinator"), createRound);

// Rooms Routes
router.get("/:driveId/rooms", verifyToken, getRoomsByDrive);
router.post("/:driveId/rooms", verifyToken, authorizeRoles("admin", "coordinator"), createRoom);

module.exports = router;