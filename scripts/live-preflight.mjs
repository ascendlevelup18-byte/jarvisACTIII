#!/usr/bin/env node
// Offline pre-flight for the paid live gate. Makes NO model calls and needs NO key.
//   node scripts/live-preflight.mjs [--port 3210] [--understanding-model Gemma-4-31B-IT] [--network]
// --network adds one free, unauthenticated GET {base}/models (expects 401/403; no key is sent).
// Exit 0 only if every check passes; prints the exact owner command to run next.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const PORT = Number(opt("--port", "3210"));
const BASE = opt("--base-url", "https://developer.amd.com.cn/radeon/api/v1");
const MODEL = opt("--model", "DeepSeek-V4-Flash");
const UNDERSTANDING = opt("--understanding-model", "");
const TIMEOUT_MS = Number(opt("--timeout-ms", UNDERSTANDING ? "90000" : "30000"));
const NETWORK = args.includes("--network");
const DATASET_SHA = "d5a8b4064b81bf8bfd69f95e8e0b6aa081529d63b053287a2761d3f4c9c28e47";

const results = [];
const check = (name, ok, detail = "") => results.push({ ok: !!ok, name, detail });

const portFree = (port) =>
  new Promise((resolve) => {
    const s = createServer();
    s.once("error", () => resolve(false));
    s.listen(port, () => s.close(() => resolve(true)));
  });

async function main() {
  const major = Number(process.versions.node.split(".")[0]);
  check("Node.js >= 24", major >= 24, `node ${process.versions.node}`);

  check(`Port ${PORT} is free`, await portFree(PORT), "the live gate starts its own API there");

  const stale = Object.keys(process.env).filter((k) => k.startsWith("JARVIS_"));
  check("No JARVIS_* variables already set in this shell", stale.length === 0, stale.length ? `set: ${stale.join(", ")}` : "clean");

  const sha = createHash("sha256").update(readFileSync(`${ROOT}data/cases/duplicate-charge-eval.v1.json`)).digest("hex");
  check("Benchmark dataset is the pinned v1", sha === DATASET_SHA, sha.slice(0, 12));

  let head = "unknown";
  try {
    head = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    /* git not available */
  }
  check("Git HEAD readable", head !== "unknown", head);

  // Config parsing with a dummy key: proves the env the gate will set is valid, without any network.
  const { loadAiConfig } = await import(new URL("../apps/api/src/ai-config.ts", import.meta.url));
  try {
    const cfg = loadAiConfig({
      JARVIS_AI_MODE: "vllm",
      JARVIS_MODEL_BASE_URL: BASE,
      JARVIS_MODEL_NAME: MODEL,
      JARVIS_MODEL_API_KEY: "preflight-dummy-not-a-key",
      JARVIS_MODEL_TIMEOUT_MS: String(TIMEOUT_MS),
      JARVIS_MODEL_MAX_RETRIES: "1",
      JARVIS_MODEL_STRUCTURED_OUTPUT: "json_object",
      JARVIS_MODEL_MIN_INTERVAL_MS: "3100",
      ...(UNDERSTANDING ? { JARVIS_UNDERSTANDING_MODEL_NAME: UNDERSTANDING } : {}),
    });
    check(
      "Live configuration parses",
      cfg.mode === "vllm",
      `decision ${cfg.modelName} · understanding ${cfg.understandingModelName} · timeout ${cfg.modelTimeoutMs} ms · pacing ${cfg.modelMinIntervalMs} ms`,
    );
  } catch (e) {
    check("Live configuration parses", false, e instanceof Error ? e.message : String(e));
  }

  // Fixture startup (no network) proves the app itself boots.
  const { initializeAi } = await import(new URL("../apps/api/src/ai-mode.ts", import.meta.url));
  const { startup } = await initializeAi(loadAiConfig({}));
  check("Fixture startup works offline", startup.mode === "fixture", `startupMs ${startup.startupMs}`);

  if (NETWORK) {
    try {
      const res = await fetch(`${BASE.replace(/\/$/, "")}/models`, { signal: AbortSignal.timeout(15_000) });
      check("Endpoint reachable without a key (expects 401/403)", res.status === 401 || res.status === 403, `HTTP ${res.status}`);
    } catch (e) {
      check("Endpoint reachable without a key (expects 401/403)", false, e instanceof Error ? e.message : String(e));
    }
  }

  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  —  ${r.detail}` : ""}`);
  const failed = results.filter((r) => !r.ok).length;
  const gate = [
    "& .\\scripts\\live-gate.ps1",
    `-BaseUrl ${BASE}`,
    UNDERSTANDING ? `-UnderstandingModel ${UNDERSTANDING}` : "",
    `-TimeoutMs ${TIMEOUT_MS}`,
    `-Port ${PORT}`,
    `-RunId ${UNDERSTANDING ? "tg-1" : "tf-2"}`,
  ]
    .filter(Boolean)
    .join(" ");
  console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? "" : " · ready for the live gate"}`);
  if (!failed) console.log(`Owner command (new Windows PowerShell, key only at the hidden prompt; no Start-Transcript):\n  cd C:\\jarvis-actiii-preview; Set-ExecutionPolicy -Scope Process Bypass -Force; ${gate}`);
  process.exit(failed ? 1 : 0);
}

await main();
