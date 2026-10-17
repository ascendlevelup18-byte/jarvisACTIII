// Copies the runtime-neutral AI Team modules into supabase/functions/_shared/jarvis/ with the same relative
// layout, so the Edge Functions run the exact code the Node server and the tests run. No rewriting.
// `node scripts/sync-edge-shared.mjs --check` exits 1 when the copies differ from the sources.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const root = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const files = [
  "apps/web/src/team/agents.ts",
  "apps/web/src/team/context.ts",
  "apps/web/src/team/dataset.ts",
  "apps/web/src/team/metrics.ts",
  "apps/web/src/team/figures.ts",
  "apps/web/src/team/orchestrator.ts",
  "apps/web/src/team/provider.ts",
  "apps/web/src/team/specialists.ts",
  "apps/api/src/team/openrouter.ts",
];
const check = process.argv.includes("--check");
let stale = 0;
for (const f of files) {
  const src = readFileSync(join(root, f), "utf8");
  const dest = join(root, "supabase/functions/_shared/jarvis", f.replace(/^apps\//, ""));
  if (check) {
    if (!existsSync(dest) || readFileSync(dest, "utf8") !== src) {
      console.error(`stale: ${dest}`);
      stale++;
    }
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, src);
}
if (check && stale) process.exit(1);
console.log(check ? "edge shared modules in sync" : `copied ${files.length} files`);
