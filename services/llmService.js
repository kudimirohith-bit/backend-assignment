const fs = require("fs");
const path = require("path");
const config = require("../config/llm");
const { TriageOutputSchema } = require("../schemas/triage");

const PROMPT_FILE_PATH = path.join(__dirname, "../prompts/triage-v1.md");
const QUARANTINE_FILE_PATH = path.join(__dirname, "../logs/quarantine.json");

// Ensure logs directory exists
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Utility: Sleep with backoff and jitter
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function calculateBackoff(attempt, baseDelay = 300, jitterMax = 200) {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * jitterMax);
  return exponential + jitter;
}

// Utility: Simple token counter estimation
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.trim().split(/\s+/).length * 1.3);
}

// Extract JSON from LLM output (stripping Markdown fences if present)
function extractJsonString(rawText) {
  if (!rawText) return "";
  let trimmed = rawText.trim();
  if (trimmed.startsWith("```")) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.substring(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

// Log quarantined response
function writeToQuarantine(userMessage, rawResponse, errorMessage) {
  try {
    let quarantineLogs = [];
    if (fs.existsSync(QUARANTINE_FILE_PATH)) {
      try {
        const fileData = fs.readFileSync(QUARANTINE_FILE_PATH, "utf8");
        quarantineLogs = JSON.parse(fileData);
      } catch (err) {
        quarantineLogs = [];
      }
    }
    quarantineLogs.push({
      timestamp: new Date().toISOString(),
      userMessage,
      rawResponse,
      error: errorMessage,
    });
    fs.writeFileSync(QUARANTINE_FILE_PATH, JSON.stringify(quarantineLogs, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write to quarantine log:", err.message);
  }
}

// Stub Mode Classifier Implementation
function stubClassify(message) {
  const text = message.toLowerCase();

  let category = "other";
  let urgency = "low";
  let confidence = 0.85;
  let reason = "Classified via deterministic fallback rules.";

  if (text.includes("production down") || text.includes("outage") || text.includes("security") || text.includes("down!")) {
    category = text.includes("charge") || text.includes("bill") ? "billing" : "bug";
    urgency = "critical";
    confidence = 0.98;
    reason = "Critical production impact or emergency reported in stub mode.";
  } else if (text.includes("charge") || text.includes("invoice") || text.includes("bill") || text.includes("refund") || text.includes("payment")) {
    category = "billing";
    urgency = text.includes("double") || text.includes("fail") ? "high" : "medium";
    confidence = 0.95;
    reason = "Detected payment, charge, or billing inquiry in stub mode.";
  } else if (text.includes("bug") || text.includes("crash") || text.includes("error") || text.includes("fail") || text.includes("broken")) {
    category = "bug";
    urgency = text.includes("crash") || text.includes("every time") ? "high" : "medium";
    confidence = 0.92;
    reason = "Detected software bug or operational failure in stub mode.";
  } else if (text.includes("feature") || text.includes("add") || text.includes("suggest") || text.includes("dark mode") || text.includes("export") || text.includes("font")) {
    category = "feature";
    urgency = "low";
    confidence = 0.90;
    reason = "Detected request for new feature or enhancement in stub mode.";
  } else if (text.length < 10 || text.includes("stuff") || text.includes("help") || /^[^\w\s]+$/.test(text)) {
    category = "other";
    urgency = "low";
    confidence = 0.35;
    reason = "Input is vague, ambiguous, or lacks context in stub mode.";
  } else {
    category = "other";
    urgency = "medium";
    confidence = 0.70;
    reason = "General customer inquiry processed in stub mode.";
  }

  return { category, urgency, confidence, reason };
}

// Main Triage Handler
async function classifyMessage(message) {
  // 1. Check Kill Switch
  if (!config.enabled) {
    const error = new Error("LLM service is disabled by kill switch");
    error.status = 503;
    error.code = "LLM_DISABLED";
    throw error;
  }

  // 2. Check Stub Mode
  if (config.stub) {
    console.log(`[LLM SERVICE] Executing in STUB MODE for message: "${message}"`);
    const stubResult = stubClassify(message);
    const validated = TriageOutputSchema.parse(stubResult);
    return {
      data: validated,
      metadata: {
        model: "stub",
        promptVersion: "v1-stub",
        inputTokens: estimateTokens(message),
        outputTokens: estimateTokens(JSON.stringify(validated)),
        durationMs: 5,
        repairCount: 0,
        stub: true,
      },
    };
  }

  // Read Prompt Template
  let systemPrompt = "";
  try {
    systemPrompt = fs.readFileSync(PROMPT_FILE_PATH, "utf8");
  } catch (err) {
    systemPrompt = "You are a support triage classifier. Output JSON with category, urgency, confidence, reason.";
  }

  const promptText = `${systemPrompt}\n\nCustomer Message to Classify:\n"${message}"\n\nJSON Output:`;
  const startTime = Date.now();

  let rawResponseText = "";
  let repairCount = 0;

  // Helper for performing LLM Call with Retry Policy
  async function callLlmApi(promptContent) {
    let lastError = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      if (attempt > 0) {
        const backoffMs = calculateBackoff(attempt);
        console.log(`[LLM RETRY] Retrying LLM call (Attempt ${attempt}/${config.maxRetries}) after ${backoffMs}ms...`);
        await sleep(backoffMs);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

      try {
        const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: config.model,
            prompt: promptContent,
            stream: false,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const status = response.status;
          const statusText = await response.text();
          const err = new Error(`LLM provider returned HTTP ${status}: ${statusText}`);
          err.status = status;
          err.retryable = status === 429 || status >= 500;

          if (!err.retryable) {
            throw err;
          }
          lastError = err;
          continue;
        }

        const data = await response.json();
        return data.response || data.text || "";
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          const timeoutErr = new Error(`LLM request timed out after ${config.timeoutMs}ms`);
          timeoutErr.status = 504;
          timeoutErr.retryable = true;
          lastError = timeoutErr;
        } else if (err.retryable !== undefined) {
          lastError = err;
          if (!err.retryable) throw err;
        } else {
          err.retryable = true;
          lastError = err;
        }
      }
    }

    throw lastError || new Error("Failed to reach LLM provider after retries");
  }

  // Attempt 1: Call LLM
  try {
    rawResponseText = await callLlmApi(promptText);
  } catch (err) {
    console.warn(`[LLM SERVICE WARNING] Real LLM call failed: ${err.message}. Defaulting to stub logic.`);
    const fallbackResult = stubClassify(message);
    return {
      data: fallbackResult,
      metadata: {
        model: config.model,
        promptVersion: "v1",
        inputTokens: estimateTokens(message),
        outputTokens: estimateTokens(JSON.stringify(fallbackResult)),
        durationMs: Date.now() - startTime,
        repairCount: 0,
        fallback: true,
      },
    };
  }

  // Validate Initial Output
  let parsedJson = null;
  let validationResult = null;

  try {
    const extractedStr = extractJsonString(rawResponseText);
    parsedJson = JSON.parse(extractedStr);
    validationResult = TriageOutputSchema.safeParse(parsedJson);
  } catch (err) {
    validationResult = { success: false, error: err };
  }

  // Attempt 2: Repair Attempt if validation failed
  if (!validationResult.success) {
    repairCount = 1;
    console.warn(`[LLM REPAIR] Initial LLM output invalid. Triggering 1 repair attempt...`);

    const repairPrompt = `${systemPrompt}\n\nCustomer Message: "${message}"\n\nYour previous response was INVALID JSON or failed validation schema:\nRaw Response: ${rawResponseText}\nError Details: ${validationResult.error?.message || "Invalid JSON"}\n\nPlease REPAIR the output and respond with ONLY valid JSON strictly matching the schema:`;

    try {
      const repairedText = await callLlmApi(repairPrompt);
      const extractedRepaired = extractJsonString(repairedText);
      const repairedJson = JSON.parse(extractedRepaired);
      const repairedValidation = TriageOutputSchema.safeParse(repairedJson);

      if (repairedValidation.success) {
        const durationMs = Date.now() - startTime;
        const inputTokens = estimateTokens(promptText + repairPrompt);
        const outputTokens = estimateTokens(repairedText);

        console.log(`[LLM COST LOG] Model: ${config.model} | Version: v1 | InTokens: ~${inputTokens} | OutTokens: ~${outputTokens} | Duration: ${durationMs}ms | Repairs: ${repairCount}`);

        return {
          data: repairedValidation.data,
          metadata: {
            model: config.model,
            promptVersion: "v1",
            inputTokens,
            outputTokens,
            durationMs,
            repairCount,
          },
        };
      } else {
        // Quarantine after failed repair
        writeToQuarantine(message, repairedText, repairedValidation.error.message);
        const quarantineErr = new Error("Unprocessable LLM response after repair attempt");
        quarantineErr.status = 422;
        quarantineErr.rawResponse = repairedText;
        throw quarantineErr;
      }
    } catch (repairErr) {
      if (repairErr.status === 422) throw repairErr;
      writeToQuarantine(message, rawResponseText, repairErr.message);
      const quarantineErr = new Error("Unprocessable LLM response after repair attempt");
      quarantineErr.status = 422;
      quarantineErr.rawResponse = rawResponseText;
      throw quarantineErr;
    }
  }

  // Success on first attempt
  const durationMs = Date.now() - startTime;
  const inputTokens = estimateTokens(promptText);
  const outputTokens = estimateTokens(rawResponseText);

  console.log(`[LLM COST LOG] Model: ${config.model} | Version: v1 | InTokens: ~${inputTokens} | OutTokens: ~${outputTokens} | Duration: ${durationMs}ms | Repairs: ${repairCount}`);

  return {
    data: validationResult.data,
    metadata: {
      model: config.model,
      promptVersion: "v1",
      inputTokens,
      outputTokens,
      durationMs,
      repairCount,
    },
  };
}

module.exports = {
  classifyMessage,
  stubClassify,
  estimateTokens,
  extractJsonString,
  writeToQuarantine,
};
