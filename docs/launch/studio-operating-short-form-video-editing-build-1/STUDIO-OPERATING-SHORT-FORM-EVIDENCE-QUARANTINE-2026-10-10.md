# SHORT-FORM VIDEO EDITING — EVIDENCE QUARANTINE NOTE

**Date:** 2026-10-10  
**Applies to:** `live-proof/` evidence for the historical **$349** Short-Form certification freeze (`STUDIO-OPERATING-SHORT-FORM-VIDEO-EDITING-CERTIFICATION-FREEZE.md`, 2026-09-25)  
**Authorized by:** Tagia (owner), records-only  
**Authority:** `../studio-canonical-launch-truth-1/STUDIO-CANONICAL-LAUNCH-TRUTH.md`

## Verdict

**Evidence and documentation damage only. No product regression was found.**

- Production code was not changed by the event.
- The current customer delivery path still works. The three-package Short-Form project `route-proof-short-form-1791594132912` still serves 4 of 4 Final Delivery files after the event. Those files live on the paid project, not in this folder.
- **Exact byte identity of the historical certified revised delivery file can no longer be proven.**
- No checksum was ever recorded for that file, and none is claimed here.
- Evidence was **not** regenerated to conceal the loss. The files are left exactly as they are now.

The certification judgment is still documented: the freeze record, the Checkpoint 11 record, the stored probe and plan files, and the owner's acceptance are intact. Only the exact certified bytes are lost.

---

## Event 1 — 2026-10-10, accidental broad test run

An accidental broad test run executed `src/lib/studio-short-form-video-editing/caption-burn.local-proof.test.ts`. That test writes its output into this evidence folder. Between 07:01 and 07:03 local time it overwrote, in place:

| File | Role in the certification | Overwritten |
|---|---|---|
| `live-proof/revised-end-card-hold.mp4` | **The certified delivered file** named in `live-proof/FINAL-DELIVERY.md` and freeze line “Review + revision … 22.72s” | 07:02:57 |
| `live-proof/local-text-proof.mp4` | Checkpoint 11 local text proof (21.22s) | 07:02:12 |
| `live-proof/burn-work/` | 14 of 36 files (burned.mp4, burned-cued.mp4, cut.mp4, cap-0..2.png, cta-card.png, cta-card.png.line.png, end-card.mp4, end-card-audio.wav, end-cue.json, end-cue.wav, painted-words.json, speech.ass) | 07:01–07:02 |
| `live-proof/burn-work-revision/` | All 14 files (same names) | 07:02 |

The 22 older debug files in `burn-work/` (`probe-*`, `cap-0.txt`, `cta.ass`) were not touched.

What the regenerated `revised-end-card-hold.mp4` shows now: 1080×1920, 22.72 seconds. That matches the certified file's recorded shape. It does **not** prove the bytes are the same.

Why identity cannot be proven:

- `live-proof/` was never committed to git. There is no history copy.
- None of the other 14 git worktrees, including the main repository, holds a copy.
- The $349 certification delivery was a local proof file, not a customer project record. There is no delivery-store copy.
- `FINAL-DELIVERY.md` and the freeze record name the file and its length but record no checksum.
- The only recorded checksum belongs to the Shotstack Production render `f14535a6` (the first-review cut, not the revised delivered file). That render is not stored locally. Whether Shotstack still hosts it was not checked.

## Event 2 — 2026-09-25, older first-review inconsistency (separate)

`live-proof/edited-talking-head.mp4` is listed in `FINAL-DELIVERY.md` as the first-review version, Production `f14535a6`. Its current bytes do **not** match the checksum recorded for `f14535a6` in the Checkpoint 11 record.

That file was rewritten on 2026-09-25 at 21:28 local time, together with six other files in this folder (`editorial-brief.json`, `edl-plan.json`, `finishing-preflight.json`, `audio-handoff-preflight.json`, `exact-text-qa.json`, `spend.json`). That was about 14 hours after the freeze was written (07:12), during the work-log window “349 live paid staging pass” (`STUDIO-OPERATING-SHORT-FORM-VIDEO-EDITING-LAUNCH-NOW-INTEGRATION-1`, 01:16–01:31 UTC on 2026-09-26). That run most likely wrote a newer render over the first-review file. This event pre-dates 2026-10-10 and is not caused by the broad test run.

---

## Rules from here

- Treat `live-proof/revised-end-card-hold.mp4`, `live-proof/local-text-proof.mp4`, `live-proof/edited-talking-head.mp4`, and the overwritten `burn-work*` files as **regenerated copies, not certified evidence**.
- Do not regenerate, replace, or “restore” them.
- Do not delete them.
- The historical $349 freeze stands as a historical owner decision with this evidence limit.
- The three-package **$249** Short-Form record does not rely on this folder.
- Keep evidence-writing local-proof tests from writing into certified evidence folders. That is an engineering item, not fixed here.
