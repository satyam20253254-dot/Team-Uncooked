const express = require("express");
const router = express.Router();
const { setAvailability, getDriveAvailabilities } = require("../controllers/availabilityController");
const { verifyToken } = require("../middleware/auth");

// View availabilities for a drive
router.get("/:driveId/availabilities", verifyToken, getDriveAvailabilities);

// Set availability time window
router.post("/:driveId/availabilities", verifyToken, setAvailability);

module.exports = router;