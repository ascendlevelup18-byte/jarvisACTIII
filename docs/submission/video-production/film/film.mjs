#!/usr/bin/env node
// JARVIS film builder: validates the manifest, lints claims, checks voice-over lengths, writes captions
// and an edit plan, renders placeholder slates (preview) and an FFmpeg build script.
//   node film.mjs check     validate only, write nothing
//   node film.mjs preview   missing footage becomes visibly marked PLACEHOLDER slates
//   node film.mjs release   fails unless every real product recording (R*) and voice-over exists
// Outputs go to ./out. Rendering the MP4 needs FFmpeg (not bundled); see out/build-film.ps1.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const MAX_LINE = 42; // characters per caption line (broadcast-safe at 1080p)
export const MAX_LINES = 2;
export const MIN_CUE_S = 1.2;

export function loadManifest(path = join(HERE, "manifest.json")) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Narration actually used for a scene, given the manifest flags. */
export function narrationFor(scene, flags) {
  return flags.gemmaLiveVerified && scene.narrationIfGemmaVerified ? scene.narrationIfGemmaVerified : scene.narration;
}

export const words = (text) => text.trim().split(/\s+/).filter(Boolean).length;

// Claims that must never appear in narration or on-screen text (see CLAIMS_CHECKLIST.md).
const FORBIDDEN = [
  [/\breal (money|refunds?|payments?)\b(?! (is|are|was|were) (never|not))/i, "implies real money moved"],
  [/\b(our|self-hosted|own) (gpus?|servers?|vllm)\b/i, "implies self-hosted AMD GPU inference"],
  [/\b(instinct|mi300|rocm)\b/i, "names AMD hardware JARVIS does not run on"],
  [/\bfully autonomous\b|\bautonomous (ai )?agent that\b|\bthe assistant (understands|executes|acts)\b/i, "overstates the browser assistant"],
  [/\bevolus\b/i, "partner integration not built"],
  [/\b(saves?|saved) (\d+|hours|time|money)\b|\brevenue\b/i, "unmeasured business impact"],
];
const GEMMA_LIVE = /\bgemma\b[^.]*\b(reads|understands|handles|interprets)\b(?![^.]*\bstill being validated\b)/i;

/** Returns a list of problems; empty means the text is safe to ship. */
export function lintClaims(text, flags) {
  const problems = FORBIDDEN.filter(([re]) => re.test(text)).map(([, why]) => why);
  if (!flags.gemmaLiveVerified && GEMMA_LIVE.test(text)) problems.push("claims a live Gemma path before it is verified");
  return problems;
}

export function validateManifest(m) {
  const errors = [];
  const total = m.scenes.reduce((s, x) => s + x.seconds, 0);
  if (total !== m.totalSeconds) errors.push(`scene durations sum to ${total}s, expected ${m.totalSeconds}s`);
  const ids = new Set();
  for (const s of m.scenes) {
    if (ids.has(s.id)) errors.push(`${s.id}: duplicate scene id`);
    ids.add(s.id);
    for (const a of [...s.assets, ...(s.fallback ? [s.fallback] : [])]) if (!m.assets[a]) errors.push(`${s.id}: unknown asset ${a}`);
    const text = narrationFor(s, m.flags);
    const budget = Math.floor(s.seconds * m.maxWordsPerSecond);
    if (words(text) > budget) errors.push(`${s.id}: narration has ${words(text)} words, budget ${budget} for ${s.seconds}s`);
    for (const p of lintClaims(`${text} ${s.onScreen ?? ""}`, m.flags)) errors.push(`${s.id}: ${p}`);
    if (s.assets.some((a) => m.assets[a].kind === "product") && !/live product footage/i.test(s.onScreen ?? "")) {
      errors.push(`${s.id}: product footage needs the "Live product footage" label`);
    }
    if (s.assets.every((a) => m.assets[a].kind === "illustration") && !/illustration/i.test(s.onScreen ?? "")) {
      errors.push(`${s.id}: illustration-only scene needs the "Illustration" label`);
    }
    if (/\$\s?\d|\bdollars?\b|refund/i.test(text) && s.assets.some((a) => m.assets[a].kind === "product") && !/simulated/i.test(`${text} ${s.onScreen}`)) {
      errors.push(`${s.id}: money shown without a "simulated" label`);
    }
  }
  return errors;
}

/** Wraps text into lines of at most `max` characters without splitting words. */
export function wrap(text, max = MAX_LINE) {
  const lines = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (!cur) cur = w;
    else if (`${cur} ${w}`.length <= max) cur = `${cur} ${w}`;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Splits narration into caption chunks of at most MAX_LINES wrapped lines. */
export function chunks(text) {
  const out = [];
  for (const sentence of text.match(/[^.!?]+[.!?]*/g) ?? []) {
    const lines = wrap(sentence.trim());
    for (let i = 0; i < lines.length; i += MAX_LINES) out.push(lines.slice(i, i + MAX_LINES));
  }
  return out;
}

/** Timed cues across the whole film; each scene's cues fit inside the scene, proportional to word count. */
export function buildCues(m) {
  const cues = [];
  let sceneStart = 0;
  for (const s of m.scenes) {
    const parts = chunks(narrationFor(s, m.flags));
    const total = parts.reduce((n, p) => n + words(p.join(" ")), 0);
    const usable = s.seconds - 0.4; // small gap before the next scene
    let t = sceneStart + 0.2;
    for (const p of parts) {
      const share = Math.max(MIN_CUE_S, (usable * words(p.join(" "))) / total);
      const end = Math.min(t + share, sceneStart + s.seconds - 0.1);
      cues.push({ scene: s.id, start: t, end, lines: p });
      t = end;
    }
    sceneStart += s.seconds;
  }
  return cues;
}

const ts = (sec) => {
  const ms = Math.round(sec * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3_600_000))}:${p(Math.floor(ms / 60_000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

export function toSrt(cues) {
  return cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.lines.join("\n")}\n`).join("\n");
}

/** Duration of a PCM/float WAV file in seconds, or null if it is not a readable WAV. */
export function wavSeconds(buf) {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;
  let off = 12;
  let byteRate = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") byteRate = buf.readUInt32LE(off + 16);
    if (id === "data") return byteRate ? size / byteRate : null;
    off += 8 + size + (size % 2);
  }
  return null;
}

/** Voice-over check: a VO longer than its scene would be cut off, so it is an error in every mode. */
export function checkVoiceover(m, dir, mode) {
  const errors = [];
  const warnings = [];
  for (const s of m.scenes) {
    const f = join(dir, "vo", `${s.id}.wav`);
    if (!existsSync(f)) {
      (mode === "release" ? errors : warnings).push(`${s.id}: voice-over vo/${s.id}.wav missing`);
      continue;
    }
    const sec = wavSeconds(readFileSync(f));
    if (sec === null) errors.push(`${s.id}: vo/${s.id}.wav is not a readable WAV`);
    else if (sec > s.seconds - 0.2) errors.push(`${s.id}: voice-over is ${sec.toFixed(2)}s, scene is ${s.seconds}s (would be truncated)`);
  }
  return { errors, warnings };
}

/** Which file fills each scene in this mode. Release refuses missing product footage and placeholders. */
export function resolveAssets(m, dir, mode) {
  const errors = [];
  const plan = [];
  for (const s of m.scenes) {
    const present = s.assets.filter((a) => existsSync(join(dir, m.assets[a].file)));
    const missingProduct = s.assets.filter((a) => m.assets[a].kind === "product" && !present.includes(a));
    let sources = present.map((a) => ({ id: a, file: m.assets[a].file, kind: m.assets[a].kind }));
    if (missingProduct.length) {
      if (mode === "release") errors.push(`${s.id}: missing real product footage ${missingProduct.join(", ")}`);
      sources = sources.filter((x) => x.kind === "product");
      for (const id of missingProduct) sources.push({ id, file: `out/slates/${s.id}-${id}.png`, kind: "placeholder" });
    } else if (sources.length === 0) {
      const fb = s.fallback && existsSync(join(dir, m.assets[s.fallback].file)) ? s.fallback : null;
      if (fb) sources = [{ id: fb, file: m.assets[fb].file, kind: m.assets[fb].kind }];
      else if (mode === "release") errors.push(`${s.id}: no asset and no fallback (${[...s.assets, s.fallback].filter(Boolean).join(", ")})`);
      else sources = [{ id: s.assets[0], file: `out/slates/${s.id}-${s.assets[0]}.png`, kind: "placeholder" }];
    }
    const each = s.seconds / Math.max(1, sources.length);
    plan.push({ scene: s.id, title: s.title, seconds: s.seconds, onScreen: s.onScreen, sources: sources.map((x) => ({ ...x, seconds: each })) });
  }
  return { plan, errors };
}

export function findTool(name, candidates = []) {
  for (const c of candidates) if (existsSync(c)) return c;
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [name], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
}

const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"];

function slateHtml(scene, assetId, what) {
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  return `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;width:1920px;height:1080px;background:#0b1220;color:#e2e8f0;font-family:Segoe UI,system-ui,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 140px;box-sizing:border-box}
  .tag{font-size:34px;font-weight:800;letter-spacing:.2em;color:#fbbf24;border:4px solid #fbbf24;display:inline-block;padding:10px 26px;margin-bottom:40px;align-self:flex-start}
  h1{font-size:84px;margin:0 0 20px}p{font-size:36px;color:#94a3b8;margin:0 0 14px;max-width:1500px}</style>
  <div class="tag">PLACEHOLDER · NOT FOR RELEASE</div><h1>${esc(scene.id)} · ${esc(scene.title)}</h1>
  <p>Insert ${esc(assetId)}: ${esc(what)}</p><p>${esc(scene.seconds)} s · ${esc(scene.onScreen ?? "")}</p>`;
}

function renderPng(chrome, htmlFile, pngFile, hash = "") {
  execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files", "--window-size=1920,1080", `--screenshot=${pngFile}`, `${pathToFileURL(htmlFile).href}${hash}`], { stdio: "ignore" });
}

function buildScript(plan, hasVo) {
  // FFmpeg build script (PowerShell). Untested until FFmpeg is installed.
  const lines = ["# Generated by film.mjs. Requires ffmpeg on PATH. Run from the film folder.", "$ErrorActionPreference = 'Stop'", "New-Item -ItemType Directory -Force out\\segments | Out-Null"];
  let n = 0;
  const list = [];
  for (const sc of plan) {
    for (const src of sc.sources) {
      n++;
      const seg = `out\\segments\\${String(n).padStart(2, "0")}.mp4`;
      const isImage = /\.png$/i.test(src.file);
      const input = isImage ? `-loop 1 -t ${src.seconds.toFixed(3)} -i "${src.file}"` : `-t ${src.seconds.toFixed(3)} -i "${src.file}"`;
      lines.push(`ffmpeg -y ${input} -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p" -an -c:v libx264 -preset veryfast -crf 18 "${seg}"`);
      list.push(`file '${seg.replace(/\\/g, "/").replace("out/", "")}'`);
    }
  }
  lines.push(`Set-Content -Encoding ascii out\\segments.txt @'\n${list.join("\n")}\n'@`);
  lines.push('ffmpeg -y -f concat -safe 0 -i out\\segments.txt -c copy out\\video-only.mp4');
  if (hasVo) {
    const voList = plan.map((sc) => `file '../vo/${sc.scene}.wav'`).join("\n");
    lines.push(`Set-Content -Encoding ascii out\\vo.txt @'\n${voList}\n'@`);
    lines.push("# Each VO is padded to its scene length so narration stays in sync and is never cut.");
    const pads = plan.map((sc, i) => `[${i}:a]apad=whole_dur=${sc.seconds}[a${i}]`).join(";");
    const ins = plan.map((sc) => `-i "vo\\${sc.scene}.wav"`).join(" ");
    const cat = plan.map((_, i) => `[a${i}]`).join("");
    lines.push(`ffmpeg -y ${ins} -filter_complex "${pads};${cat}concat=n=${plan.length}:v=0:a=1[a]" -map "[a]" -c:a aac -b:a 192k out\\voice.m4a`);
    lines.push('ffmpeg -y -i out\\video-only.mp4 -i out\\voice.m4a -i out\\captions.srt -map 0:v -map 1:a -map 2:s -c:v copy -c:a copy -c:s mov_text -metadata:s:s:0 language=eng out\\jarvis-film.mp4');
  } else {
    lines.push('ffmpeg -y -i out\\video-only.mp4 -i out\\captions.srt -map 0:v -map 1:s -c:v copy -c:s mov_text out\\jarvis-film-silent.mp4');
  }
  return `${lines.join("\r\n")}\r\n`;
}

export function run(mode, dir = HERE) {
  const m = loadManifest(join(dir, "manifest.json"));
  const report = { mode, errors: [...validateManifest(m)], warnings: [] };
  const vo = checkVoiceover(m, dir, mode);
  report.errors.push(...vo.errors);
  report.warnings.push(...vo.warnings);
  report.tools = {
    ffmpeg: findTool("ffmpeg"),
    blender: findTool("blender", ["C:/Program Files/Blender Foundation/Blender 4.2/blender.exe", "C:/Program Files/Blender Foundation/Blender 4.3/blender.exe"]),
    chrome: CHROME.find((c) => existsSync(c)) ?? null,
  };
  // Deck slides are real (non-placeholder) assets: export them from the HTML deck before resolving scenes.
  const deck = resolve(dir, "../../deck/jarvis-deck.html");
  if (mode !== "check" && report.errors.length === 0 && report.tools.chrome && existsSync(deck)) {
    mkdirSync(join(dir, "slides"), { recursive: true });
    for (const [id, a] of Object.entries(m.assets)) {
      if (a.kind !== "slide" || existsSync(join(dir, a.file))) continue;
      renderPng(report.tools.chrome, deck, join(dir, a.file), `#s${id.slice(1)}`);
    }
  }
  const { plan, errors } = resolveAssets(m, dir, mode === "check" ? "preview" : mode);
  if (mode === "release") report.errors.push(...errors);
  report.plan = plan;
  report.placeholders = plan.flatMap((s) => s.sources.filter((x) => x.kind === "placeholder").map((x) => `${s.scene}:${x.id}`));
  if (mode === "check" || report.errors.length) return report;

  const out = join(dir, "out");
  mkdirSync(join(out, "slates"), { recursive: true });
  const cues = buildCues(m);
  writeFileSync(join(out, "captions.srt"), toSrt(cues));
  writeFileSync(join(out, "plan.json"), `${JSON.stringify({ title: m.title, mode, totalSeconds: m.totalSeconds, flags: m.flags, plan }, null, 2)}\n`);
  writeFileSync(join(out, "build-film.ps1"), buildScript(plan, mode === "release" || m.scenes.every((s) => existsSync(join(dir, "vo", `${s.id}.wav`)))));
  report.cues = cues.length;
  if (mode === "preview" && report.tools.chrome) {
    for (const s of plan) {
      for (const src of s.sources.filter((x) => x.kind === "placeholder")) {
        const scene = m.scenes.find((x) => x.id === s.scene);
        const html = join(out, "slates", `${s.scene}-${src.id}.html`);
        writeFileSync(html, slateHtml(scene, src.id, m.assets[src.id].what));
        renderPng(report.tools.chrome, html, join(dir, src.file));
      }
    }
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? "check";
  if (!["check", "preview", "release"].includes(mode)) {
    console.error("usage: node film.mjs check|preview|release");
    process.exit(2);
  }
  const r = run(mode);
  for (const e of r.errors) console.log(`ERROR  ${e}`);
  for (const w of r.warnings) console.log(`warn   ${w}`);
  console.log(`\nmode ${mode} · ${r.plan.length} scenes · placeholders: ${r.placeholders.length ? r.placeholders.join(", ") : "none"}`);
  console.log(`tools · ffmpeg: ${r.tools.ffmpeg ?? "not installed"} · blender: ${r.tools.blender ?? "not installed"} · chrome: ${r.tools.chrome ? "yes" : "no"}`);
  if (r.errors.length) {
    console.log(`\nFAILED: ${r.errors.length} error(s). Nothing was written.`);
    process.exit(1);
  }
  if (mode !== "check") console.log(`Wrote out/captions.srt (${r.cues} cues), out/plan.json, out/build-film.ps1${mode === "preview" ? ", PLACEHOLDER slates" : ""}.`);
  if (!r.tools.ffmpeg && mode !== "check") console.log("FFmpeg is not installed, so no MP4 was rendered.");
}
