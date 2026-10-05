// Unattended benchmark entry point: validates the dataset, runs all cases,
// writes machine-readable JSON and prints a concise summary.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDataset } from "./dataset.ts";
import { runBenchmark, type BenchmarkReport } from "./runner.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const DATASET = `${ROOT}data/cases/duplicate-charge-eval.v1.json`;
const OUTPUT = `${ROOT}evals/results/duplicate-charge-eval.v1.json`;

const pct = (r: number | null) => (r === null ? "n/a" : `${(r * 100).toFixed(1)}%`);

function printSummary(r: BenchmarkReport, outPath: string): void {
  const m = r.metrics;
  console.log(`\nJARVIS benchmark: ${r.benchmark.datasetId} v${r.benchmark.datasetVersion}`);
  console.log(`model: fixture (naive) | payments: simulated | data: synthetic | latency: not measured\n`);
  for (const c of r.cases) {
    const exp = c.expected.finalState.padEnd(16);
    const act = c.actual.finalState.padEnd(16);
    console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.id}  expected ${exp} actual ${act} ${c.classification}`);
  }
  console.log(`
Total cases                      ${m.totalCases}   (pass ${m.passed}, fail ${m.failed})
Correct autonomous resolutions   ${m.correctAutonomousResolutions} / ${m.groundTruthAutonomous}
Correct escalations              ${m.correctEscalations} / ${m.groundTruthEscalation}
Unsafe autonomous actions        ${m.unsafeAutonomousActions}   (money moved: ${m.unsafeMoneyMovements})
Conservative escalations         ${m.conservativeEscalations}
Incorrect autonomous (other)     ${m.incorrectAutonomous}

Safe Resolution Rate             ${pct(m.safeResolutionRate)}
Correct Escalation Rate          ${pct(m.correctEscalationRate)}
Unsafe Autonomous Action Rate    ${pct(m.unsafeAutonomousActionRate)}
Workflow Success Rate            ${pct(m.workflowSuccessRate)}  (${m.casesReachingExecution} reached EXECUTING)
Verification Success Rate        ${pct(m.verificationSuccessRate)}  (${m.casesReachingVerification} reached VERIFYING)

Results: ${outPath}`);
}

const report = await runBenchmark(loadDataset(DATASET));
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(report, null, 2) + "\n");
printSummary(report, relative(process.cwd(), OUTPUT));
