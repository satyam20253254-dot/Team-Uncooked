
import { Router } from "express";

import {
  getCandidateRankingMatrix,
} from "../controllers/evaluationController.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// Candidate ranking matrix for a drive (PS Victory tier)
router.get(
  "/:driveId/ranking-matrix",
  verifyJWT,
  authorizeRoles("admin", "coordinator"),
  getCandidateRankingMatrix
);

export default router;
