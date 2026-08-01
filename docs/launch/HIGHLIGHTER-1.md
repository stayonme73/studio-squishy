# HIGHLIGHTER-1

**Status:** SEALED · BROWSER-CERTIFIED WITH LIMITS  
**Type:** Construction package (sealed)  
**Sealed tip:** `96b6a39606a7c9713327801f801d17b4c8c2068b`  
**Branch:** `fix/discovery-responsive-layout`  
**Active room:** Unified Review / Final / Delivery Room  
**Authority:** Working Protocol §1 room-completion rule (LOCKED 2026-08-01)  
**Prior inspection:** HIGHLIGHTER-COMPARE-INSPECT-1 — **COMPLETE / CLOSED**  
**Prior sealed sibling:** VERSION-COMPARE-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `b0bd5e5…`

**Carried truth lock:** Highlights live on version-bound `proof_markup_board_v1`, not on pixels inside the source proof.

---

## Objective

Deliver the smallest truthful **Highlighter** capability required to advance Unified Review / Final / Delivery room completion.

Highlighter is a **customer visual markup tool** for recorded proof versions. It is **not** Pencil/Draw, not Version Compare, and not automated change detection.

---

## Why this package is separate from Version Compare and Pencil

| Capability | Architecture |
|---|---|
| **VERSION-COMPARE-1** (sealed) | Reads existing proofs; presents two recorded versions side by side (metadata) |
| **Pencil / Draw** (existing) | Ephemeral canvas strokes; only section keys persisted (`drawSections`) — **not** Highlighter |
| **HIGHLIGHTER-1** | New feedback tool; preferred persistence is **geometry tied to a selected proof file/version** |

They share the same **room-completion sequence**, not the same construction package.

---

## Room-completion sequence (honest path)

1. Customer Update History — **SEALED** · UPDATE-HISTORY-1 @ `1e1308e…`
2. VERSION-COMPARE-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `b0bd5e5…`
3. **HIGHLIGHTER-1** ← this package — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `96b6a39…`
4. REVIEW-TEXT-TOOLS-INSPECT-1 — **COMPLETE / CLOSED**
5. TEXT-COMMENT-1 — defined · construction waits
6. PAGE-TABS-1 — deferred
7. Remaining proof-rendering depth and prior certification limits
8. **UR-ROOM-CERT-1** — certify the room with explicit limits
9. Only then Payment room / Refund UI

Finishing Highlighter alone does **not** finish the room.

---

## Persistence decision (LOCKED for this definition)

**Preferred model:** persist **actual highlight geometry** tied to a **specific deliverable** and **selected proof file/version** (registry proof `id` + `versionLabel` / recorded identity).

**Rejected as insufficient for this package:** section-level-only indication (“this section was highlighted”) without geometry — that repeats the Pencil weakness where the system remembers that drawing happened but not what was drawn.

**Honest-preview rule:** Do **not** invent proof coordinates or overlay geometry where the current Review preview cannot truthfully support them. If the focused surface cannot host real geometry against a recorded proof presentation, construction must stop and report the gap — or ship an honest unavailable / deferred state — rather than fake placement.

---

## In scope (when construction is later authorized)

1. Highlighter is a **distinct REVIEW TOOLS entry**, separate from Pencil/Draw, Sticky, Voice, and Version Compare.
2. Customer can highlight while reviewing a **specific deliverable** bound to a **selected recorded proof version**.
3. Persisted highlights store geometry + proof identity (and deliverable key) so locked feedback packages retain what was marked.
4. Drafting or saving highlights **does not consume a correction round by itself** (per unified-room contract: drafting highlights is free of correction-round spend).
5. **Review-first.** Final / Delivery remain out of scope unless a truthful **read-only** extension is proven without inventing Review tools there.
6. Preserve sealed Version Compare, Update History, correction accounting, review feedback packages, handoff receipts, and room navigation — do not reopen them without contradictory evidence.

---

## Hard exclusions

- No fake pixel diff, text diff, or automatic “changes detected”
- No collapsing Highlighter into Pencil/Draw
- No inventing proof coordinates the preview cannot support
- No Page Tabs, Text Comment, Refund UI, Payment work, or **UR-ROOM-CERT-1** (final room certification)
- Do not reopen sealed VERSION-COMPARE-1, UPDATE-HISTORY-1, C8a–C8e, correction accounting, handoff receipts, or ISSUE-ENTRY-1 without concrete contradictory evidence
- Leave all unrelated dirty WIP entries untouched (expected **113** at definition time)
- No product edits until Tagia explicitly authorizes **HIGHLIGHTER-1 construction**

---

## Authorities to reuse (do not replace)

| Authority | Role |
|---|---|
| Proof / file registry | Proof `id`, `versionLabel`, deliverable key, access refs |
| Job review feedback | Sticky / voice / drawSections patterns; extend carefully for highlight records |
| Correction ledger | Unchanged — highlighter drafting must not spend rounds alone |
| Version Compare | Sealed sibling; may help select which proof is marked — do not rewrite |
| Update History / handoff receipts | Preserve |

---

## Certification expectations (construction phase)

When construction is authorized, plan:

- **Unit:** geometry + proof-id binding; no invented coordinates; correction rounds unchanged by highlight-only drafts
- **Integration:** locked packages retain highlights; Pencil remains distinct; Version Compare still works
- **Browser:** Review desktop + phone; honest unavailable when geometry cannot be hosted; Final/Delivery only if proven read-only extension
- **Evidence:** screenshots of highlight on a selected proof version; copy never claims automated change detection

Exact harness paths are chosen during construction — not invented in this definition.

---

## Authorization gates

### Sealed construction

HIGHLIGHTER-1 construction is **complete and sealed** at `96b6a39606a7c9713327801f801d17b4c8c2068b`. Do not reopen without contradictory evidence.

**Next room package:** [`TEXT-COMMENT-1.md`](./TEXT-COMMENT-1.md) (defined; construction not authorized). PAGE-TABS-1 deferred.
