const express = require("express");
const router = express.Router();
const { TriageInputSchema } = require("../schemas/triage");
const { classifyMessage } = require("../services/llmService");

/**
 * @swagger
 * /triage:
 *   post:
 *     summary: Classify support/customer message category and urgency
 *     tags: [Triage]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "I was double charged on my invoice."
 *     responses:
 *       200:
 *         description: Triage classification result
 *       400:
 *         description: Invalid request input
 *       422:
 *         description: Unprocessable LLM output (Quarantined)
 *       503:
 *         description: LLM Service disabled or unavailable
 */
router.post("/", async (req, res) => {
  try {
    // Normalize input field: accept either req.body.message or req.body.text
    const messageInput = req.body.message || req.body.text;
    
    // Validate input payload
    const inputValidation = TriageInputSchema.safeParse({ message: messageInput });
    if (!inputValidation.success) {
      return res.status(400).json({
        error: "Invalid input payload",
        details: inputValidation.error.issues || inputValidation.error.message,
      });
    }

    const { message } = inputValidation.data;

    // Call LLM Triage Service
    const result = await classifyMessage(message);

    // Return exactly category, urgency, confidence, reason
    return res.status(200).json({
      category: result.data.category,
      urgency: result.data.urgency,
      confidence: result.data.confidence,
      reason: result.data.reason,
    });
  } catch (error) {
    if (error.status === 503) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: error.message,
      });
    }
    if (error.status === 422) {
      return res.status(422).json({
        error: "Unprocessable Entity",
        message: error.message,
        details: "The LLM response failed output validation and was quarantined.",
      });
    }
    console.error("[TRIAGE ROUTE ERROR]", error);
    return res.status(error.status || 500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

module.exports = router;
