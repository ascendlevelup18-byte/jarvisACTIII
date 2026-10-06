import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  FIXTURE_BENCHMARK,
  FIXTURE_BENCHMARK_LABEL,
  FIXTURE_BENCHMARK_NOTE,
  FIXTURE_BENCHMARK_SCOPE,
} from "../src/lib/bench-metrics.ts";

const webRoot = join(import.meta.dirname, "..");
const repoRoot = join(webRoot, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}

describe("public fixture benchmark labelling", () => {
  it("names the figures as pre-kickoff fixture results, not AMD / real-model results", () => {
    assert.equal(FIXTURE_BENCHMARK_LABEL, "PRE-KICKOFF FIXTURE BENCHMARK");
    assert.equal(FIXTURE_BENCHMARK_SCOPE, "NOT AMD / NOT REAL-MODEL RESULTS");
    assert.equal(
      FIXTURE_BENCHMARK_NOTE,
      "Measured against JARVIS’s locked synthetic fixture benchmark. Real AMD-hosted model evaluation begins during ACT III.",
    );
  });

  it("shows the label and scope wherever benchmark figures are rendered", () => {
    const figure = /FIXTURE_BENCHMARK\.(safeResolutionRate|correctEscalationRate|unsafeAutonomousActions)|\bb\.(safeResolutionRate|correctEscalationRate|unsafeAutonomousActions)/;
    const renderers = sourceFiles(join(webRoot, "src")).filter((f) => f.endsWith(".tsx") && figure.test(readFileSync(f, "utf8")));
    assert.ok(renderers.length >= 2, `expected the Operations strip and Benchmarks page, found ${renderers.length}`);
    for (const f of renderers) {
      assert.match(readFileSync(f, "utf8"), /<FixtureBenchmarkNotice\b/, `${f} renders benchmark figures without <FixtureBenchmarkNotice>`);
    }
  });

  it("the notice component renders label, scope and note", () => {
    const src = readFileSync(join(webRoot, "src/components/ui/FixtureBenchmarkNotice.tsx"), "utf8");
    for (const name of ["FIXTURE_BENCHMARK_LABEL", "FIXTURE_BENCHMARK_SCOPE", "FIXTURE_BENCHMARK_NOTE"]) {
      assert.match(src, new RegExp(`\\{${name}\\}`), `notice does not render ${name}`);
    }
  });

  it("displayed figures match the committed fixture benchmark results", () => {
    const results = JSON.parse(readFileSync(join(repoRoot, "evals/results/duplicate-charge-eval.v1.json"), "utf8"));
    const m = results.metrics;
    assert.equal(FIXTURE_BENCHMARK.unsafeAutonomousActions, m.unsafeAutonomousActions);
    assert.equal(FIXTURE_BENCHMARK.safeResolutionRate.toFixed(3), m.safeResolutionRate.toFixed(3));
    assert.equal(FIXTURE_BENCHMARK.correctEscalationRate, m.correctEscalationRate);
    assert.equal(FIXTURE_BENCHMARK.totalCases, m.totalCases);
    assert.equal(FIXTURE_BENCHMARK.workflowSuccessRate, m.workflowSuccessRate);
    assert.equal(FIXTURE_BENCHMARK.verificationSuccessRate, m.verificationSuccessRate);
  });
});
