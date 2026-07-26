# Conversation Room Completion — Plan (Anti-Loop Gap Check)

**Package:** Conversation Room Completion
**Mode of this document:** Inspection + package definition only. No product code changed.
**Date opened:** 2026-07-26 · **Plan + decisions protected:** 2026-07-26 (`docs: lock Conversation Room completion plan`)
**Owner decisions:** CR-D1 through CR-D5 **ANSWERED** — see §7.
**Voice doctrine evidence commit:** `03ee8a7e48beb72a2bf249a9da1d340ebe538bc1`
**Protected tip at inspection:** `03ee8a7e48beb72a2bf249a9da1d340ebe538bc1` · branch `fix/discovery-responsive-layout` · 0 ahead / 0 behind
**Inherited locks:** Live Host discontinued · Package 4 Voice Host dead · recommendation engine discontinued for launch · Voice doctrine protected · V1/V2/V3 answered · Presence System states established · quiet Board/Review/Delivery · page counts 16/15/14/13 · Auth before Customer-One · archive before delete.

---

## 0. Locked outcome of the inspection

The inspection is **complete**. Do not repeat the Conversation Room inventory, stage-machine inspection, Voice doctrine audit, or dirty-WIP discovery.

**The two genuine launch gaps are:**

1. **Intake answers bypass the attributed working-draft history.** → CR-3
2. **No full end-to-end Conversation Room certification exists.** → CR-4

Everything else is validation, truthful cleanup, or protection of existing WIP. **Neither gap is a reason to rewrite the working stage machine.**

**The live stage machine is the authoritative Conversation Room journey:** `opening → route → services → plan → checkout → intake → complete`. There is no second authority.

**Approved package order (CR-1 must not absorb CR-2 through CR-5):**

| Package | Scope |
|---|---|
| **CR-1** | Validate and protect existing Conversation Room WIP — **recommended next package** |
| **CR-2** | Truth cleanup |
| **CR-3** | Intake attribution |
| **CR-4** | End-to-end Conversation Room certification |
| **CR-5** | Obsolete-path dependency and archive-candidate audit |

---

## 1. Anti-loop findings — already complete; do not repeat

| Behavior | Evidence | Status |
|---|---|---|
| Stage machine `opening → route → services → plan → checkout → intake → complete` | `src/config/conversation-room-stage-v1.ts` + `ConversationRoomRuntime.tsx` | Built, protected |
| Voice preference gate (Use Voice guidance / Fill it out myself; no speech until chosen) | `VoicePreferenceControls.tsx`, `studio-voice-preference` lib; commit `b13fe75` line of work | Built, protected |
| Route clarification **honesty pass** — "Suggested starting point", "may be a good place to start. You can choose a different path." | `src/config/conversation-room-route-recommendation-v1.ts` doc comment cites Tagia launch honesty pass 2026-07-21 | Built, protected, honest |
| Guidance Pass Plan + Checkout cold-certified | `docs/studio-voice-guidance-map-v1.md` (2026-07-19) | Certified |
| Working-draft persistence contract + editing before payment | `docs/studio-working-draft-persistence-v1-locked.md` · `src/lib/studio-working-draft/` · `src/lib/conversation-room-draft/` | Locked, tested |
| Phone layout: tablet above controls | `studio-conversation-room.module.css` `@media (max-width:960px)` order swap; commit `cc80d94` | Built, protected |
| Checkout sandbox honesty — "Taxes and live card processing are not applied in this build."; double-submit guard | `ConversationCheckoutPanel` / checkout copy · `paymentCompleteGuardRef` | Built, protected, honest |
| Intake entry gating (already-submitted / missing-payment / missing-plan / missing-context) | `resolveIntakeEntrySurface` · ledger `project-intake` tests gate **verified** | Built, tested |
| Signed-in / signed-out handoff, fail-closed probe, truthful Sign In offer | `src/lib/studio-intake-handoff.ts` · `scripts/cert-account-handoff.mjs` | Built, certified |
| Lobby Entry Film reopen on return | `scripts/cert-lobby-entry-film-reopen.mjs` | Certified |
| Help overlay = intentional shell linking to locked Help Center | `HelpCenterPanel.tsx` · Help Center V1 locked | As designed |

If any of the above is requested again as new work: **Hey Chat — this is repetitive if we re-open work already completed or locks already on the books.**

## 2. What exists only in dirty WIP (uncommitted) — needs validation + protection, not rewrite

~301 insertions / ~315 deletions across 23 tracked CR files, plus untracked files. **All 34 unit tests in the 5 CR-related test files pass on this WIP as it sits (vitest, 2026-07-26).**

| Dirty behavior | Files |
|---|---|
| Fresh start after completed journey (`isConversationJourneyComplete`, `clearCompletedConversationLocalState`, `resolveLobbyConversationBeginInvite`) | **untracked** `src/lib/conversation-room-draft/lobby-begin.ts` + `lobby-begin.test.ts`; re-exported in `conversation-room-draft/index.ts` |
| Resume invite matches restored stage after Lobby return (`spokenLineForResumeStage`, `resolveBootStage` sealed deep links) | `ConversationRoomRuntime.tsx` |
| Return-to-Lobby reopens Entry Film (`lobbyReturnRoute: "/studio-lobby?lobbyEntry=reset"`) | `studio-conversation-framework-v1.ts`, `lobby-session.ts` |
| Draft survives `session-timeout` / `sign-out` / `sign-in-return` (contract additions) | `studio-working-draft-v1.ts` + `persist.test.ts`, `studio-working-draft.test.ts` |
| Nav panel: dev-only Studio Review link, Review Answers button reorder | `ConversationNavPanel.tsx` + module CSS |
| Presence rail trim + presence wave visual | `VoiceActivityBar.tsx`, `presence.ts`, `voice-activity-bar.module.css` (−170 lines), **untracked** `src/components/studio-presence/StudioVoicePresenceWave.tsx` + CSS |
| Guide tablet / comm panel / intake panel / route-choose polish | `guide/*.tsx`, `guide/conversation-activity-panel.module.css`, `studio-communication-light.module.css`, `studio-conversation-room.module.css` |
| Adjacent, **not this package:** mobile Lobby entry | **untracked** `src/components/entrance/MobileStudioEntry.tsx`, `src/config/mobile-studio-entry-v1.ts` |

## 3. Per-stage gap table

Legend: ✅ built · 🧪 tested · 📜 certified · ⚠ gap · WIP = partly uncommitted.

| Stage / area | State | Genuine gaps |
|---|---|---|
| Entry + Voice preference gate | ✅ 📜 (guidance map) WIP | No dedicated cert of the gate at 360px |
| Discovery (guide capture opening) | ✅ live via `StudioGuideTabletView`; ledger `discovery` gates all pending | ⚠ Parallel **unwired** `discovery/` components (`DiscoveryQuestion1View` etc.); stale `page.tsx` comment "Discovery Question 1 live wire" |
| Route clarification | ✅ honest copy; persistence verified | Editing/attribution/desktop/mobile ledger gates pending |
| Services + Learn More | ✅; persistence + editing verified | Logo SKU catalog gap noted in copy; attribution/tests/desktop/mobile gates pending |
| Plan | ✅ 📜 guidance pass; persistence + editing verified | Same pending ledger gates |
| Checkout | ✅ 📜 guidance pass; honest sandbox copy | No failure/cancel/retry path (no real processor — acceptable for Customer-One? → decision CR-D3) |
| Intake | ✅ 🧪; gating solid | ⚠ Intake answers bypass attributed working-draft path (campaign store direct) |
| Signed-in/out handoff | ✅ 📜 `cert-account-handoff.mjs` | — |
| Persistence / back-nav / Lobby restore | ✅ 🧪 WIP (resume + fresh-start live only in WIP) | WIP must be protected before it can count |
| Help overlay | ✅ shell as designed | — |
| Post-completion tablet | ✅ 🧪 WIP (`lobby-begin`) | WIP must be protected |
| Desktop / phone / 360px | ✅ layout fix protected | ⚠ **No end-to-end CR cert script exists** (`scripts/` has none for the room); 360px unproven |
| Voice On/Off | ✅ every `speakStudioLine` gated | — |
| Transcript / captured answers | Dictation writes to field; customer edits manually; corrections via `handleCorrect`/`handleChangeAnswer` | ⚠ No "did I hear you right" confirm loop (→ decision CR-D2) |
| Attribution | Working-draft history records actor/actionCode (e.g. `route-recommended` = voice) | ⚠ Ledger attribution gate pending on **every** row; intake unattributed |
| Error/timeout | Speech errors → typed fallback; plan bridge + intake submit failures surfaced | No probe/network timeout beyond fail-closed (acceptable) |
| Dual phase model | Framework `journeyPhase`/`flowStep` (drives presence) + `stage` machine both run | ⚠ Loosely synced; `evaluateConversationPhaseGate` **not called** on live path (→ decision CR-D5) |
| Free-message send | `handleSendMessage` is affordance-only — "Voice Host reply comes in a later package" | ⚠ Dead affordance references a **dead package** (→ decision CR-D1) |

## 4. Truthfulness check results

- Every live question feeds route, services, plan, or intake — no idle interrogation found.
- Keyword→road lookup is **not** described as intelligence; copy hedged ("Suggested starting point", customer may choose any path). Honest.
- Route clarification does not masquerade as service recommendation.
- Customer edits freely before payment (pre-checkout flexibility lock respected; ledger editing verified for builder + plan).
- Checkout states plainly that live card processing is not applied. No unsupported payment claims.
- Intake gating prevents loss; signed-out gets truthful Sign In handoff; signed-in reaches Board (certified).
- Voice Off preserves the entire journey (all speech gated; typed input always available — permanent communication dock).
- Two truth defects to repair: stale `page.tsx` "Discovery Question 1 live wire" comment, and the send affordance promising a "Voice Host reply … later package" (Package 4 is dead).

## 5. Anti-rewrite classification

| Classification | Items |
|---|---|
| **Preserve as-is** | Stage machine · Voice gate · route honesty copy · checkout sandbox honesty · intake gating · handoff · Help shell · phone layout fix |
| **Finish existing implementation** | Dirty WIP (resume, fresh-start, Entry Film return, preserve-on additions, presence trim) — validate then protect |
| **Repair narrow defect** | Stale `page.tsx` comment · send-affordance "Voice Host reply" copy (pending CR-D1) |
| **Certify existing behavior** | End-to-end CR journey desktop/phone/360 · ledger desktop/mobile/tests gates |
| **New launch-critical construction** | Intake attribution into working-draft history (small) |
| **Retire from live path later** | Dual framework phase model *if* Tagia chooses stage-machine-only (CR-D5) — not now |
| **Archive candidate** | Unwired `discovery/` parallel components — after dependency audit; archive before delete |

**Nothing in the Conversation Room needs a rewrite.**

## 6. Approved ordered completion packages (owner-approved 2026-07-26)

1. **CR-1 — Validate and protect the dirty WIP** *(smallest first construction package)*: review each hunk, run tests (already green), selectively stage and protect the CR WIP in ordered slices (draft/lobby-begin + config contract → runtime resume/fresh-start → presence/nav/CSS polish). No behavior invention.
2. **CR-2 — Truth cleanup:** stale comment + send-affordance copy per CR-D1 (current behavior only, no Host promise); confirm checkout sandbox labeling is literal per CR-D3. Tiny diff.
3. **CR-3 — Intake attribution:** record intake capture in attributed working-draft history; flip ledger attribution gates that then genuinely pass.
4. **CR-4 — End-to-end certification:** new `scripts/cert-conversation-room-journey.mjs` — Lobby handoff → preference → Discovery → Route → Services → Plan → Checkout (sandbox) → Intake → signed-in and signed-out handoff, at desktop / phone / 360px, Voice On and Off; flip ledger tests/desktop/mobile gates with evidence.
5. **CR-5 — Obsolete-path hygiene:** dependency audit of unwired `discovery/` components **and** the parallel phase-gate system → archive-candidate list only (no deletion, no Tagia-unapproved removal); preserve anything still depended on by tests, migrations, Owner QA, or dirty WIP.

### CR-1 exact likely files

Tracked (already dirty): `ConversationRoomRuntime.tsx` · `ConversationNavPanel.tsx` + `conversation-nav-panel.module.css` · `StudioConversationRoom.tsx` · `VoiceActivityBar.tsx` + `voice-activity-bar.module.css` · `guide/ConversationIntakePanel.tsx` · `guide/ConversationRouteChoose.tsx` · `guide/StudioGuideCommPanel.tsx` · `guide/StudioGuideTabletView.tsx` · `guide/conversation-activity-panel.module.css` · `studio-communication-light.module.css` · `studio-conversation-room.module.css` · `src/config/conversation-room-guide-v1.ts` · `conversation-room-stage-v1.ts` · `studio-conversation-framework-v1.ts` · `studio-working-draft-v1.ts` · `src/lib/conversation-room-draft/index.ts` · `src/lib/studio-conversation-framework/lobby-session.ts` · `presence.ts` · `studio-conversation-framework.test.ts` · `src/lib/studio-working-draft/persist.test.ts` · `studio-working-draft.test.ts`
Untracked (CR): `src/lib/conversation-room-draft/lobby-begin.ts` · `lobby-begin.test.ts` · `src/components/studio-presence/StudioVoicePresenceWave.tsx` + CSS
Untracked (adjacent — separate slice or separate package): `src/components/entrance/MobileStudioEntry.tsx` · `src/config/mobile-studio-entry-v1.ts`

## 7. Owner decisions CR-D1 through CR-D5 — ANSWERED 2026-07-26

### CR-D1 — Dead Voice Host copy · **ANSWERED**

- Keep the **permanent typed-input dock**.
- Remove the obsolete promise that a "Voice Host reply comes in a later package."
- Replace it during **CR-2 Truth Cleanup** with wording that describes **current behavior only**.
- Do **not** revive Package 4 Voice Host.
- Do **not** imply that an unavailable conversational response feature is coming during the launch journey.

### CR-D2 — Manual editing of captured dictation · **ANSWERED**

- Accept **direct manual correction** of speech captured into a visible editable field.
- Do **not** force a second confirmation loop merely because the text originated from speech.
- The customer's deliberate **Continue / Save / submit** action confirms the edited answer.
- Continue showing captured content **visibly** and allowing correction.
- **Consequential actions still require explicit confirmation:** payment · service or scope commitment · project submission · approval · revision submission · final delivery acceptance · complaint submission · refund request.

### CR-D3 — Sandbox checkout through Customer-One · **ANSWERED (with boundary)**

- Sandbox checkout is acceptable **through Tagia's Customer-One trial only** — that trial validates the workflow and does not require charging Tagia real money.
- Checkout must **clearly and literally identify sandbox or test behavior**.
- It must **not** imply that a real payment was processed.
- It must preserve truthful **success, failure, cancellation, and handoff** states supported by the current sandbox.
- A **real, integrated, tested, and certified payment path is required before controlled external customers are admitted** — recorded on the **External Soft-Opening gate** in the Master Launch List.
- Do **not** silently carry sandbox checkout into the external launch.

### CR-D4 — Parallel unwired `discovery/` components · **ANSWERED**

- Leave them **physically untouched during CR-1 through CR-4**.
- Audit during **CR-5 Obsolete-Path Hygiene**.
- Classify as **archive candidates only after dependency inspection**.
- **Archive before delete.** No deletion without Tagia's explicit approval.

### CR-D5 — Conversation Room authority · **ANSWERED**

- The **live stage machine is the authoritative** Conversation Room journey: `opening → route → services → plan → checkout → intake → complete`.
- Do **not** wire `evaluateConversationPhaseGate` into the live path merely because it exists.
- Do **not** create a second authority system.
- Classify the parallel phase-gate system for **CR-5 dependency audit and possible archiving**.
- **Preserve it untouched** if tests, migrations, Owner QA, or dirty WIP still depend on it.

## 8. Launch definition of done (Conversation Room Completion)

- CR dirty WIP validated and protected (CR-1) — preservation, not reinvention
- Truth defects repaired (CR-2, per CR-D1) and sandbox labeling literal (CR-D3)
- Intake attribution recorded (CR-3)
- End-to-end journey certified desktop / phone / 360px, Voice On and Off (CR-4)
- Obsolete-path audit produces archive candidates only (CR-5, per CR-D4 and CR-D5)
- Ledger gates flipped only with real evidence; no row marked ready-to-remove prematurely
- Stage machine remains the single live authority
- No Live Host, no recommendation engine, no fake status, no dead-package promises
- Master Launch List updated with evidence at each protect

**Out of scope for this package:** real payment processor integration (required before external customers — External Soft-Opening gate), deletion of any legacy path, and any second journey-authority system.
