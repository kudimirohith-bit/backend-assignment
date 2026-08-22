require("dotenv").config();

module.exports = {
  provider: process.env.LLM_PROVIDER || "ollama",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  model: process.env.LLM_MODEL || "gemma3:1b",
  enabled: process.env.LLM_ENABLED !== undefined ? process.env.LLM_ENABLED.toLowerCase() !== "false" && process.env.LLM_ENABLED !== "0" : true,
  stub: process.env.LLM_STUB !== undefined ? process.env.LLM_STUB === "1" || process.env.LLM_STUB.toLowerCase() === "true" : false,
  timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS, 10) || 10000,
  maxRetries: parseInt(process.env.LLM_MAX_RETRIES, 10) || 2,
};
