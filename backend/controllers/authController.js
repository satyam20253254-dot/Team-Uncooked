
import jwt from "jsonwebtoken";

import { User } from "../models/User.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

    const normalizedEmail = email.trim().toLowerCase();

    // Allow optional role (defaults to candidate)
    const validRoles = ["candidate", "interviewer", "coordinator", "admin"];
    const assignedRole = validRoles.includes(req.body.role) ? req.body.role : "candidate";

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
    const user = await User.findOne({
        email: email.trim().toLowerCase()
    }).select("+password");

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
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.user,
                "Current user fetched successfully"
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