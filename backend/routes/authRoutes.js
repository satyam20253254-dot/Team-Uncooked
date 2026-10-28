
import { Router } from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserProfile,
  getAllUsers,
  createParticipantUser,
} from "../controllers/authController.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// Register a new user
router.post("/register", registerUser);

// Log in an existing user
router.post("/login", loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

// User profile endpoints (get and update current authenticated user)
router.route("/me")
  .get(verifyJWT, getCurrentUser)
  .patch(verifyJWT, updateUserProfile);

router.route("/profile")
  .get(verifyJWT, getCurrentUser)
  .patch(verifyJWT, updateUserProfile);

// Coordinator/Admin user discovery (for adding interviewers & candidates to drives)
router.route("/users")
  .get(verifyJWT, authorizeRoles("admin", "coordinator"), getAllUsers)
  .post(verifyJWT, authorizeRoles("admin", "coordinator"), createParticipantUser);

export default router;
