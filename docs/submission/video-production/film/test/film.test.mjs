// Tests for the film builder. Run: node --test docs/submission/video-production/film/test/
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
  buildCues,
  checkVoiceover,
  chunks,
  HERE,
  lintClaims,
  loadManifest,
  MAX_LINE,
  MAX_LINES,
  run,
  toSrt,
  validateManifest,
  wavSeconds,
  words,
  wrap,
} from "../film.mjs";

const manifest = () => loadManifest(join(HERE, "manifest.json"));

/** Minimal 16-bit mono PCM WAV of the given length. */
function wav(seconds, rate = 8000) {
  const data = Math.round(seconds * rate) * 2;
  const b = Buffer.alloc(44 + data);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + data, 4);
  b.write("WAVE", 8);
  b.write("fmt ", 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(data, 40);
  return b;
}

/** A complete film folder: every asset file and a voice-over per scene. */
function fullFolder(m, voSeconds = (s) => s.seconds - 2) {
  const dir = mkdtempSync(join(tmpdir(), "jarvis-film-"));
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(m));
  for (const a of Object.values(m.assets)) {
    mkdirSync(join(dir, a.file, ".."), { recursive: true });
    writeFileSync(join(dir, a.file), "x");
  }
  mkdirSync(join(dir, "vo"));
  for (const s of m.scenes) writeFileSync(join(dir, "vo", `${s.id}.wav`), wav(voSeconds(s)));
  return dir;
}

describe("film manifest", () => {
  test("the shipped manifest is valid: 11 scenes, 210 s, narration within the word budget, labels present", () => {
    const m = manifest();
    assert.equal(m.scenes.length, 11);
    assert.equal(m.scenes.reduce((s, x) => s + x.seconds, 0), 210);
    assert.deepEqual(validateManifest(m), []);
    for (const id of ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "G1", "G2", "G3", "G4", "G5", "B1", "B2", "B4", "B5", "B6", "B7", "B8"]) assert.ok(m.assets[id], id);
  });

  test("durations that do not add up, and narration too long for its scene, are errors", () => {
    const m = manifest();
    m.scenes[0].seconds += 1;
    m.scenes[1].narration = "word ".repeat(80);
    const errors = validateManifest(m);
    assert.ok(errors.some((e) => /sum to 211s/.test(e)));
    assert.ok(errors.some((e) => /S02: narration has 80 words/.test(e)));
  });

  test("missing safety labels are errors", () => {
    const m = manifest();
    m.scenes.find((s) => s.id === "S06").onScreen = "Order 48291";
    assert.ok(validateManifest(m).some((e) => /S06: product footage needs/.test(e)));
  });
});

describe("claims lint", () => {
  const off = { gemmaLiveVerified: false };
  test("blocks real-money, self-hosted GPU, autonomous-assistant, Evolus and impact claims", () => {
    assert.ok(lintClaims("We refunded real money today.", off).length);
    assert.ok(lintClaims("It runs on our GPUs.", off).length);
    assert.ok(lintClaims("Inference on AMD Instinct MI300.", off).length);
    assert.ok(lintClaims("A fully autonomous agent runs your store.", off).length);
    assert.ok(lintClaims("Connected to Evolus.", off).length);
    assert.ok(lintClaims("It saved 40 hours a week.", off).length);
    assert.deepEqual(lintClaims("The simulated gateway refunds 89 dollars 99.", off), []);
  });

  test("a live Gemma claim is blocked until the flag says it was verified", () => {
    const claim = "Google's Gemma reads each request.";
    assert.ok(lintClaims(claim, off).some((p) => /Gemma/.test(p)));
    assert.deepEqual(lintClaims(claim, { gemmaLiveVerified: true }), []);
    assert.deepEqual(lintClaims("Gemma reads each request; that path is still being validated live.", off), []);
  });

  test("flipping gemmaLiveVerified switches scene 4 to its verified narration", () => {
    const m = manifest();
    const before = buildCues(m).filter((c) => c.scene === "S04").map((c) => c.lines.join(" ")).join(" ");
    m.flags.gemmaLiveVerified = true;
    const after = buildCues(m).filter((c) => c.scene === "S04").map((c) => c.lines.join(" ")).join(" ");
    assert.match(before, /still being validated/);
    assert.doesNotMatch(after, /still being validated/);
    assert.deepEqual(validateManifest(m), []);
  });
});

describe("captions", () => {
  test("lines never exceed 42 characters and cues never exceed two lines", () => {
    for (const c of buildCues(manifest())) {
      assert.ok(c.lines.length >= 1 && c.lines.length <= MAX_LINES, JSON.stringify(c));
      for (const l of c.lines) assert.ok(l.length <= MAX_LINE, l);
    }
    assert.deepEqual(wrap("a ".repeat(30).trim(), 10).every((l) => l.length <= 10), true);
    assert.ok(chunks("One. Two three.").length === 2);
  });

  test("cues are ordered, stay inside their scene, and every narration word is captioned", () => {
    const m = manifest();
    const cues = buildCues(m);
    let start = 0;
    for (const s of m.scenes) {
      const mine = cues.filter((c) => c.scene === s.id);
      for (const c of mine) {
        assert.ok(c.start >= start && c.end <= start + s.seconds && c.end > c.start, `${s.id} ${c.start}-${c.end}`);
      }
      assert.equal(mine.reduce((n, c) => n + words(c.lines.join(" ")), 0), words(s.narration));
      start += s.seconds;
    }
    for (let i = 1; i < cues.length; i++) assert.ok(cues[i].start >= cues[i - 1].end - 1e-9);
  });

  test("SRT format: numbered cues with HH:MM:SS,mmm timestamps", () => {
    const srt = toSrt(buildCues(manifest()));
    assert.match(srt, /^1\n00:00:00,200 --> 00:00:\d\d,\d{3}\n/);
    assert.match(srt, /\n00:03:\d\d,\d{3} --> 00:03:29,800\n/);
  });
});

describe("voice-over and release gating", () => {
  test("WAV duration is read from the header", () => {
    assert.equal(wavSeconds(wav(2.5)), 2.5);
    assert.equal(wavSeconds(Buffer.from("not a wav")), null);
  });

  test("a voice-over longer than its scene is an error in every mode (it would be truncated)", () => {
    const m = manifest();
    const dir = fullFolder(m, (s) => (s.id === "S03" ? s.seconds + 1 : s.seconds - 2));
    for (const mode of ["preview", "release"]) {
      assert.ok(checkVoiceover(m, dir, mode).errors.some((e) => /S03: voice-over is 15\.00s, scene is 14s/.test(e)));
    }
  });

  test("release fails without real product footage and voice-over", () => {
    const m = manifest();
    const dir = mkdtempSync(join(tmpdir(), "jarvis-film-empty-"));
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(m));
    const r = run("release", dir);
    assert.ok(r.errors.some((e) => /missing real product footage R1/.test(e)));
    assert.ok(r.errors.some((e) => /vo\/S01\.wav missing/.test(e)));
  });

  test("release passes with every asset and voice-over, writes captions, plan and build script, no placeholders", () => {
    const m = manifest();
    const dir = fullFolder(m);
    const r = run("release", dir);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.placeholders, []);
    const plan = JSON.parse(readFileSync(join(dir, "out", "plan.json"), "utf8"));
    assert.equal(plan.plan.reduce((s, x) => s + x.seconds, 0), 210);
    assert.match(readFileSync(join(dir, "out", "build-film.ps1"), "utf8"), /apad=whole_dur=16/);
    assert.match(readFileSync(join(dir, "out", "captions.srt"), "utf8"), /This is JARVIS\./);
  });

  test("preview marks missing product footage as PLACEHOLDER and uses real slides for missing illustrations", () => {
    const m = manifest();
    const dir = mkdtempSync(join(tmpdir(), "jarvis-film-preview-"));
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(m));
    mkdirSync(join(dir, "slides"));
    for (const id of ["S1", "S2", "S4", "S5", "S8", "S10"]) writeFileSync(join(dir, m.assets[id].file), "x");
    const r = run("check", dir);
    assert.ok(r.placeholders.includes("S05:R1"));
    assert.ok(!r.placeholders.some((p) => p.startsWith("S01")), "S01 uses its slide fallback");
    assert.equal(r.plan.find((s) => s.scene === "S01").sources[0].id, "S2");
  });
});
