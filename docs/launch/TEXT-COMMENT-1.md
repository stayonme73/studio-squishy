# TEXT-COMMENT-1

**Status:** SEALED · BROWSER-CERTIFIED WITH LIMITS  
**Type:** Construction package (sealed)  
**Sealed tip:** `071c2b14c41ace29e3bc8ab2b58d80b73caf08a1`  
**Branch:** `fix/discovery-responsive-layout`  
**Active room:** Unified Review / Final / Delivery Room  
**Authority:** Working Protocol §1 room-completion rule (LOCKED 2026-08-01)  
**Prior inspection:** REVIEW-TEXT-TOOLS-INSPECT-1 — **COMPLETE / CLOSED**  
**Deferred sibling:** PAGE-TABS-1 — deferred pending truthful page/location identity (or explicit Tagia remap that does not invent document pages)

**Carried truth lock:** Text Comment stores what the customer wrote about a specific recorded proof version. It does not claim a location inside the proof itself.

---

## Objective

Deliver the smallest truthful **Text Comment** capability required to advance Unified Review / Final / Delivery room completion.

Text Comment is a **customer written-comment tool** bound to a recorded proof version. It is **not** Sticky Notes, not Page Tabs, not Highlighter geometry, and not a proof-rendering redesign.

---

## Why this package is separate from Sticky Notes and Page Tabs

| Capability | Architecture |
|---|---|
| **Sticky Notes** (existing) | Colored note bound to **deliverable / section** only — not proof-version bound |
| **PAGE-TABS-1** (deferred) | Needs real page/location identity or an explicit non-page remap — **out of this package** |
| **HIGHLIGHTER-1** (sealed) | Geometry on version-bound `proof_markup_board_v1` — not this package |
| **TEXT-COMMENT-1** | Written comment bound to **job + deliverable + proof file + recorded version label** — **no geometry in this slice** |

Owner decision after REVIEW-TEXT-TOOLS-INSPECT-1: **inspect together, build separately.** Text Comment proceeds now; Page Tabs wait.

---

## Room-completion sequence (honest path)

1. Customer Update History — **SEALED** · UPDATE-HISTORY-1 @ `1e1308e…`
2. VERSION-COMPARE-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `b0bd5e5…`
3. HIGHLIGHTER-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `96b6a39…`
4. REVIEW-TEXT-TOOLS-INSPECT-1 — **COMPLETE / CLOSED**
5. **TEXT-COMMENT-1** ← this package — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `071c2b1…`
6. **PAGE-TABS-1** — deferred (not this package)
7. Proof-rendering + remaining certification limits — **UR-PROOF-READINESS-INSPECT-1**
8. **UR-ROOM-CERT-1** — certify the room with explicit limits
9. Only then Payment room / Refund UI

Finishing Text Comment alone does **not** finish the room while Page Tabs (deferred), proof-rendering limits, and UR-ROOM-CERT-1 remain open.

---

## Persistence and binding (LOCKED for this definition)

**Authority:** extend existing **`JobReviewFeedback`** (tasks envelope) via the current `save_feedback` path. Do **not** invent a second feedback store.

**Each comment binds to:**

| Field | Required |
|---|---|
| Job | Yes |
| Deliverable | Yes |
| Proof file identity (`proofFileId` / registry id) | Yes |
| Recorded version label (`versionLabel`) | Yes |

**First-slice content:** written comment text (+ stable id + timestamps as needed for package lock).

**Rejected for this package:**

- Invented page numbers, section-within-proof IDs, region/pixel coordinates, or board geometry  
- Collapsing Sticky into Text Comment (or renaming Sticky)  
- Treating proof-file selectors as “pages”

**Honest first implementation:** a written comment attached to a recorded proof version — without pretending it points to exact pixels or a document page. Region anchoring is a **later refinement** if proof rendering gains truthful coordinates — not in TEXT-COMMENT-1.

**Isolation:** comments for one deliverable / proof file / version must not leak into another.

---

## In scope (when construction is later authorized)

1. Text Comment is a **distinct REVIEW TOOLS entry**, separate from Sticky, Pencil, Voice, Highlighter, Version Compare, and Page Tabs.
2. Customer can add / edit / clear draft comments while reviewing a focused deliverable with a selected recorded proof version.
3. Persisted comments retain job + deliverable + proof file + version label so locked feedback packages keep what was written.
4. Drafting or saving comments **does not consume a correction round by itself** (unified-room contract: drafting comments is free of round spend; formal revision submit consumes).
5. Submission / handoff summaries may count **written comments** only where existing persisted `JobReviewFeedback` data truthfully supports it — do not invent counts.
6. **Review-only editing.** Final / Delivery must not expose Text Comment editing tools.
7. Preserve Sticky, Pencil, Voice, Highlighter, Version Compare, Update History, correction accounting, handoff receipts, Project Communication, and room navigation — do not reopen sealed packages without contradictory evidence.

---

## Hard exclusions

- No Page Tabs
- No invented pages, sections-within-proof, regions, or pixel coordinates
- No geometry requirement in this package
- No proof-rendering redesign
- No collapsing Sticky into Text Comment
- No Refund UI or Payment work
- No Final / Delivery editing tools
- No **UR-ROOM-CERT-1** (final room certification) in this package
- Do not reopen sealed VERSION-COMPARE-1, HIGHLIGHTER-1, UPDATE-HISTORY-1, C8a–C8e, correction accounting, handoff receipts, or ISSUE-ENTRY-1 without concrete contradictory evidence
- Leave all unrelated dirty WIP entries untouched (expected **113** at definition time)
- No product edits until Tagia explicitly authorizes **TEXT-COMMENT-1 construction**

---

## Authorities to reuse (do not replace)

| Authority | Role |
|---|---|
| Proof / file registry | Proof `id`, `versionLabel`, deliverable key |
| Job review feedback | Sticky / voice / highlights patterns; extend carefully for text-comment records |
| Correction ledger | Unchanged — text-comment drafting must not spend rounds alone |
| Version Compare / Highlighter | Sealed siblings; proof selection patterns may inform UX — do not rewrite sealed behavior |
| Update History / handoff receipts | Preserve; extend written-comment inventory only when data truthfully exists |

---

## Certification expectations (construction phase)

When construction is authorized, plan:

- **Unit:** binding to job + deliverable + proof + version; isolation; `save_feedback` does not append correction uses  
- **Integration:** locked packages retain comments; Sticky remains distinct; Highlighter / Compare / Update History intact  
- **Browser:** Review desktop + phone; no leak across deliverable/proof/version; Final/Delivery have no Text Comment edit control; draft leaves correction counter unchanged  
- **Evidence:** screenshots of proof-version-bound comment; copy never claims page/pixel anchoring  

Exact harness paths are chosen during construction — not invented in this definition.

---

## Authorization gates

### Docs definition (this package document)

Authorized for documentation updates that define TEXT-COMMENT-1. After seal, construction remains blocked.

### Construction

Scout remains parked for product work until Tagia explicitly says:

> **authorize TEXT-COMMENT-1 construction**

Until then: definition may be sealed · open construction package **none** · product code stays at protected tip `36c3468873373ccffb87801edcd45f5ef6168888`.
