# Conversation Room — Preservation Slices Certification Evidence

**Purpose:** Record live certification evidence for preservation slices that protect Conversation Room / Lobby launch work.  
**Rule:** Chat is not the evidence ledger. Update this file when certification status changes.

---

## Protected tip

| Field | Value |
|-------|--------|
| Tip (short) | `fc110ec` |
| Tip (full) | `fc110ec9d67ef1503fc290fdbcb2666bc885f7ed` |
| Branch | `fix/discovery-responsive-layout` |
| Local / remote | Synced at tip above when this evidence was recorded |

---

## Certification date

**2026-07-22** — live phone / desktop / audio certification of Slices 2–5 (dev server + browser restored).

No product code was changed during that certification pass.

---

## Slice → commit map

| Slice | Title | Commit | Notes |
|-------|--------|--------|--------|
| 1 | Legacy Host doors → Conversation Room | `1d86bea` (+ residue `1748a87` Intake route seal) | Preserved and pushed earlier; not re-run in the 2026-07-22 live pass |
| 2 | Phone tablet above controls | `cc80d94` | Live-certified 2026-07-22 |
| 3 | Voice On/Off narration gate | `b13fe75` | Live-certified 2026-07-22 |
| 4 | Lobby lounge + Entry Film sole front door | `3355902` | Live-certified 2026-07-22 |
| 5 | Route honesty copy | `fc110ec` | Live-certified 2026-07-22 |

---

## Live results — Slices 2–5 (2026-07-22)

| Slice | Phone | Desktop | Audio | Verdict |
|-------|-------|---------|-------|---------|
| 2 | **PASS** — tablet above controls (`surfaceStack` order 1 / `sideRail` order 2) | n/a for phone-order scope | n/a | **PASS** |
| 3 | **PASS** — first-entry choice + Voice: On / Off | **PASS** | **PASS** — On started TTS; Off cancelled; mic remained | **PASS** |
| 4 | **PASS** — Entry Film + lounge asset in DOM | **PASS** — lounge + Entry Film on `/` and `/studio-lobby`; Let’s Get Started → CR | Lobby silence observed (not deeply instrumented) | **PASS** |
| 5 | **PASS** — honesty copy on Choose Your Route | **PASS** — Suggested starting point; no strongest match / best route / Recommended badge | n/a | **PASS** |

**Overall (Slices 2–5): PASS**

---

## Caveats (not fixed in certification)

1. **Hydration overlay** — Next.js “1 Issue” / hydration error overlay appeared during Lobby and Conversation Room loads. Logged as a separate launch-risk investigation. Not folded into any feature slice.
2. **Lobby silence** — Lobby remained silent in observation; audio was not deeply instrumented on the Lobby surface.

---

## Scope statements

- No product code was changed during certification.
- This document is the evidence ledger for these preservation slices; chat is not the evidence ledger.
- Remaining dirty / uncertified themes (including completed-journey / black-tablet reset, Runtime mixed hunks, presence extras, sign-in backdrop, browser Voice / audition, Owner QA tooling, orphan `MobileStudioEntry`, podium presence hooks) stay **out of scope** here and are **not** marked passed.
