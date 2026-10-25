
import { Router } from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getAllUsers,
} from "../controllers/authController.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// Register a new user
router.post("/register", registerUser);

// Log in an existing user
router.post("/login", loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/me").get(verifyJWT, getCurrentUser);

// Coordinator/Admin user discovery (for adding interviewers & candidates to drives)
router.route("/users").get(verifyJWT, authorizeRoles("admin", "coordinator"), getAllUsers);

export default router;
