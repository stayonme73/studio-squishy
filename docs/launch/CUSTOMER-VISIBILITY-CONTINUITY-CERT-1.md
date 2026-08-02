# CUSTOMER-VISIBILITY-CONTINUITY-CERT-1

**Status:** SEALED · **BROWSER-CERTIFIED** (clean branch; await stage/commit/transfer/push)  
**Type:** Combined customer-facing visibility + continuity certification (Gates #6 / #8 / #14)  
**Protected starting tip:** `4751ad11ff4f4580deb9717e1d9529a89673a7f6`  
**Product tip:** `58afd0e` — `feat: add Studio Board customer visibility continuity panel`  
**Worktree branch:** `cert/customer-visibility-continuity-1`  
**Clean worktree:** `C:\Users\tagia\studio-squishy-customer-visibility-continuity`  
**Authority:** AUTHORIZE CUSTOMER-VISIBILITY-CONTINUITY-CERT-1  
**Classification review:** Tagia accepted gate-definition reclassification (2026-08-02) — COMPLETE for #6 / #8 / #14  

---

## Accepted result

| Field | Value |
|---|---|
| Outcome | **BROWSER-CERTIFIED** |
| Browser matrix | **90 PASS / 0 FAIL / 2 LIMIT** (desktop 1440 · phone 390) — LIMIT rows disclose cross-device not claimed; not a gate hold |
| Focused unit | **7/7 PASS** (`customer-visibility-continuity`) · related Board/next-action/client-copy/working-draft **24/24** in focused batch |
| Auth regression note | `account-creation` staff-seed assertion failure is **pre-existing / environment** (dev seed pollution) — not introduced by this package |
| Production build | **Attempted** — failed on tip TypeScript baseline (`DiscoveryPresentationView.tsx` DiscoveryTabletStepId) — **recorded separately**; not introduced by this package |
| Payment/refund | **Not reopened** |
| Main worktree WIP | **Untouched** (107) |

Harness: `scripts/cert-customer-visibility-continuity-1.mjs`  
Local artifacts: `test-artifacts/customer-visibility-continuity-1/` (do not commit)

---

## Shared customer-state contract

`resolveCustomerVisibilityContinuityView` (`src/lib/customer-visibility-continuity.ts`) composes existing authorities into one Board story:

| Question | Authority |
|---|---|
| What we need from you | Intake completeness · materials still-needed labels · waiting-on-client jobs |
| What The Studio is working on | Board next-action lead / status |
| Next step | `resolveBoardNextActionPresentation` |
| Who acts next | Derived from customer CTA / materials blocking / waiting-on-client / incomplete intake |
| Target or checkpoint | `campaign.targetCompletionDate` when set; else truthful checkpoint / **Not set yet** |
| Risks or blockers | Incomplete intake · materials blocking · waiting-on-client · or **No risk or blocker is recorded** |
| Received / complete | Materials received labels + Project Intake submitted note when complete |

No second persistence ledger. No invented dates, ETAs, or file receipts.

Studio Board presents this as **Project status** (`CustomerVisibilityContinuityPanel`) above the existing next-action control.

---

## Gate verdicts (accepted)

Classified against **published Hierarchy H gate definitions**, not against imaginable V2 work.

| Gate | Verdict | Rationale |
|---|---|---|
| **#6** Progress survives navigation and return | **COMPLETE** | Same-browser/session return (refresh · Lobby · Review/Final/Delivery · sign-out/sign-in) satisfies the published Customer-One gate. Cross-device persistence is a future enhancement, not a gate requirement. |
| **#8** Customer can see what is needed | **COMPLETE** | Customer can truthfully see what is needed, what has been received, who acts next, and what happens next. Materials Decision #2 is product evolution / Board parking, not a Gate #8 launch requirement. |
| **#14** Deadlines and risks are visible | **COMPLETE** | Authoritative target date or truthful not-set/checkpoint, plus real blockers or honest none-recorded, satisfy the gate. Predictive risk / ETA intelligence is beyond the published requirement. |

### Classification review (CWL → COMPLETE)

The first-pass **COMPLETE WITH LIMITS** recommendation was **superseded** by a read-only gate-definition review. Remaining deferred items (cross-device continuity, Materials Decision #2, predictive deadline/risk intelligence) were determined to be **outside the published Customer-One gate scope**, not missing launch requirements.

This reclassification is **not** based on functionality added after inspection. Product construction and browser evidence already satisfied the published gates; the review corrected over-conservative engineering caution (“what could still be added?”) against the certification standard (“what does the gate actually require?”).

| Gate | First pass | Accepted |
|---|---|---|
| #6 | COMPLETE WITH LIMITS | **COMPLETE** |
| #8 | COMPLETE WITH LIMITS | **COMPLETE** |
| #14 | COMPLETE WITH LIMITS | **COMPLETE** |

---

## Construction performed

1. Shared derivation + copy config  
2. Studio Board **Project status** panel wired to campaign / materials facts / job summaries  
3. Materials facts callback extended with `receivedLabels` (additive)  
4. Focused unit tests + browser cert harness  

---

## Proposed readiness (after transfer + push)

**9 fully complete · 12 complete with limits · 21 of 23 materially delivered · 1 partial (#3) · 1 missing (#15)**

Fully complete set: #2, #6, #8, #14, #16, #18†, #20, #21, #22.
