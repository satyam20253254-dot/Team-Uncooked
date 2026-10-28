
import jwt from "jsonwebtoken";

import { User } from "../models/User.model.js";
import { Drive } from "../models/Drive.model.js";
import { DriveParticipant } from "../models/DriveParticipant.model.js";
import { Round } from "../models/Round.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const COORDINATOR_EMAIL = process.env.COORDINATOR_EMAIL?.trim().toLowerCase();
const COORDINATOR_PASSWORD = process.env.COORDINATOR_PASSWORD;

// Generate JWT
const generateToken = (userId) => {
    if (!process.env.ACCESS_TOKEN_SECRET) {
        throw new Error("ACCESS_TOKEN_SECRET is not configured");
    }

    return jwt.sign(
        { _id: userId },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d"
        }
    );
};

// Register User
export const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // Validate input
    if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof email !== "string" ||
        !email.trim() ||
        typeof password !== "string" ||
        !password
    ) {
        throw new ApiError(
            400,
            "Name, email and password are required"
        );
    }

    const assignedRole = req.body.role;
    if (!["candidate", "interviewer"].includes(assignedRole)) {
        throw new ApiError(400, "Choose candidate or interviewer for registration");
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (COORDINATOR_EMAIL && normalizedEmail === COORDINATOR_EMAIL) {
        throw new ApiError(409, "The coordinator account is reserved");
    }

    // Check whether the email is already registered
    const existingUser = await User.findOne({
        email: normalizedEmail
    });

    if (existingUser) {
        throw new ApiError(409, "Email is already registered");
    }

    // Password is hashed by the model's pre-save middleware
    const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: assignedRole,
    });

    // Automatically enroll user into active drive so they can immediately book slots & set availability
    try {
        const activeDrive = await Drive.findOne({ status: { $ne: "cancelled" } }).sort({ createdAt: -1 });
        if (activeDrive) {
            const rounds = await Round.find({ driveId: activeDrive._id }).sort({ sequence: 1 });
            await DriveParticipant.create({
                driveId: activeDrive._id,
                userId: user._id,
                role: assignedRole,
                status: "active",
                eligibleRoundIds: assignedRole === "candidate" ? (rounds.length > 0 ? [rounds[0]._id] : []) : [],
                metadata: {
                    department: assignedRole === "interviewer" ? "Engineering & Tech" : "Computer Science",
                    skills: assignedRole === "interviewer" ? ["DSA", "React", "Node.js", "System Design"] : ["DSA", "React"],
                    maxDailyInterviews: 4,
                    registeredAt: new Date().toISOString(),
                },
            });
        }
    } catch (participantErr) {
        console.warn("Auto-enrollment warning:", participantErr.message);
    }

    // Never return the password
    const createdUser = user.toObject();
    delete createdUser.password;

    return res.status(201).json(
        new ApiResponse(
            201,
            createdUser,
            "User registered successfully"
        )
    );
});

// Login User
export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof password !== "string" ||
        !password
    ) {
        throw new ApiError(
            400,
            "Email and password are required"
        );
    }

    // Password has select: false in the schema
    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (COORDINATOR_EMAIL && normalizedEmail === COORDINATOR_EMAIL) {
        if (!user) {
            if (!COORDINATOR_PASSWORD) {
                throw new ApiError(503, "Coordinator account setup is not configured on this server");
            }
            if (password !== COORDINATOR_PASSWORD) throw new ApiError(401, "Invalid email or password");
            user = await User.create({ name: "Trials Coordinator", email: COORDINATOR_EMAIL, password: COORDINATOR_PASSWORD, role: "coordinator" });
            user = await User.findById(user._id).select("+password");
        } else if (user.role !== "coordinator") {
            throw new ApiError(403, "The reserved coordinator account is unavailable");
        }
    } else if (user?.role === "coordinator") {
        throw new ApiError(401, "Use the reserved coordinator account to sign in");
    }

    if (!user) {
        throw new ApiError(401, "Invalid email or password");
    }

    // Compare password using the model instance method
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid email or password");
    }

    // Reject inactive accounts
    if (!user.isActive) {
        throw new ApiError(403, "This account is inactive");
    }

    const token = generateToken(user._id.toString());

    // Exclude password from response
    const loggedInUser = user.toObject();
    delete loggedInUser.password;

    try {
        const participations = await DriveParticipant.find({ userId: user._id, status: "active" })
            .populate("driveId", "name status")
            .lean();
        loggedInUser.participations = participations;
        if (participations.length > 0) {
            loggedInUser.metadata = participations[0].metadata || {};
        }
    } catch (partErr) {
        console.warn("Could not load user drive metadata:", partErr.message);
    }

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    };

    return res
        .status(200)
        .cookie("accessToken", token, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    token
                },
                "Login successful"
            )
        );
});

// Logout User
export const logoutUser = asyncHandler(async (req, res) => {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged out successfully"
            )
        );
});

export const getCurrentUser = asyncHandler(async (req, res) => {
    const userObj = req.user.toObject ? req.user.toObject() : { ...req.user };
    delete userObj.password;

    try {
        const participations = await DriveParticipant.find({ userId: req.user._id, status: "active" })
            .populate("driveId", "name status")
            .lean();
        userObj.participations = participations;
        if (participations.length > 0) {
            userObj.metadata = participations[0].metadata || {};
        }
    } catch (partErr) {
        console.warn("Could not load user drive metadata:", partErr.message);
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userObj,
                "Current user fetched successfully"
            )
        );
});

// Update Current User Profile (Name, Email, Metadata, Password)
export const updateUserProfile = asyncHandler(async (req, res) => {
    const { name, email, department, skills, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (name && typeof name === "string" && name.trim()) {
        user.name = name.trim();
    }

    if (email && typeof email === "string" && email.trim()) {
        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail !== user.email) {
            const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
            if (existing) {
                throw new ApiError(409, "Email is already in use by another account");
            }
            user.email = normalizedEmail;
        }
    }

    // Change password if requested
    if (newPassword) {
        if (!currentPassword) {
            throw new ApiError(400, "Current password is required to change password");
        }
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            throw new ApiError(400, "Current password does not match");
        }
        if (typeof newPassword !== "string" || newPassword.length < 6) {
            throw new ApiError(400, "New password must be at least 6 characters long");
        }
        user.password = newPassword;
    }

    await user.save();

    // Update DriveParticipant metadata if provided
    if (department !== undefined || skills !== undefined) {
        const updateFields = {};
        if (department !== undefined) updateFields["metadata.department"] = String(department).trim();
        if (skills !== undefined) {
            const skillsArray = Array.isArray(skills)
                ? skills.map(s => String(s).trim()).filter(Boolean)
                : String(skills).split(",").map(s => s.trim()).filter(Boolean);
            updateFields["metadata.skills"] = skillsArray;
        }
        await DriveParticipant.updateMany(
            { userId: user._id },
            { $set: updateFields }
        );
    }

    const updatedUser = user.toObject();
    delete updatedUser.password;

    try {
        const participations = await DriveParticipant.find({ userId: user._id, status: "active" })
            .populate("driveId", "name status")
            .lean();
        updatedUser.participations = participations;
        if (participations.length > 0) {
            updatedUser.metadata = participations[0].metadata || {};
        }
    } catch (partErr) {
        console.warn("Could not load updated user metadata:", partErr.message);
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedUser,
            "Profile updated successfully"
        )
    );
});

// Fetch all registered users with optional role and search filters
export const getAllUsers = asyncHandler(async (req, res) => {
    const { role, search } = req.query;
    const filter = { isActive: true };

    if (role) {
        const validRoles = ["candidate", "interviewer", "coordinator", "admin"];
        if (!validRoles.includes(role)) {
            throw new ApiError(400, `Invalid role. Allowed: ${validRoles.join(", ")}`);
        }
        filter.role = role;
    }

    if (search && typeof search === "string" && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [{ name: regex }, { email: regex }];
    }

    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    count: users.length,
                    users,
                },
                "Users fetched successfully"
            )
        );
});

// Coordinators can provision drive participants with their correct role.
export const createParticipantUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name?.trim() || !email?.trim() || !password || !["candidate", "interviewer"].includes(role)) {
        throw new ApiError(400, "Name, email, password and a valid participant role are required");
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) throw new ApiError(409, "Email is already registered");
    const user = await User.create({ name: name.trim(), email: normalizedEmail, password, role });
    const createdUser = user.toObject();
    delete createdUser.password;
    return res.status(201).json(new ApiResponse(201, createdUser, "Participant account created"));
});
