# CUSTOMER-ONE-E2E-CERT-1

**Status:** SEALED · **BROWSER-CERTIFIED WITH EXPLICIT LIMITS**  
**Type:** Customer-One end-to-end certification + minimal blocker-removal  
**Protected starting tip:** `0a8f84625d526d29109b5ded6ba11197ce0f1f95`  
**Product tip (this package):** `d39165b0cfb277f29d1afa32b8cf8b3987ca9d08` — `fix: narrow JobReviewWorkspace focused-section type guard`  
**Worktree branch:** `cert/customer-one-e2e-1`  
**Clean worktree:** `C:\Users\tagia\studio-squishy-customer-one-e2e-cert-1`  
**Authority:** AUTHORIZE CUSTOMER-ONE-E2E-CERT-1 · inspection CUSTOMER-ONE-E2E-INSPECT-1  
**Accepted:** 2026-08-02 · Tagia (seal commit)

---

## Accepted result

| Field | Value |
|---|---|
| Outcome | **BROWSER-CERTIFIED WITH EXPLICIT LIMITS** |
| Browser matrix | **53 PASS / 0 FAIL / 2 LIMIT** |
| Focused unit | **40 PASS / 0 FAIL** |
| Desktop | 1440 × 900 — journey **PASS** |
| Phone | 390 × 844 — journey **PASS** |
| Server | `next dev` @ `127.0.0.1:3031` |
| Production build | **Blocked** by pre-existing tip TypeScript baseline (~69 errors) — not cleared in this package |
| Project Claim | **NOT STARTED** — recorded as LIMIT; not implemented |
| Payment/refund | **Not reopened** |
| Pre-CR Host / Route Map E2E scripts | **Do not count** as Gate #23 evidence |
| 360px / all-surface cert | **Outside this package** |
| Main worktree WIP | **Untouched** |

Harness: `scripts/cert-customer-one-e2e-1.mjs`  
Local artifacts under `test-artifacts/customer-one-e2e-1/` are **not** committed (screenshots / run reports stay disposable).

---

## Journey certified

```
Lobby → Conversation Room → Payment (sandbox) → Intake
  → Account Handoff → Create Account → Studio Board
  → Review (authorized jobId) → Final → Delivery (/deliverables redirect)
  → Sign In return → Lobby return / refresh / returning-customer restore
```

Viewports: **desktop 1440** and **phone 390** (full spine each).

**Persistence / return-path evidence:** Lobby return with draft preserved · refresh preserves campaign · returning-customer restore · Create Account and Sign In return to Studio Board with same campaign identity.

Mid-journey note (same honesty as CR-4): after Lobby entry + Voice preference, Checkout spine is seeded so Payment→Intake→handoff are exercised without replaying every Discovery answer. Lobby start and preference remain real customer steps.

Post-Board Review/Final/Delivery: payment+intake does **not** invent `ready_for_review`. This package applies an **honest production-state seed** (owned campaign + job spine + deliverablePrep / released files) after Board landing — test infrastructure, not a claim that production auto-advances.

---

## Product construction in this package

| Change | Tip | Rationale |
|---|---|---|
| `JobReviewWorkspace.tsx` — `.includes(current)` → `.some((id) => id === current)` | `d39165b…` | Narrow TypeScript guard on Review focused-section (`FeedbackSectionId` vs ``fallback:${string}``). Runtime-equivalent. |

No Payment/refund, Materials, PAGE-TABS, or Project Claim product work.

---

## Gate verdicts (sealed)

| Gate | Verdict | Why |
|---|---|---|
| **#1** Lobby → final delivery | **COMPLETE WITH LIMITS** | Continuous Customer-One spine certified Lobby→Delivery on desktop + 390 |
| **#17** Mobile + desktop certified | **COMPLETE WITH LIMITS** | Journey certified 1440 + 390; 360px and broader all-surface certification remain outside this package |
| **#23** Full E2E testing passes | **COMPLETE WITH LIMITS** | Current CR-spine Customer-One E2E harness exists and passes; obsolete pre-CR scripts do not count |

---

## Explicit limits

1. **Project Claim (Auth Package 5) not started** — ownership/email-hard-before-Board claim remains open  
2. **Sandbox payment only** — sealed Payment room not reopened; no live processor  
3. **Post-Board production seed** required for Review/Final/Delivery entry — not invented Board “Ready for Review” before seed  
4. **Discovery mid-spine seeded** after Lobby + Voice (CR-4 pattern)  
5. **Production `next build` blocked** by pre-existing tip TypeScript baseline (~69 errors) — cert ran on `next dev`  
6. **360px** and broader all-surface certification remain outside this package  
7. **PAGE-TABS-1** deferred · **Board Materials** waiting · Unified Room Choice A proof limits remain from UR-ROOM-CERT-1  

---

## Updated readiness accounting (after seal)

| Bucket | Count |
|---|---|
| Fully complete | **4** (#16, #18†, #20, #22) |
| Complete with limits | **12** (#1, #4, #5, #7, #9, #10, #11, #12, #13, #17, #19, #23) |
| Materially delivered | **16 of 23** |
| Partial | **6** (#2, #3, #6, #8, #14, #21) |
| Missing / not opened | **1** (#15 deferred internal team-ownership phase) |

†#18 counted among the four while labeled COMPLETE WITH LIMITS (retained quirk).

---

## Validation commands

```bash
# Clean worktree
npx vitest run \
  src/lib/studio-intake-handoff.test.ts \
  src/lib/auth/auth-gate-1-project-record.test.ts \
  src/lib/studio-working-draft/persist.test.ts \
  src/lib/job-control/review-room.test.ts

# Server (dev — until tip TS baseline cleared)
NEXT_PUBLIC_PAYMENT_SANDBOX=1 SESSION_SECRET=… npx next dev -H 127.0.0.1 -p 3031

CERT_BASE_URL=http://127.0.0.1:3031 \
CERT_COMMIT=<product tip> \
node scripts/cert-customer-one-e2e-1.mjs
```

---

## Transfer note

Commits live on `cert/customer-one-e2e-1` in the clean worktree until Tagia authorizes merge/cherry-pick into `fix/discovery-responsive-layout` and push. Do not absorb main-worktree WIP.
