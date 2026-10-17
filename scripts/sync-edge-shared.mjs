// Copies the runtime-neutral JARVIS modules into supabase/functions/_shared/jarvis/ with the same relative
// layout, so the Edge Function runs the exact code the Node server and the tests run. No rewriting.
// Copied: the AI Team modules and the whole Node API source except its HTTP entry points (the refund engine,
// policy, simulated gateway and AMD client are reused unchanged; the bundler keeps only what is imported).
// `node scripts/sync-edge-shared.mjs --check` exits 1 when any copy differs from its source.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const walk = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(`${dir}/${d.name}`) : d.name.endsWith(".ts") ? [`${dir}/${d.name}`] : [],
  );
const SKIP_API = new Set(["apps/api/src/main.ts", "apps/api/src/server.ts", "apps/api/src/serverless.ts"]);
const SKIP_TEAM = /\/(conversations|live-client|mission)\.ts$/; // browser-only
const files = [...walk("apps/web/src/team").filter((f) => !SKIP_TEAM.test(f)), ...walk("apps/api/src").filter((f) => !SKIP_API.has(f))];

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
