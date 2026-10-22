const express = require("express");
const router = express.Router();
const { submitEvaluation, getEvaluationByInterview } = require("../controllers/evaluationController");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

router.get("/interviews/:interviewId/evaluation", verifyToken, getEvaluationByInterview);
router.post("/interviews/:interviewId/evaluation", verifyToken, authorizeRoles("admin", "coordinator", "interviewer"), submitEvaluation);

module.exports = router;