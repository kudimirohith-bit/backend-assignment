const { z } = require("zod");

const AllowedCategories = ["billing", "bug", "feature", "other"];
const AllowedUrgencies = ["low", "medium", "high", "critical"];

const TriageInputSchema = z.object({
  message: z.string().min(1, "Message is required and cannot be empty"),
});

const TriageOutputSchema = z.object({
  category: z.enum(AllowedCategories),
  urgency: z.enum(AllowedUrgencies),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});

module.exports = {
  AllowedCategories,
  AllowedUrgencies,
  TriageInputSchema,
  TriageOutputSchema,
};
