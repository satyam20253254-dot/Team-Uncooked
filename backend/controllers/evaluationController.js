
import mongoose from "mongoose";
import { Evaluation } from "../models/Evaluation.model.js";
import { Interview } from "../models/Interview.model.js";
import { Round } from "../models/Round.model.js";
import { DriveParticipant } from "../models/DriveParticipant.model.js";
import { Drive } from "../models/Drive.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { notifyDriveEvent } from "../utils/notifications.js";

// Submit or update evaluation for an interview
export const submitEvaluation = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const { rating, feedback, recommendation } = req.body;

  // Validate interview ID
  if (!mongoose.isValidObjectId(interviewId)) {
    throw new ApiError(400, "Invalid interview ID");
  }

  // Verify interview exists
  const interview = await Interview.findById(interviewId);

  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }

  // Ensure the user is authenticated
  if (!req.user?._id) {
    throw new ApiError(401, "Authentication required");
  }

  // Only the assigned interviewer or coordinator/admin can submit evaluation
  const isAssignedInterviewer =
    interview.interviewer.toString() === req.user._id.toString();
  const isStaff = ["admin", "coordinator"].includes(req.user.role);

  if (!isAssignedInterviewer && !isStaff) {
    throw new ApiError(
      403,
      "You are not authorized to evaluate this interview"
    );
  }

  // Validate rating (1 to 10 integer as per Evaluation model)
  if (rating !== undefined) {
    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 10) {
      throw new ApiError(400, "Rating must be a whole number between 1 and 10");
    }
  }

  // Validate feedback when provided
  if (feedback !== undefined && typeof feedback !== "string") {
    throw new ApiError(400, "Feedback must be a string");
  }

  // Validate recommendation aligned with model enum: hire, reject, hold, next_round
  const allowedRecommendations = ["hire", "reject", "hold", "next_round"];

  if (
    recommendation !== undefined &&
    !allowedRecommendations.includes(recommendation)
  ) {
    throw new ApiError(
      400,
      `Recommendation must be one of: ${allowedRecommendations.join(", ")}`
    );
  }

  // Check if evaluation already exists for this interview
  const roundWasAlreadyCompleted = interview.status === "completed";
  let evaluation = await Evaluation.findOne({ interview: interviewId });

  if (evaluation) {
    // Update fields
    if (rating !== undefined) evaluation.rating = Number(rating);
    if (feedback !== undefined) evaluation.feedback = feedback.trim();
    if (recommendation !== undefined) evaluation.recommendation = recommendation;

    await evaluation.save();

    if (interview.status !== "completed") {
      interview.status = "completed";
      await interview.save();
    }
  } else {
    // Both rating and recommendation are required for new evaluation
    if (rating === undefined || recommendation === undefined) {
      throw new ApiError(
        400,
        "Rating (1-10) and recommendation are required to create an evaluation"
      );
    }

    evaluation = await Evaluation.create({
      interview: interviewId,
      interviewer: isAssignedInterviewer ? req.user._id : interview.interviewer,
      rating: Number(rating),
      feedback: feedback?.trim() || "",
      recommendation,
    });

    // Mark interview status as completed if evaluation submitted
    interview.status = "completed";
    await interview.save();
  }

  // Multi-Stage Pipeline Orchestrator (PS Victory Tier): Automated pass/fail routing
  const currentRound = await Round.findById(interview.round);
  const candidateParticipant = await DriveParticipant.findOne({
    driveId: interview.drive,
    userId: interview.candidate,
  });

  let pipelineAction = "none";

  if (candidateParticipant && currentRound) {
    const finalRecommendation = recommendation || evaluation.recommendation;

    if (finalRecommendation === "next_round" || finalRecommendation === "hire") {
      // Find next round in sequence for this drive
      const nextRound = await Round.findOne({
        driveId: interview.drive,
        sequence: { $gt: currentRound.sequence },
      }).sort({ sequence: 1 });

      if (nextRound) {
        // Automatically unlock next round for candidate
        const alreadyEligible = candidateParticipant.eligibleRoundIds?.some(
          (id) => id.toString() === nextRound._id.toString()
        );

        if (!alreadyEligible) {
          candidateParticipant.eligibleRoundIds = candidateParticipant.eligibleRoundIds || [];
          candidateParticipant.eligibleRoundIds.push(nextRound._id);
          candidateParticipant.metadata = {
            ...(candidateParticipant.metadata || {}),
            currentRound: nextRound.name,
            lastPassedRound: currentRound.name,
          };
          candidateParticipant.markModified("metadata");
          await candidateParticipant.save();
          pipelineAction = `Advanced to next round: ${nextRound.name}`;
        }
      } else {
        // Candidate passed all rounds of the drive
        candidateParticipant.metadata = {
          ...(candidateParticipant.metadata || {}),
          pipelineResult: "selected",
          completedAllRounds: true,
        };
        candidateParticipant.markModified("metadata");
        await candidateParticipant.save();
        pipelineAction = "Candidate successfully cleared all rounds!";
      }
    } else if (finalRecommendation === "reject") {
      // Candidate failed the round -> disqualify from subsequent rounds
      candidateParticipant.status = "disqualified";
      candidateParticipant.metadata = {
        ...(candidateParticipant.metadata || {}),
        pipelineResult: "rejected",
        eliminatedAtRound: currentRound.name,
      };
      candidateParticipant.markModified("metadata");
      await candidateParticipant.save();
      pipelineAction = `Disqualified at ${currentRound.name}`;
    }
  }

  if (!roundWasAlreadyCompleted && currentRound) {
    await notifyDriveEvent({
      driveId: interview.drive,
      type: "round_completed",
      title: "Interview round completed",
      message: `The ${currentRound.name} round has been completed. Check your dashboard for the latest status.`,
      entityType: "interview",
      entityId: interview._id,
      userIds: [interview.candidate, interview.interviewer],
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        evaluation,
        pipelineAction,
      },
      "Evaluation submitted and pipeline progression routed successfully"
    )
  );
});

// Get evaluation for a specific interview
export const getEvaluationByInterview = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;

  if (!mongoose.isValidObjectId(interviewId)) {
    throw new ApiError(400, "Invalid interview ID");
  }

  const interview = await Interview.findById(interviewId);
  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }

  // Access control: admin, coordinator, or the assigned interviewer
  const isStaff = ["admin", "coordinator"].includes(req.user.role);
  const isInterviewer =
    interview.interviewer.toString() === req.user._id.toString();

  if (!isStaff && !isInterviewer) {
    throw new ApiError(403, "Access denied to this evaluation");
  }

  const evaluation = await Evaluation.findOne({
    interview: interviewId,
  }).populate("interviewer", "name email");

  if (!evaluation) {
    throw new ApiError(
      404,
      "Evaluation not found for this interview"
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      evaluation,
      "Evaluation fetched successfully"
    )
  );
});

// Live Evaluation Rubric: Candidate Ranking Matrix (PS Victory Tier)
export const getCandidateRankingMatrix = asyncHandler(async (req, res) => {
  const { driveId } = req.params;

  if (!mongoose.isValidObjectId(driveId)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  const driveExists = await Drive.exists({ _id: driveId });
  if (!driveExists) {
    throw new ApiError(404, "Drive not found");
  }

  // Aggregate evaluations grouped by candidate for this drive
  const rankings = await Interview.aggregate([
    { $match: { drive: new mongoose.Types.ObjectId(driveId) } },
    {
      $lookup: {
        from: "evaluations",
        localField: "_id",
        foreignField: "interview",
        as: "evaluation",
      },
    },
    { $unwind: "$evaluation" },
    {
      $group: {
        _id: "$candidate",
        totalInterviews: { $sum: 1 },
        averageRating: { $avg: "$evaluation.rating" },
        recommendations: { $push: "$evaluation.recommendation" },
        evaluations: {
          $push: {
            round: "$round",
            rating: "$evaluation.rating",
            recommendation: "$evaluation.recommendation",
            feedback: "$evaluation.feedback",
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "candidateDetails",
      },
    },
    { $unwind: "$candidateDetails" },
    {
      $project: {
        candidateId: "$_id",
        name: "$candidateDetails.name",
        email: "$candidateDetails.email",
        totalInterviews: 1,
        averageRating: { $round: ["$averageRating", 2] },
        recommendations: 1,
        evaluations: 1,
      },
    },
    { $sort: { averageRating: -1 } },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: rankings.length,
        rankings,
      },
      "Candidate ranking matrix fetched successfully"
    )
  );
});
