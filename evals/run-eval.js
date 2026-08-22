const fs = require("fs");
const path = require("path");
const { classifyMessage } = require("../services/llmService");

async function runEvaluation() {
  console.log("=================================================");
  console.log("         TRIAGE API EVALUATION SUITE            ");
  console.log("=================================================\n");

  const casesPath = path.join(__dirname, "cases.json");
  const resultsPath = path.join(__dirname, "results.json");

  if (!fs.existsSync(casesPath)) {
    console.error("Evaluation cases file missing at:", casesPath);
    process.exit(1);
  }

  const cases = JSON.parse(fs.readFileSync(casesPath, "utf8"));
  console.log(`Loaded ${cases.length} evaluation cases.\n`);

  let categoryMatches = 0;
  let urgencyMatches = 0;
  let exactMatches = 0;
  const detailedResults = [];

  for (const testCase of cases) {
    console.log(`Running Case #${testCase.id}: ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);

    const startTime = Date.now();
    let result = null;
    let evalError = null;

    try {
      result = await classifyMessage(testCase.input);
    } catch (err) {
      evalError = err.message;
    }

    const duration = Date.now() - startTime;

    if (evalError || !result) {
      console.log(`❌ ERROR: ${evalError}\n`);
      detailedResults.push({
        ...testCase,
        status: "ERROR",
        error: evalError,
        durationMs: duration,
      });
      continue;
    }

    const actualCategory = result.data.category;
    const actualUrgency = result.data.urgency;
    const confidence = result.data.confidence;
    const reason = result.data.reason;

    const categoryCorrect = actualCategory === testCase.expectedCategory;
    const urgencyCorrect = actualUrgency === testCase.expectedUrgency;
    const isExactMatch = categoryCorrect && urgencyCorrect;

    if (categoryCorrect) categoryMatches++;
    if (urgencyCorrect) urgencyMatches++;
    if (isExactMatch) exactMatches++;

    console.log(`  Expected -> Category: ${testCase.expectedCategory} | Urgency: ${testCase.expectedUrgency}`);
    console.log(`  Actual   -> Category: ${actualCategory} | Urgency: ${actualUrgency} (Conf: ${confidence})`);
    console.log(`  Reason   -> ${reason}`);
    console.log(`  Status   -> Category: ${categoryCorrect ? "✅ MATCH" : "❌ MISMATCH"} | Urgency: ${urgencyCorrect ? "✅ MATCH" : "❌ MISMATCH"} (${duration}ms)\n`);

    detailedResults.push({
      id: testCase.id,
      name: testCase.name,
      input: testCase.input,
      expected: {
        category: testCase.expectedCategory,
        urgency: testCase.expectedUrgency,
      },
      actual: {
        category: actualCategory,
        urgency: actualUrgency,
        confidence,
        reason,
      },
      match: {
        category: categoryCorrect,
        urgency: urgencyCorrect,
        exact: isExactMatch,
      },
      metadata: result.metadata,
      durationMs: duration,
    });
  }

  const categoryScore = ((categoryMatches / cases.length) * 100).toFixed(1);
  const urgencyScore = ((urgencyMatches / cases.length) * 100).toFixed(1);
  const overallScore = ((exactMatches / cases.length) * 100).toFixed(1);

  const summary = {
    totalCases: cases.length,
    categoryMatches,
    categoryAccuracyPct: parseFloat(categoryScore),
    urgencyMatches,
    urgencyAccuracyPct: parseFloat(urgencyScore),
    exactMatches,
    overallScorePct: parseFloat(overallScore),
    timestamp: new Date().toISOString(),
    results: detailedResults,
  };

  fs.writeFileSync(resultsPath, JSON.stringify(summary, null, 2), "utf8");

  console.log("=================================================");
  console.log("              EVALUATION SUMMARY                 ");
  console.log("=================================================");
  console.log(`Total Cases Evaluated : ${cases.length}`);
  console.log(`Category Accuracy     : ${categoryMatches}/${cases.length} (${categoryScore}%)`);
  console.log(`Urgency Accuracy      : ${urgencyMatches}/${cases.length} (${urgencyScore}%)`);
  console.log(`Exact Match Score     : ${exactMatches}/${cases.length} (${overallScore}%)`);
  console.log("=================================================");
  console.log(`Detailed report saved to: ${resultsPath}\n`);

  return summary;
}

if (require.main === module) {
  runEvaluation().catch((err) => {
    console.error("Evaluation run failed:", err);
    process.exit(1);
  });
}

module.exports = { runEvaluation };
