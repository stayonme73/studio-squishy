# Defect ledger — mobile journey readiness

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`  
**Scope:** readiness pass plus the 2026-08-25 live Samsung run. Real-phone certification is not stamped. Stopping point: `2026-08-25-STOPPING-POINT-CHECKPOINT.md`.

---

## MJ-D1 — Sandbox pay control missing after hydration

**Found:** Gate X live notes and this pass. `SecureCheckoutGrid` computed sandbox visibility with `useMemo` reading `window.location.search`. On the server `window` is undefined, so the first paint is hidden. Hydration could keep the fixture out of the DOM even with `?studioPaymentSandbox=1`.

**Fix:** Client `useEffect` after mount sets visibility from `window.location.search`. Production without sandbox availability still hides the fixture. Tests in `hosted-checkout-ui.test.ts` guard the source pattern.

**Retest:** Unit/source preflight. Real-phone proof is Tagia step 6 tomorrow.

---

## MJ-D2 — Lobby dropped the sandbox query

**Found:** `Let’s Get Started` assigned `/studio-conversation-room` with no search. `begin-new` redirected with `browserSafeRedirectUrl`, which cleared all query. Phone cert depends on `?studioPaymentSandbox=1` because `NEXT_PUBLIC_DEV_TOOLS` is unset.

**Fix:** `withStudioPaymentSandboxQuery` on Lobby JS, film no-JS href, `/` and `/studio-lobby` guide redirects, and `begin-new`. `browserSafeRedirectUrl` now keeps caller-provided query and still does not copy incoming request query onto a bare path.

**Retest:** `sandbox-query.test.ts`, `browser-safe-redirect-url.test.ts`. Real-phone proof is Tagia steps 1–6 tomorrow.

---

## MJ-D3 — Close conversation tap does nothing on Android

**Found:** Live HTTPS phone run. Completed Conversation Room showed an enabled **Close conversation** control. Tap on Tagia’s Android phone did not navigate. Page did not leave Conversation Room.

**Cause:** Session leave (`Close conversation` and `Return to Lobby`) called `router.push(result.lobbyRoute)`. That client transition races on Samsung — same class of failure as Studio Review journey shortcuts, which already use `window.location.assign`.

**Fix:** Persist the Lobby snapshot, then `window.location.assign(withStudioPaymentSandboxQuery(result.lobbyRoute, window.location.search))` so the tap actually navigates and `?studioPaymentSandbox=1` survives. Session buttons also use `touch-action: manipulation`. This is still a session leave to Lobby (`lobbyEntry=reset`), not a change to the tablet continue path.

**Retest:** `sandbox-query.test.ts` source pattern + Lobby-return query. Real-phone proof is Tagia’s next tap on this same run — do not use Close conversation to continue the hire.

---

## MJ-D4 — Studio Review overlay collides with Conversation Room Session

**Found:** Same phone screen as MJ-D3. Recorded separately — this is the existing Studio Review pill, not the Close conversation handler.

**Cause:** Dev-only `OwnerQa` on Conversation Room (`body:has([data-layout="one-tablet"]) .owner-qa`) sits bottom-left at `z-index: 140`. Phone Session strip is `z-index: 121`. The pill covers Close conversation / Return to Lobby and can steal Samsung taps. Lobby already moved the pill to top-right so it does not sit on Let’s Get Started.

**Fix:** Owner decision 2026-08-25: remove the floating pill on Conversation Room. Studio Review is the last in-flow Studio Controls item, so it scrolls with the page and does not cover Voice, Session, Review Answers, Change an answer, Help Center, or customer content. The open phone sheet still portals when that control is used. Production does not ship this control.

**Retest:** `sandbox-query.test.ts` CSS + ConversationNavPanel source. Confirm on this phone run that no floating STUDIO REVIEW pill is covering the room.

---

## MJ-D5 — Review Answers / Change an answer / confirmed-answer rewind

**Found:** Live HTTPS phone run after MJ-D3. Review Answers did not open the completed summary. Change an answer did not work. The journey then showed the first name question after confirmed Mira / Pine & Petal answers.

**Cause:** Conversation Room boot wiped local capture whenever `isConversationJourneyComplete()` was true (leftover paid+intake campaign or a remount). `resolveGuideOpenStep` also honored a stored first-name ui-step over confirmed answers. After a rewind, Change an answer disabled because in-memory draft was empty. Review Answers opened an empty summary from React state instead of stored answers. Close conversation also sent the phone through Lobby `lobbyEntry=reset`, which can first-paint the incomplete “Choose how to begin” reopen chrome — that is not a conversation step.

**Fix:** Do not wipe on Conversation Room remount. Resume from stored guide + working-draft opening answers. Ignore a first-name ui-step when confirmed/summary answers exist. Review Answers and Change an answer reload `loadGuideDraft()` before showing the summary / correction chips. Stay on Conversation Room; do not use the broken Lobby reopen screen to continue this hire.

**Real Android follow-up:** Gold `data-active` only meant React thought the summary step was current — not that the tap ran. `loadGuideDraft()` during render mismatched server HTML vs Samsung and could detach Session clicks. Session Review Answers / Change an answer are now in-page `#conversation-room-tablet` links with pointer-up + click, and they scroll the tablet into view. Highlight only when summary cards are actually showing (`step === "summary"`).

**Retest:** `sandbox-query.test.ts` source pattern, `studio-conversation-tablet-anchor.test.ts`. Real-phone: one Review Answers tap must scroll to Maya’s summary cards.

---

## MJ-D6 — Duplicate Continue on typed questions

**Found:** Same phone run. The name question showed Continue on the tablet and Continue again on Speak/Type.

**Cause:** Tablet always rendered Continue, including questions with no chips. Dock Continue is the typed/spoken submit. On a phone they look like two copies of the same step.

**Fix:** Typed-only questions keep the question on the tablet and a complete-sentence hint to use Speak/Type. Tablet Continue stays only when chips exist. Dock Continue remains the typed submit.

**Retest:** `sandbox-query.test.ts` tablet source pattern. Confirm on the name question that only Speak/Type shows Continue.

---

## MJ-D7 — Choose your services popup has no visible options on Android

**Found:** Live HTTPS phone run after confirmed Maya / Maya’s Mobile Boutique answers. Tagia selected recommended route Promote Something Now and tapped Open service list. The Choose your services popup opened. No service cards were visible, so Social media graphics could not be added.

**Cause:** On phone the activity sheet used `height: auto` plus a short `max-height` and `overflow: hidden`. Header + intro + toolbar filled the band between the 38dvh tablet reserve and the 34dvh Session reserve. The job list had a zero-height flex slot, so Launch Now cards (including Make My Social Media Posts) rendered but were clipped. Carousel is still not on the Launch Now shelf.

**Fix:** Give the phone sheet an explicit height so the list can scroll. Builder / route peek use a shorter tablet reserve after Open service list so at least one service card is on-screen. Session stays in the CR-4R4 band. I-20 still offers `v2-rtu-social-posts` and does not offer carousel.

**Retest:** `sandbox-query.test.ts` CSS pattern, `route-map-campaign.test.ts` I-20 social posts. Next phone action (2026-08-25 checkpoint): Close and reopen Choose your services → scroll → Add to Project on Make My Social Media Posts.

---

## MJ-L1 — Review / approval / delivery need an honest production seed

**Not a silent product fake.** Payment and intake do not invent `ready_for_review`. Customer-One E2E used an honest seed. The owner guide stops after Board communication so Scout can seed review state before Tagia continues steps 18–20.

**Not fixed as auto-advance.** Recorded as a readiness limit, not a Room 4C/4B reopen.

---

## Out of contract (not fixed)

- Visual redesign of sealed Lobby / Conversation Room / Board  
- Public tunnels  
- Carousel on Launch Now  
- Merging  
- Room 5  
- Reopening Gate X, Room 4B, or Room 4C without a demonstrated mobile defect  
