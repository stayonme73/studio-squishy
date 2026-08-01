# VERSION-COMPARE-1

**Status:** DEFINED · **CONSTRUCTION NOT AUTHORIZED**  
**Type:** Construction package definition (docs only until separately authorized)  
**Definition base / protected tip at draft:** `29397b36141d92082f1a73d9cf8656111d3f827f`  
**Branch:** `fix/discovery-responsive-layout`  
**Active room:** Unified Review / Final / Delivery Room  
**Authority:** Working Protocol §1 room-completion rule (LOCKED 2026-08-01)  
**Prior inspection:** HIGHLIGHTER-COMPARE-INSPECT-1 — **COMPLETE / CLOSED** (inspection only; no product construction)

---

## Objective

Deliver the smallest truthful **Version Compare** capability required to advance Unified Review / Final / Delivery room completion.

Version Compare is **version navigation and presentation** over existing proof records. It is **not** Highlighter, not automated diffing, and not a second version ledger.

---

## Why this package is separate from Highlighter

| Package | Architecture |
|---|---|
| **VERSION-COMPARE-1** | Reads existing proof files, registry IDs, `versionLabel`, timestamps, and release linkage; presents two recorded versions |
| **HIGHLIGHTER-1** (later) | Introduces a new feedback tool; requires an owner persistence decision (geometry vs section-only) |

They share the same **room-completion sequence**, not the same commit or construction authorization.

---

## Room-completion sequence (honest path)

1. Customer Update History — **SEALED** · UPDATE-HISTORY-1 @ `1e1308e…`
2. **VERSION-COMPARE-1** ← this package (defined; construction waits)
3. **HIGHLIGHTER-1** (separate definition + authorization)
4. Page Tabs and Text Comment — assessment / construction
5. Remaining proof-rendering depth and prior certification limits
6. **UR-ROOM-CERT-1** — certify the room with explicit limits
7. Only then Payment room / Refund UI

Finishing Version Compare alone does **not** finish the room. Finishing Version Compare + Highlighter also does **not** finish the room while Page Tabs, Text Comment, proof-rendering depth, and cert limits remain open.

---

## In scope (when construction is later authorized)

1. Customer can see **recorded proof versions** for **one deliverable**.
2. Customer can **select two** recorded versions (current and prior) from existing proof records for that deliverable.
3. Both versions are presented clearly for **side-by-side comparison** when comparison is supported.
4. Labels, dates, file references, and release identity come **only** from persisted authorities:
   - `StudioFileReference` / proof file records (`id`, `versionLabel`, timestamps, `accessHref` / storage refs as already exposed)
   - release linkage already recorded (`releaseActivityId` / related activity where present)
5. Comparison UI is available **only when at least two legitimate proofs exist** for that deliverable.
6. When comparison cannot be supported (fewer than two valid proofs, or presentation cannot truthfully show both), show an **honest unavailable** state — no invented second version.
7. **Review-first.** Final / Delivery access remains **out of scope** unless implementation inspection proves a truthful **read-only** extension without inventing review tools there.
8. Update History may provide an **entry point** into compare, but UPDATE-HISTORY-1 behavior and projection remain **unchanged**.

---

## Hard exclusions

- No pixel diff, text diff, automatic “changes detected,” or invented lineage / parent-child version graph
- No second version store or synthetic version records
- No Highlighter tool or highlighter persistence work
- No Page Tabs, Text Comment, Refund UI, or Payment work
- Do not reopen sealed UPDATE-HISTORY-1, C8a–C8e, correction accounting, handoff receipts, or ISSUE-ENTRY-1 without concrete contradictory evidence
- Do not alter correction-round consumption rules (browsing versions must not consume a correction round — per room contract)
- Leave all unrelated dirty WIP entries untouched (expected **113** at definition time)
- No product edits until Tagia explicitly authorizes **VERSION-COMPARE-1 construction**

---

## Authorities to reuse (do not replace)

| Authority | Role |
|---|---|
| File registry / proof files | Version labels, file ids, types, timestamps, access refs |
| Review room view / deliverable proofs | Deliverable-scoped proof lists already shown to customers |
| Release / activity linkage | Release identity where already persisted |
| Customer Update History | Optional entry point only — sealed projection untouched |
| Correction ledger / handoff receipts | Preserve; do not rewrite for compare |
| Unified room contract | Version Compare is a REVIEW TOOLS capability |

---

## Certification expectations (construction phase)

When construction is authorized, plan:

- **Unit:** selection rules (≥2 proofs); unavailable when fewer than 2; no invented labels
- **Integration:** correction accounting and locked packages unchanged by browse/select
- **Browser:** Review desktop + phone; honest unavailable state; Final/Delivery only if a proven read-only extension is included and limited
- **Evidence:** screenshots of two labeled versions presented side-by-side from real proof records

Exact harness paths are chosen during construction — not invented in this definition.

---

## Authorization gates

### Docs definition (this package document)

Authorized for documentation updates that define VERSION-COMPARE-1. After seal, construction remains blocked.

### Construction

Scout remains parked for product work until Tagia explicitly says:

> **authorize VERSION-COMPARE-1 construction**

Until then: definition may be sealed · open construction package **none** · product code stays at the protected tip.
