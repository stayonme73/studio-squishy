# REVIEW-TEXT-TOOLS-INSPECT-1

**Status:** DEFINED · **INSPECTION NOT AUTHORIZED**  
**Type:** Inspection package definition (docs only until separately authorized)  
**Definition base / protected product tip:** `96b6a39606a7c9713327801f801d17b4c8c2068b`  
**Branch:** `fix/discovery-responsive-layout`  
**Active room:** Unified Review / Final / Delivery Room  
**Authority:** Working Protocol §1 room-completion rule (LOCKED 2026-08-01)  
**Prior sealed siblings:**  
- HIGHLIGHTER-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `96b6a39…`  
- VERSION-COMPARE-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `b0bd5e5…`  
- UPDATE-HISTORY-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `1e1308e…`

---

## Objective

Determine the **smallest truthful package or package sequence** needed to add:

1. **Page Tabs** — navigating or marking specific proof locations  
2. **Text Comment** — a distinct customer feedback tool inside **REVIEW TOOLS**

This is a **combined inspection** because Page Tabs and Text Comment share the same room-completion objective, Review-tool architecture surface, likely persistence authority, affected Review workspace files, and certification path. Splitting the inspection would duplicate archaeology.

**Construction combination remains undecided.** Combining construction is **not** assumed until inspection proves the boundaries truly match. If evidence shows separate packages are safer, report that honestly.

---

## Room-completion context

1. Customer Update History — **SEALED** · UPDATE-HISTORY-1 @ `1e1308e…`
2. VERSION-COMPARE-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `b0bd5e5…`
3. HIGHLIGHTER-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `96b6a39…`  
   *(carried limit: marks on version-bound `proof_markup_board_v1`, not pixels inside the source proof)*
4. **Page Tabs and Text Comment** ← **this inspection** (defined; inspection waits)
5. Remaining proof-rendering depth and prior certification limits
6. **UR-ROOM-CERT-1** — certify the room with explicit limits
7. Only then Payment room / Refund UI

Finishing Page Tabs and/or Text Comment alone does **not** finish the room while items 5–6 remain open.

---

## Shared business objective (why inspect together)

Both capabilities are listed inside the locked Unified Review / Final / Delivery room contract under **REVIEW TOOLS**, alongside Sticky Notes, Pencil, Highlighter, Voice Note, and Version Compare. Both exist to help the customer leave **location-aware, durable feedback** on recorded proof work before formal submission — without inventing a second feedback store or a Payment/Refund path.

Inspection must treat them as **room-completion work**, including dependencies on sealed Highlighter / Version Compare / Update History and on remaining proof-rendering honesty — not as isolated features.

---

## Locked inspection questions (when authorized)

Scout must answer from the repo, the locked room contract, and current proof architecture — **without inventing pages, sections, coordinates, tabs, comments, or file structure**:

1. What **Page Tabs** means in the locked room contract.
2. Whether tabs represent **pages**, **sections**, **proof files**, or **customer-created markers**.
3. Which current proof types have **stable page or section identities**.
4. Whether Page Tabs can function honestly on the current **`proof_markup_board_v1`** Highlighter surface — or whether that surface is insufficient / unrelated.
5. What **Text Comment** adds beyond existing **Sticky Notes**.
6. Whether Text Comment must bind to a **deliverable**, **proof version**, **tab/page**, **region**, and/or **section**.
7. Which existing **feedback authority** can persist both tools without creating another store.
8. Whether either tool consumes a **correction round** (drafting alone must not).
9. Whether Page Tabs and Text Comment **genuinely belong in one construction package**.
10. Remaining **proof-rendering blockers** and certification limits these tools expose.
11. Any overlap with the **113 unrelated dirty WIP** entries (report only — do not touch).

---

## Hard locks for this definition

| Lock | Rule |
|---|---|
| Combined inspection | Page Tabs + Text Comment inspected together |
| Construction combination | **Undecided** until inspection evidence |
| Page Tabs meaning | Resolved from locked contract + current proof architecture only |
| No invention | No invented page numbers, proof coordinates, tabs, comments, or file structure |
| Text Comment ≠ Sticky | Distinction must be explicit and evidence-based |
| Persistence | Prefer reusing existing job-review feedback authority where truthful |
| Correction rounds | Drafting with either tool must **not** consume a round alone (contract: drafting comments is free of round spend; formal submit consumes) |
| Highlighter surface | Do **not** redesign proof rendering; do **not** oversell `proof_markup_board_v1` as pixel overlay |
| Sealed work | Do not reopen sealed Version Compare, Highlighter, Update History, corrections, or issue reporting without contradictory evidence |
| Out of room | No Refund UI · no Payment work · no **UR-ROOM-CERT-1** in this inspection |
| Dirty WIP | Leave all **113** unrelated entries untouched |
| Scope of this docs package | Definition only — **no inspection run** and **no product construction** until separately authorized |

---

## Authorities to consult (read-only when inspection is authorized)

| Authority | Why |
|---|---|
| `UNIFIED-REVIEW-FINAL-DELIVERY-ROOM-CONTRACT-V1-LOCKED.md` | REVIEW TOOLS list · draft ≠ correction use · submission summary includes written comments |
| Job review feedback / session mapping | Sticky, voice, drawSections, highlights patterns |
| File / proof registry | Proof `id`, `versionLabel`, deliverable binding, file types |
| HIGHLIGHTER-1 sealed limit | `proof_markup_board_v1` is version-bound markup board, not source-proof pixels |
| VERSION-COMPARE-1 sealed limit | Metadata compare only |
| Correction ledger | Confirm draft tools do not spend rounds |
| Dirty tree | Overlap report only |

---

## Required inspection output (when authorized)

1. Repo verification (tip · sync · staging · dirty count)
2. Contract interpretation
3. Existing architecture and persistence map
4. Page Tabs meaning and truthful supported cases
5. Text Comment distinction from Sticky Notes
6. Missing versus underused machinery
7. Recommendation to **combine or separate** construction
8. Proposed package boundaries
9. Browser-certification plan
10. Risks, blockers, and explicit limits

---

## Hard exclusions

- No product or documentation edits during the **inspection** phase beyond what Tagia separately authorizes
- No staging, commit, push, cleanup, restore, or format of dirty WIP during inspection
- No proof-rendering redesign
- No Refund UI or Payment work
- No inventing page/tab/comment structure the repo does not support
- Do not reopen sealed VERSION-COMPARE-1, HIGHLIGHTER-1, UPDATE-HISTORY-1, C8a–C8e, correction accounting, handoff receipts, or ISSUE-ENTRY-1 without concrete contradictory evidence

---

## Authorization gates

### Docs definition (this package document)

Authorized for documentation updates that define **REVIEW-TEXT-TOOLS-INSPECT-1**. After this definition is sealed, **inspection remains blocked**.

### Inspection

Scout remains parked for inspection until Tagia explicitly says:

> **authorize REVIEW-TEXT-TOOLS-INSPECT-1**

### Construction

No construction package is opened by this definition. Any later Page Tabs / Text Comment construction requires:

1. Sealed inspection evidence  
2. Explicit Tagia construction authorization  
3. Clear combine-or-separate decision from that evidence  

Until then: definition may be sealed · open construction package **none** · open inspection package **none** · product code stays at protected tip `96b6a39606a7c9713327801f801d17b4c8c2068b`.
