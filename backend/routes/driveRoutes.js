const express = require("express");
const router = express.Router();
const { createDrive, getAllDrives, getDriveById } = require("../controllers/driveController");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

// Public or logged-in users can view drives
router.get("/", verifyToken, getAllDrives);
router.get("/:id", verifyToken, getDriveById);

// Only admins and coordinators can create drives
router.post("/", verifyToken, authorizeRoles("admin", "coordinator"), createDrive);

module.exports = router;