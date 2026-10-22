const express = require("express");
const router = express.Router();
const { 
  generateSchedule, 
  publishSchedule, 
  getScheduleVersions, 
  getInterviewsByVersion 
} = require("../controllers/schedulingController");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

router.get("/:driveId/schedules", verifyToken, getScheduleVersions);
router.get("/schedules/:versionId/interviews", verifyToken, getInterviewsByVersion);

router.post("/:driveId/schedules/generate", verifyToken, authorizeRoles("admin", "coordinator"), generateSchedule);
router.put("/:driveId/schedules/:versionId/publish", verifyToken, authorizeRoles("admin", "coordinator"), publishSchedule);

module.exports = router;