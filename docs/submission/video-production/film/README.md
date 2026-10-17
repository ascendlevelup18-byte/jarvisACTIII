# JARVIS ACT III — The Verified Action (film build)

A 3:30 (210 s), 11-scene edit defined in `manifest.json`. `film.mjs` checks it, writes captions and an edit plan, and refuses a release build that is missing real product footage or voice-over.

```powershell
cd C:\jarvis-actiii-preview\docs\submission\video-production\film
node film.mjs check      # manifest, durations, word budgets, claims lint, labels (writes nothing)
node film.mjs preview    # out/captions.srt, out/plan.json, out/build-film.ps1, PLACEHOLDER slates for missing footage
node film.mjs release    # same, but fails unless R1–R7 and vo/S01–S11.wav exist and fit their scenes
node --test test\film.test.mjs
```

What the checks guarantee:
- Scene durations add up to exactly 210 s; narration stays under 2.5 words/s.
- Claims lint blocks real-money, self-hosted-GPU, autonomous-assistant, Evolus and impact claims, and any live Gemma claim while `flags.gemmaLiveVerified` is `false`. Set it to `true` only after a successful live Gemma run; scene 4 then switches to its verified narration.
- Product scenes carry "Live product footage", money scenes carry "simulated", illustration scenes carry "Illustration".
- Captions: at most 2 lines of 42 characters, timed inside their scene.
- A voice-over longer than its scene is an error in every mode, so narration can never be silently cut.
- Release mode never uses a placeholder. Preview slates say "PLACEHOLDER · NOT FOR RELEASE".

## Files you add

| Folder | Files | How |
|---|---|---|
| `assets/` | `R1_dashboard.mp4` … `R7_live_model.mp4` (names in `manifest.json`) | Real screen recordings (see `../FOOTAGE_AND_ASSETS.md` and `../../recording/RECORDING_SCRIPT.md`) |
| `assets/` | `G1…G5`, `B1…B8` `.mp4` (optional) | Gemini and Blender clips; when missing, the matching deck slide is used |
| `vo/` | `S01.wav` … `S11.wav` | One narration take per scene, each shorter than its scene |
| `slides/` | generated | `preview`/`release` export deck slides with Chrome |

## Windows recording workflow

1. Stop any fixture API on port 3000. Start the live API in its own Windows PowerShell (key only at the hidden prompt; no `Start-Transcript`):
   `cd C:\jarvis-actiii-preview; Set-ExecutionPolicy -Scope Process Bypass -Force; & .\docs\submission\recording\start-live-api.ps1`
   (add `-UnderstandingModel Gemma-4-31B-IT -TimeoutMs 90000` only after the Gemma live gate has passed).
2. Second window: `npm run web:dev`; open http://127.0.0.1:43123 in a clean browser at 1920×1080, 100% zoom.
3. Record R1–R7 with Xbox Game Bar (Win+Alt+R) or OBS. Save them into `assets/` with the manifest names.
4. Record narration per scene (Audacity or any recorder that exports WAV), read from `manifest.json`, into `vo/`.
5. `node film.mjs release`. Fix every ERROR it prints.
6. Edit: with FFmpeg installed run `out\build-film.ps1` (untested until FFmpeg is installed). Without FFmpeg, use Clipchamp (built into Windows 11): place clips in the order and lengths from `out/plan.json`, import `out/captions.srt`, export 1080p MP4.
7. Watch the MP4 once fully. Tick `../CLAIMS_CHECKLIST.md`.

Tool status on 15 Oct 2026: FFmpeg, Blender and OBS are not installed; Chrome is (used for slates and slides). No MP4 has been rendered.
