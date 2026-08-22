# Backend Assignment: Message Triage & Classification API

An automated AI customer support message triage and classification service built with Express.js, Zod, and Ollama (Gemma 3 1B).

---

## 🚀 Overview

The `POST /triage` API endpoint analyzes customer support tickets and classifies them into structured categories (`billing`, `bug`, `feature`, `other`) and urgency levels (`low`, `medium`, `high`, `critical`), providing confidence scores and rationale.

### Features
* **Versioned Prompt Architecture**: `prompts/triage-v1.md` enforces role, rules, and few-shot examples.
* **Strict Zod Output Validation**: Validates category, urgency, confidence range (`0.0 - 1.0`), and reason string.
* **1-Attempt Auto Repair**: Automatically prompts the LLM to fix invalid JSON outputs if schema validation fails.
* **Quarantine Handling**: Logs unprocessable/malformed responses to `logs/quarantine.json` and returns HTTP `422`.
* **Resilient Retry Policy**: Exponential backoff with random jitter for timeouts, HTTP 429, and 5xx errors (non-retryable errors like 400/401/403 fail immediately).
* **Kill Switch**: Quick disable flag (`LLM_ENABLED=false`) returning HTTP `503 Service Unavailable`.
* **Stub Mode**: Offline deterministic mode (`LLM_STUB=1`) for fast local testing and CI/CD validation.
* **Cost & Token Logging**: Console logging of input/output token estimates, request duration, and repair counts.
* **Evaluation Suite**: 8 realistic test cases (`evals/cases.json`) with benchmark scoring.

---

## 🛠️ Installation & Setup

### Prerequisites
* Node.js v18+
* Ollama installed locally (`ollama pull gemma3:1b`)

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/kudimirohith-bit/backend-assignment.git
cd backend-assignment
npm install
```

### 2. Environment Configuration
Create a `.env` file based on `.env.example`:

```env
PORT=3000
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=gemma3:1b
LLM_ENABLED=true
LLM_STUB=0
LLM_TIMEOUT_MS=10000
LLM_MAX_RETRIES=2
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Server listening port |
| `LLM_PROVIDER` | `ollama` | LLM provider name |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama service URL |
| `LLM_MODEL` | `gemma3:1b` | Model name (e.g. Gemma 3 1B) |
| `LLM_ENABLED` | `true` | Kill switch (`true`/`false`). When `false`, returns HTTP 503 |
| `LLM_STUB` | `0` | Stub mode (`1`/`0`). When `1`, returns deterministic responses without calling LLM |
| `LLM_TIMEOUT_MS` | `10000` | Request timeout in milliseconds |
| `LLM_MAX_RETRIES` | `2` | Maximum retry attempts for retryable errors |

---

## 🏃 Running the Server

### Development Server
```bash
npm run dev
```

### Production Start
```bash
npm start
```

---

## 🧪 Running Evaluations

Run the 8-case evaluation benchmark:

```bash
npm run eval
```

### Evaluation Benchmark Results
```
Total Cases Evaluated : 8
Category Accuracy     : 8/8 (100.0%)
Urgency Accuracy      : 8/8 (100.0%)
Exact Match Score     : 8/8 (100.0%)
```

---

## 📡 API Usage & Curl Examples

### Endpoint: `POST /triage`

#### Request (Billing High Urgency)
```bash
curl -X POST http://localhost:3000/triage \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I was double charged $49.99 on my credit card statement this morning. Please process a refund."
  }'
```

#### Response (200 OK)
```json
{
  "category": "billing",
  "urgency": "high",
  "confidence": 0.95,
  "reason": "Detected payment, charge, or billing inquiry in stub mode."
}
```

#### Request (Critical Production Bug)
```bash
curl -X POST http://localhost:3000/triage \
  -H "Content-Type: application/json" \
  -d '{
    "message": "URGENT: Production database server is throwing 500 internal server errors. All users are unable to access their accounts!"
  }'
```

#### Response (200 OK)
```json
{
  "category": "bug",
  "urgency": "critical",
  "confidence": 0.98,
  "reason": "Critical production impact or emergency reported in stub mode."
}
```

#### Invalid Request Input (400 Bad Request)
```bash
curl -X POST http://localhost:3000/triage \
  -H "Content-Type: application/json" \
  -d '{}'
```

```json
{
  "error": "Invalid input payload",
  "details": "Message is required and cannot be empty"
}
```

---

## 🛡️ Resilience & Safety Mechanisms

### 1. Kill Switch (`LLM_ENABLED=false`)
When disabled, `POST /triage` immediately returns `503 Service Unavailable`:
```json
{
  "error": "Service Unavailable",
  "message": "LLM service is disabled by kill switch"
}
```

### 2. Output Repair & Quarantine
If the LLM output violates the Zod schema:
1. **Repair Attempt**: The system sends a second request to the LLM pointing out the exact validation error and requesting a repaired JSON object.
2. **Quarantine**: If the repaired output is still invalid, the error and raw response are saved to `logs/quarantine.json` and the API returns `422 Unprocessable Entity`.

### 3. Retry Policy
- Retries transient errors (Timeouts, HTTP 429 Rate Limits, HTTP 5xx Server Errors).
- Uses exponential backoff with random jitter: `delay = 300ms * (2 ^ attempt) + jitter`.
- Excludes client errors (HTTP 400, 401, 403).

---

## ⚠️ Limitations & Edge Cases
* **Model Size**: Gemma 3 1B is lightweight for fast inference but may occasionally hallucinate JSON syntax under highly complex multi-intent inputs without output repair.
* **Network Requirements**: Requires local Ollama service running on port 11434 when `LLM_STUB=0`.
