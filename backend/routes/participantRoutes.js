const express = require("express");
const router = express.Router();
const { addParticipant, getDriveParticipants } = require("../controllers/participantController");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

// View participants in a drive (logged-in users)
router.get("/:driveId/participants", verifyToken, getDriveParticipants);

// Only admin/coordinator can add participants to a drive
router.post("/:driveId/participants", verifyToken, authorizeRoles("admin", "coordinator"), addParticipant);

module.exports = router;