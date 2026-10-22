const Evaluation = require("../models/Evaluation");
const Interview = require("../models/Interview");

// Submit or update evaluation for an interview
const submitEvaluation = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { rating, feedback, recommendation } = req.body;

    // Verify interview exists
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found." });
    }

    // Check if evaluation already exists
    let evaluation = await Evaluation.findOne({ interview: interviewId });

    if (evaluation) {
      // Update existing evaluation
      evaluation.rating = rating !== undefined ? rating : evaluation.rating;
      evaluation.feedback = feedback !== undefined ? feedback : evaluation.feedback;
      evaluation.recommendation = recommendation || evaluation.recommendation;
      await evaluation.save();
    } else {
      // Create new evaluation
      evaluation = await Evaluation.create({
        interview: interviewId,
        interviewer: req.user.userId,
        rating,
        feedback,
        recommendation,
      });
    }

    res.status(200).json({
      success: true,
      message: "Evaluation submitted successfully",
      data: evaluation,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get evaluation for a specific interview
const getEvaluationByInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const evaluation = await Evaluation.findOne({ interview: interviewId }).populate("interviewer", "name email");

    if (!evaluation) {
      return res.status(404).json({ success: false, message: "Evaluation not found for this interview." });
    }

    res.status(200).json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { submitEvaluation, getEvaluationByInterview };