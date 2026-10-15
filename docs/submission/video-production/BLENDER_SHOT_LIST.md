# Blender motion-graphics shot list

Style: flat, calm, product-explainer. Palette from the deck: navy `#0B1220` background, teal `#0F766E` / `#5EEAD4` for deterministic code, violet `#C7D2FE` / `#6A52C9` for AI, amber `#B45309` for warnings, green `#15803D` for verified. Typeface: Inter or Segoe UI. No photoreal people, no fake product screens, no AMD logos (use plain text "AMD hosted inference" unless you have permission to use brand assets).

Render: 1920×1080, 30 fps, PNG sequence or ProRes/H.264, transparent background where noted. Every shot gets the "Illustration" lower-third in the edit.

| ID | Duration | Shot | Motion | Notes |
|---|---|---|---|---|
| B1 | 12 s | Identity | Abstract order cards drift right to left; one tile flips to show "charged twice"; cards converge into the "JARVIS Automations" wordmark | Ends on wordmark, hold 2 s |
| B2 | 18 s | Problem | Two identical charge tiles "$89.99"; a refund arrow wavers between them; a large "$5,000" tile slides in with a glitch; all three tint amber | Text callouts: "wrong charge", "twice", "typed amount" |
| B3 | — | (reserved) | — | — |
| B4 | 17 s | Pipeline | Seven rounded blocks in a row light up left to right: Understand (violet), Evidence (teal), Propose (violet), Policy (teal), Revalidate (teal), Execute (teal), Verify (green). A small padlock sits on the Execute block until Policy lights | `blender/jarvis_pipeline_scene.py` builds this scene |
| B5 | 8 s | Shield | The "$5,000" tile approaches the Execute block; a teal shield closes; tile fades; counter "Money moved: $0.00" | Use only after the real #48294 result is shown |
| B6 | 10 s | AMD inference | Request packets travel from a "JARVIS API" node to an "AMD hosted inference · DeepSeek-V4-Flash" node and back as a JSON tile that passes through a "schema check" gate | No GPU racks: hardware is not self-hosted |
| B7 | 15 s | Architecture (optional) | Three columns assemble: Backend, AI layer, Workspace and evidence (same content as slide 9) | Can be replaced by slide 9 |
| B8 | 10 s | Close | Wordmark; tagline types on: "AI proposes. Policy decides. Every refund is verified." | Hold last 3 s for end card |

Handoff to the editor: one folder per shot (`B1/`, `B2/`...), a 2-second handle at each end, and a `notes.txt` with the frame rate.
