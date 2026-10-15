# Video production package (Gemini + Blender)

A 3:40 cinematic product video that mixes **two kinds of footage**, always labelled:

| Kind | What it is | On-screen marker |
|---|---|---|
| **PRODUCT** | Real screen recordings of the running JARVIS app and backend | Small lower-third: "Live product footage" (plus "Simulated payments" where money appears) |
| **VISUAL** | Blender / Gemini motion graphics that explain an idea | Small lower-third: "Illustration" |

Rule: a VISUAL shot may explain what the product does, but it must never look like a JARVIS screen, show a fake UI, or show a result the product did not produce. Any outcome shown (RESOLVED, ESCALATED, $89.99, 0 unsafe, 26/30) must come from a PRODUCT shot or from `docs/submission/EVIDENCE_SUMMARY.md`.

| File | Contents |
|---|---|
| `STORYBOARD.md` | Scene-by-scene storyboard, narration, and the final edit sequence with timestamps |
| `BLENDER_SHOT_LIST.md` | Motion-graphics shots, styles, durations and handoff specs |
| `FOOTAGE_AND_ASSETS.md` | The real screen recordings to capture, and the screenshots and diagrams already in the repo |
| `CLAIMS_CHECKLIST.md` | Every on-screen text and spoken claim with its evidence, plus words to avoid |
| `blender/jarvis_pipeline_scene.py` | Optional Blender script that builds the pipeline animation (shot B4). **Untested: Blender is not installed on this PC** |

Status on 15 Oct 2026: Blender, ffmpeg and OBS are not installed on the owner's PC. No video file exists yet.
