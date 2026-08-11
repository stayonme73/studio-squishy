# STUDIO-OPERATING-CONVERSATION-ROOM-REGRESSION-1 REPORT

**Package:** Conversation Room regression inspection/fix (operating smoke blocker)  
**Branch:** `operating/payment-truth-1`  
**Context:** Stripe smoke PAUSED after Owner walkthrough exposed CR UI/state regressions  
**Status:** CONVERSATION ROOM OPERATING SMOKE UNBLOCKED  
**Scout:** PARKED  
**Git:** No commit · No push · No merge  
**Kitchen / Assurance / Payment truth:** Not weakened

---

## Root cause

Three independent defects collided in the Owner walkthrough:

1. **Duplicate Continue** — the permanent left dock temporarily relabeled **Send → Continue** during guide questions and wired that button (and Enter) to `handleContinue`, while the tablet already owned the primary Continue CTA.
2. **Deadline contradiction** — guide relative bubbles (e.g. “Within 2 weeks”) were stored as customer truth with `deadlineStatus: unconfirmed`, but pre-acceptance `parseCustomerDeadline` only understood calendar dates → `timingInvalid` (“couldn’t read…”) at checkout.
3. **Recommendation path** — no false **SKU** recommendation was invented for “Business setup.” The flow highlights **I-75 as a starting route** via keyword map (customer still confirms; services only via explicit add). A real gap was **stale route recommendation** surviving after project-need changes — that inheritance path is now invalidated.

---

## 1. Duplicate Continue finding

| Surface | Before | After |
|---------|--------|-------|
| Tablet Presentation Continue | Primary step advance | **Unchanged — sole progression CTA** |
| Left dock during questions | Label flipped to Continue; advanced step | Label stays **Send**; submits same answer path as tablet Continue |
| Enter during questions | Advanced step | Same as Send → guide submit path |

**Legacy/redundant control:** dock step-advance during guide questions (not the tablet).  
Typing/voice controls preserved. No new navigation invented.

---

## 2. Deadline-state finding

**Contract decision: Option A** — relative guide choices are valid planning inputs.

| Choice | Capture | Pre-acceptance |
|--------|---------|----------------|
| Within 1 week / 2 weeks / 1 month / More than 1 month | Stored as chosen text · `unconfirmed` | Horizon derived for turnaround check |
| As soon as possible | Stored · `unconfirmed` | Open urgency — not unreadable; no fake date |
| No deadline yet / Skip for now | Cleared · `not_requested` | No fixed deadline |

**Not loosened:** past dates still `UNSUPPORTED`; catalog turnaround floor still applies against the horizon; gibberish free-text still `CLARIFICATION_NEEDED` with `timingInvalid` at the correct gate.

Summary may still show **DEADLINE STATUS: Unconfirmed** for relative choices (planning input, not a calendar commitment). That is honest — it no longer contradicts a later “couldn’t read” rejection of the same string.

---

## 3. Exact recommendation path (Owner need: “Business setup”)

| Step | Evidence |
|------|----------|
| Input | `projectNeed = "Business setup"` |
| Router | `recommendRouteFromProjectNeed` → `"i75"` (exact/keyword match for business setup) |
| Persist | `persistRouteRecommendation(draft, "i75", projectNeed)` on confirm when a suggest exists |
| Customer action | Must still confirm/choose route; services only via add |
| Auto-SKU seed | **None** |

### False recommendation regression?

| Class | Verdict |
|-------|---------|
| Fabricated service SKU from “Business setup” | **No** — not observed / not in path |
| Default route forced without keyword evidence | **No** for this need (keyword map hit is intentional starting highlight) |
| Stale recommendation after need change | **Yes (narrow)** — fixed via `readActiveRouteRecommendation` + clear on need change / insufficient evidence |

**Classification:** Not a FALSE RECOMMENDATION REGRESSION for SKUs. Stale-route inheritance was a real regression and is corrected narrowly.

---

## 4. Studio Plan content for this walkthrough pattern

| Question | Answer |
|----------|--------|
| Selected/recommended SKU(s) | Only what the customer explicitly adds on the services stage |
| Routing evidence | Keyword → I-75 starting highlight (not engine scoring) |
| Authoritative recommendation? | Route *suggestion* only — not service-engine output |
| Customer explicitly selected services? | Required — no auto-seed |
| Fallback/default created plan? | No |

---

## 5. Files changed

| File | Change |
|------|--------|
| `src/components/studio-conversation-room/guide/StudioGuideCommPanel.tsx` | Dock always Send; no step-advance during questions; drop unused `onContinue` |
| `src/components/studio-conversation-room/ConversationRoomRuntime.tsx` | Active/stale route recommendation; clear on need change; remove dock `onContinue` |
| `src/lib/studio-pre-acceptance/evaluate-timing.ts` | `resolveRelativeDeadlineHorizon` + evaluate relative planning horizons |
| `src/lib/studio-pre-acceptance/index.ts` | Export horizon helper/type |
| `src/lib/studio-guide-hard-nav.ts` | “No deadline yet” / skip → empty + `not_requested` |
| `src/lib/conversation-room-draft/slices.ts` | `readActiveRouteRecommendation` |
| `src/lib/conversation-room-draft/persist-project.ts` | `clearRouteRecommendation` |
| `src/lib/conversation-room-draft/index.ts` | Re-exports |
| `src/lib/conversation-room-operating-smoke.test.ts` | New regression coverage |
| `src/lib/studio-pre-acceptance/pre-acceptance.test.ts` | Relative deadline consistency case |

---

## 6. Tests

```text
npx vitest run \
  src/lib/conversation-room-operating-smoke.test.ts \
  src/lib/studio-pre-acceptance/pre-acceptance.test.ts \
  src/lib/studio-payment/payment-truth.test.ts
```

**Result:** 46 passed (including payment-truth + Assurance pre-acceptance + new CR smoke file).

Coverage proves:

- dock label stays Send (tablet owns Continue)
- “Within 2 weeks” is not `timingInvalid`
- unreadable deadline still fails closed at pre-acceptance
- stale route recommendation invalidates on need change
- CLEAR still blocks when clarification is legitimate
- payment-truth remains green

---

## 7. Conversation Room walkthrough result

**Code/state contract restored to truthful progression.** Browser Continue/checkout/Stripe card testing was **not** resumed (Owner order).

Owner re-walk expected shape:

1. One primary Continue (tablet) per guide step  
2. Relative deadline accepted consistently through summary → pre-acceptance  
3. Route highlight only with need-bound evidence; no invented SKUs  
4. Checkout still blocked when CLEAR legitimately requires clarification  

---

## Protections held

- CLEAR_TO_ACCEPT  
- Timing floor evaluation (horizons evaluated; safety not skipped)  
- Payment truth  
- Kitchen  
- Production Assurance  

No Lobby / Review Room / Studio Plan redesign.

---

## Addendum — Dead Send + checkout path consistency

**Owner evidence:** Deadline step showed typed `Within 2 weeks` in the left composer; visible **Send** did nothing; tablet **Continue** advanced; Owner reached checkout via Continue.

### Root cause (addendum)

The duplicate-Continue fix over-corrected: during `isAnsweringQuestion`, dock Send only flushed the text ref and **did not** call the guide submit path. The button stayed enabled (text present) → looked active, silently no-op.

Typed path was disconnected from step advancement. Tablet Continue still called `handleContinue` → draft update → later Plan → `runPreAcceptanceForCheckout(projectFactsFromWorkingDraft(...))`.

### Checkout path that allowed Owner through

| Path | Role |
|------|------|
| Tablet Continue | **Authoritative advance** for guide steps (including deadline) |
| Typed Send | Was dead during questions — **not** the checkout path |
| Stale pre-acceptance | Not required to reach Plan; Plan→Checkout re-runs `runPreAcceptanceForCheckout` on current working-draft facts |
| Cached CLEAR | Payment `assertPreAcceptanceAllowsPayment` re-evaluates on fingerprint/revision mismatch (deadline in fingerprint) |

Checkout is based on persisted opening answers in the working draft after Continue commits them — not on a parallel typed-only channel. Once Send uses the same submit path, typed and tablet choices write the same draft.

### Fix

- Dock **Send** during guide questions → `onSubmitGuideAnswer` (= `handleContinue`) after flush
- Label stays **Send** (tablet keeps **Continue**) — one progression *path*, distinct labels
- Free-ask mode: Send still only active with typed text (`disabled` otherwise)
- Shared `resolveGuideAnswerFromUi` / `resolveComposerSendAction` for parity + tests

### Additional files

| File | Change |
|------|--------|
| `src/lib/studio-guide-answer-resolve.ts` | Shared resolve + Send action contract |
| `src/lib/studio-guide-answer-resolve.test.ts` | Typed/bubble parity + Send action |
| Comm panel / Runtime / smoke tests / this report | Wired + coverage |

### Tests (updated)

```text
npx vitest run \
  src/lib/studio-guide-answer-resolve.test.ts \
  src/lib/conversation-room-operating-smoke.test.ts \
  src/lib/studio-pre-acceptance/pre-acceptance.test.ts \
  src/lib/studio-payment/payment-truth.test.ts
```

**Result:** 52 passed.

---

## Addendum — Duplicate “Skip for now”

**Owner evidence:** Business-name step showed **Skip for now** as both a choice chip and the secondary action button.

### Finding

Both controls called the same `handleSkip` path. Chip was redundant with the action-row button.

### Fix

Removed `"Skip for now"` from guide question bubble lists when `canSkip: true` (business name, deadline, materials). Authoritative Skip remains the tablet action-row button. Preserved business-name alternatives: I don’t have one yet · Personal project · I’m still deciding.

State semantics unchanged (`skipped: true` → empty business name). Send/Continue unchanged.

---

## Return

**DUPLICATE SKIP CLOSED**

**CONVERSATION ROOM OPERATING SMOKE UNBLOCKED**

Scout PARKED.

Owner may resume at the payment form for Stripe test-card smoke (state semantics unchanged).
