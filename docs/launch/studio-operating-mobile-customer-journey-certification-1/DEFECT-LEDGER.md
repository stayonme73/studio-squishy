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

## MJ-D8 — Bubble choices on “What are you working on?” do not respond on Samsung

**Status:** OPEN — first pointerup patch failed real-phone retest 2026-08-26.

**Found:** Live HTTPS phone run. After Maya’s name, the tablet showed `ask_project_need` (“What are you working on?”) with bubble choices. Taps on Tagia’s real Samsung did not select a chip.

**First patch (failed):** Native `pointerup` on the chip, skipping `pointerType === "mouse"`. Real Samsung still no-op after refresh. Session Review Answers had looked like the same class of fix, but those controls are `<a href="#conversation-room-tablet">` outside the tablet glass — native hash navigation can succeed even when JS click never fires.

**Revised cause (evidence in source):**
1. Overlay intercept: when Voice preference shares the glass (`voiceNarration === null` on first paint, and whenever the customer typed via Speak/Type without tapping Use Voice / Fill it out myself), `.hostSurface > *:not(:only-child):last-child` and `… last-child *` set `pointer-events: none`. The question + chips are that last child. The tapped node never receives pointerdown/pointerup/click. Session still works because it is not inside this glass.
2. Unstable listener: `useLayoutEffect` with no dependency array rebound `pointerup` on every Conversation Room render (presence/speech). Mid-gesture rebind can drop the event.
3. `pointerType === "mouse"` skip: Samsung often reports a finger as mouse, so the remaining handler returned without activating. Buttons have no href fallback.

**Fix:** Remove last-child `pointer-events: none`. Keep Voice preference on top with `z-index: 5` only. Stable callback-ref `pointerdown` (do not skip mouse; de-dupe the later click).

**Retest:** Folded into MJ-D9 real-phone walkthrough. Do not isolate this as a single-chip tap test.

---

## MJ-D9 — Mobile Conversation Room coherence (Voice late, split question, invisible selected bubble, stale onboarding)

**Status:** OPEN — correction ready for a materially different real-phone walkthrough. Not certified. Not closed.

**Found:** 2026-08-26 full Samsung walkthrough. Pieces worked separately; they did not read as one question. Tagia stopped the hire here.

**Causes:**
1. Voice first-entry (`Welcome — how would you like to continue?`) was a sibling of the active question, so onboarding stayed on screen after the customer had already typed a name via Speak/Type. Voice On/Off then moved to the side rail, which phones stack *under* the tablet — Voice appeared late.
2. Speak/Type, Required, the type field, and Continue lived in that same side rail. The tablet held the heading/chips. One answer required scrolling between two rooms.
3. Continue was on the tablet only when chips existed (MJ-D6) and always on the dock — two locations.
4. Selected chip CSS was a faint gold tint, and `.chip:hover` (same specificity, later in the file) overrode the selected border. Samsung sticky-hover made a selected bubble look unselected even though `writeTextDraft` filled the lower field.
5. “This answer is required” keyed off an empty type field, not off an accepted bubble.

**Fix (smallest structural move, not a Conversation Room rebuild):** Voice-first gate — no question until Voice On / Voice Off, with the microphone privacy note on that gate. After that, opening questions keep Voice toggle + Speak/Type + one Continue *inside* the tablet with the question and chips. Selected chips use a solid gold fill that wins over hover. Required hides once a bubble or typed value is accepted. Privacy is not repeated as a third zone under the tablet.

**Retest:** `mobile-conversation-coherence.test.ts`, `sandbox-query.test.ts`, `studio-samsung-activate.test.ts`. Real-phone starting point in Scout’s report. Do not continue the previous hire until this walkthrough.

**Follow-up 2026-08-26 (copy/validation):** Removed the redundant Speak/Type **OR** divider. Idle mic copy is one sentence: “Tap the mic to speak or start typing below.” “This answer is required” and the error field treatment appear only after Continue fails (`showValidationError={Boolean(error)}`).

**Follow-up 2026-08-26 (question wrap + Required placement):** Required no longer sits in a flex row beside the headline (`flex: 1 1 12rem` was squeezing the question to ~four lines on Samsung). Order is Voice On/Off → highlighted Required metadata → full-width question → Speak/Type → Continue. Phone question type is `clamp(1.18rem, 4.9vw, 1.45rem)` so the preferred-name question wraps in one or two lines at 360px. Question wording is unchanged.

---

## MJ-D10 — Mobile question advance / scroll position

**Status:** OPEN — opening-page height / top-landing PASS on real Samsung 2026-08-28. Not certified. Not closed. Package remains OPEN.

**Found:** 2026-08-26 Samsung review after MJ-D9. Tagia answers near the lower part of the Conversation Room and taps Continue. The next question loads higher on the page, but the phone stays scrolled near the old answer / Continue controls. She has to hunt upward after every question.

**Samsung 2026-08-28:** Short typed question (**What is the name of your business?**) lands with the next question already visible. Tall bubble question (**What are you working on?**) still requires manual scrolling. Inconsistency is the remaining bug.

**Samsung 2026-08-28 follow-up:** Name → **What are you working on?** now lands correctly. **What are you working on?** → business name leaves the new heading only a sliver — not a pass.

**Samsung 2026-08-28 top-anchor:** Name → **What are you working on?** shows the question, but Voice On / Off stays above the viewport. Owner rule: land on Voice, then Required, then question, then answers. Question-visible is not a pass.

**Samsung 2026-08-28 page-height / top-anchor audit:** Remaining issue is structural page sizing, not another tap bug. Some screens still do not land high enough to show Conversation Room header / top context. Some screens have a “bottomless” empty band below real content.

**Cause:** Reveal targeted the whole `#conversation-room-active-question` cluster, which includes Speak/Type Continue at the bottom. On a tall bubble question that cluster is taller than the phone. Continue stays focused after `pointerdown`, so the browser keeps the dock in view and the heading sits above the fold. A short next question still fits both heading and Continue, so it looked passed.

**Follow-up cause:** Heading-anchor math was correct, but after a tall question the page *shrinks*. There is not enough document below the new heading to scroll it to the top of the usable view, so it stays clipped at the bottom edge. 12px top margin also sat on the viewport edge.

**Follow-up cause (top rule):** Reveal then targeted the **heading**. Voice On / Off and Required sit *above* that heading, so a “correct” heading land still leaves the Voice row off-screen.

**Follow-up cause (blank page):** Phone `.questionRevealPad` used `height: calc(100dvh - tab - 2.75rem)` (~540px at 360×640) on every opening question so the Voice row could be scrolled to y=32. That hid the Conversation Room eyebrow and created unused vertical reserve. `.room { min-height: 100dvh }` is one-screen canvas, not the extra scroll. Service-sheet `slideHost` heights are overlay reserves, not document pad. Route/review wrappers already hug content on phone (MJ-D14).

**Fix:** Reveal `#conversation-room-tablet` (header / eyebrow in the first screen), with Voice row as fallback. 16px inset. Ask-stage pad is `2.5rem` breathing room only — stage-aware (opening questions), not a universal viewport pad. Blur Continue. Measure in layout and after paint. Do not `scrollIntoView` the tall cluster. Do not scroll the page to 0 as a hard reset.

**Retest:** `studio-conversation-tablet-anchor.test.ts`, `mobile-conversation-coherence.test.ts`. Cursor 360px layout measure in Scout’s page-height report.

**Samsung 2026-08-28 opening-page height / top-landing combined pass:** Owner result **normal**. Real device, not Cursor. Screens: Name, What are you working on?, Business name, Deadline, Materials. Each opened with the expected Conversation Room / Voice area in view. Excessive bottomless blank space is gone. This is PASS evidence for opening-page height and top-landing only. Not a Mobile close. Not a Review Together / Route / Services pass. Keep Mobile OPEN.

---

## MJ-D11 — Mobile Lobby after-film leftover landing

**Status:** OPEN — route correction ready. Not certified. Not closed. Waiting on one Samsung verification of Studio Review → Studio Lobby.

**Found:** 2026-08-26 Samsung. Close Conversation, Let’s Get Started, Start New, and Return to Lobby already reached the Welcome / Entry Film. **Studio Review → Studio Lobby** still opened the cropped lounge/clock scene, black empty field, and another Studio Review control.

**Exact Studio Review route (before this correction):** `ownerQa.journeyPresets` id `studio-lobby` used `studioBoard.routes.studioLobby` → **`/studio-lobby`** with no `lobbyEntry=reset`. `OwnerQaPanel.handleJourney` then `window.location.assign(href)` and did not copy `?studioPaymentSandbox=1`.

**Why it bypassed the Entry Film:** Let’s Get Started writes visit state `studioLobbyEntryChoice=new-to-studio`. Close conversation / Return to Lobby clear that via `lobbyEntry=reset`. Studio Review did not. `applyOwnerQaJourneySeed("lobby")` only cleared `studio-squishy:*` keys, not the Lobby visit gate. WelcomeHall then treated `choice === "new-to-studio"` as an unlocked lounge. The first MJ-D11 patch hid the reopen pill and ignored *dismissed* film on phone, but still allowed **choseNew** to skip the film — so the cropped clock landing stayed reachable on this one path.

**Fix:** Studio Review Lobby href is `studioLobbyEntryV1.routes.frontDoor` (`/studio-lobby?lobbyEntry=reset`). Lobby seed also `clearLobbyEntryVisitState()`. Review navigation keeps the sandbox query. On phone, a stored New visit no longer unlocks the cropped lounge — the Entry Film is the only landing until a journey CTA leaves.

**Retest:** `studio-lobby-entry-choice.test.ts`, `owner-qa.test.ts`, `studio-review-voice-tablet-migration-v1.test.ts`. One Samsung pass: Conversation Room → Studio Review → Studio Lobby → full Welcome / Let’s Get Started film.

---

## MJ-D12 — Mobile Studio Controls collapsible drawer

**Status:** OPEN — correction ready for real-phone retest. Not certified. Not closed.

**Found:** 2026-08-26 Samsung. Studio Controls stayed permanently expanded and consumed a large band of the phone screen, including on Choose-your-services. The customer’s current task did not own the screen. Service cards had to share the viewport with a 34dvh Session slab.

**Cause:** Phone Conversation Room treated Studio Controls as in-flow hallway furniture. When the activity panel was open, `.sideNav` was `position: fixed; bottom: 0; max-height: max(14rem, 34dvh)`, and builder/route sheets reserved that same band. There was no collapsed tab.

**Fix:** Phone-only bottom tab / drawer. Default `useState(false)` collapsed into a labeled **Studio Controls** tab (`--studio-controls-tab-h: 3.25rem`). Tap expands a scrollable control body; tap again collapses. Open state is not keyed to the question or route and is not persisted, so Continue does not auto-reopen it. Using a control (Help Center, Studio Review, Review Answers, and the other existing actions) collapses the drawer so the customer surface is not covered. Desktop rail stays expanded. All existing control actions remain.

**Retest:** `mobile-conversation-coherence.test.ts`, `sandbox-query.test.ts`. Real-phone: collapsed tab leaves service cards browseable; expand/collapse; Help Center and Studio Review still work.

---

## MJ-D13 — Mobile Conversation Room scroll / touch interference

**Status:** OPEN — correction ready for real-phone retest. Not certified. Not closed.

**Found:** 2026-08-26 Samsung. On the main Conversation Room (project-so-far / voice controls / tablet), the first vertical swipe often did nothing. A second swipe was needed. The page could move, stop, then jump back down. Scrolling felt sticky and over-sensitive.

**Cause:** Nested scrollports fighting for the same one-finger pan. Phone `.room` used `overflow-y: auto` on `height: auto` — that still creates a scroll container, so Samsung intercepts the first gesture even when the room itself has nothing to scroll, then rubber-bands. The opening tablet `.main` (`overflow: auto` + `min-height: 0` inside `overflow: hidden`) sat on top of that area and claimed the same swipe. Document/body also scrolled. MJ-D10 reveal only runs after Continue (`previous === step` guard) and was not the retrigger. No `preventDefault` on the pan.

**Fix:** Phone-only, one page scroller. `.room` `overflow: visible` (not `overflow-x: hidden`, which would compute `overflow-y` back to `auto`). Opening tablet `.root` / `.main` `overflow: visible` so the first swipe on project-so-far / voice / questions scrolls the document. Route/plan inner `overflow: hidden` was left more specific here and is corrected in MJ-D14. Activity-panel job list still scrolls inside the sheet. MJ-D10 Continue reveal and MJ-D12 Studio Controls drawer unchanged.

**Retest:** `mobile-conversation-coherence.test.ts`. Real-phone: one-finger flick on Conversation Room scrolls on the first gesture and does not snap back.

---

## MJ-D14 — Mobile Review Together / Route two-layer scroll

**Status:** OPEN — horizontal overflow fix ready. Not a one-page Mobile PASS. Not certified. Not closed.

**Found:** 2026-08-26 Samsung. Let’s Review Together and Choose Your Route felt like two pages stitched together. The top customer surface and the lower Studio Tablet / Voice Off dock scrolled or caught independently. Reverse flicks jumped. Connected: route left letterbox, Open Service List jump, Studio Controls firing on a swipe.

**Cause:** Shared phone shell, not isolated buttons. The Presentation frame was locked to `min-height: 72dvh` (upper page). Speak/Type + Voice On/Off sat below it as a second page. Choose Your Route still used desktop `.root[data-stage="route"] .main { overflow: hidden; height: 100% }` with a flex-grown map (`object-fit: contain`) that letterboxed. Studio Controls used immediate `pointerdown` on the bottom tab, so a vertical swipe from the dock toggled the drawer. Stage reveal was not run for Review/Route; services overlay plus inner scroll felt like a jump.

**Fix:** One document scroller for both stages. Phone tablet hugs content. Route/plan inner overflow visible + height auto. Map no longer flex-grows. `--tablet-width: 100%`. `overflow-anchor: none`. Drawer uses tap-with-slop + `touch-action: pan-y`. Reveal the new stage once (auto), and do not reveal when opening the service sheet.

**360px proof (Cursor, ~360×640, 2026-08-26):** Let’s Review Together (`?stage=opening`) and Choose Your Route (`?stage=route`) both have one page scroller (`body` `overflow-y: auto`). `.room`, tablet `.main`, and `.sideSpeak` are `overflow: visible` with inner `scrollTop` 0. Document scroll to 180px held on both stages; reverse to 0 held; no inner snap-back. Route map `object-fit: cover`, figure `flex: 0 0 auto`, image left equals figure left (no charcoal letterbox). Remaining ~32px tablet inset is workspace bezel, not a second scroll layer. Type field `textarea` overflow is the only nested auto scroller (form field, not a page). Studio Controls stays a fixed bottom tab by design.

**Samsung 2026-08-28:** Opening-page height / top-landing PASS (Name through Materials). Let’s Review Together still **fails**: vertical scroll improved, but the page can shift **sideways** and expose a slight edge band. Not a one-page Mobile PASS. Do not continue to Choose Your Route until this is gone.

**Cause (horizontal):** Phone `.room { overflow: visible }` (MJ-D13) let `.room::before { transform: scale(1.04) }` expand document width. At 360px the plate is 360×1.04; **scrollWidth 367** vs **clientWidth 360** (7px). `html` overflow-x was `visible`; body `overflow-x: hidden` hides the scrollbar but does not stop Samsung from panning that 7px band. Closed activity `slideHost` is `position: fixed` off-screen (right 717) and did not add to scrollWidth.

**Fix:** Phone `.room` uses `overflow-x: clip` + `overflow-y: visible` (not `overflow-x: hidden`, which would compute Y to auto). `overscroll-behavior-x: none`. `html:has([data-layout="one-tablet"])` also `overflow-x: clip`. Lobby plate scale kept.

**360px measure (Cursor, after fix):** Let’s Review Together `scrollWidth` **360** = `clientWidth` **360** (was 367). `html` overflow-x `clip`. `.room` overflow-x `clip` / overflow-y `visible`. Closed `slideHost` stays `position: fixed` off-screen and does not add document width. One Samsung retest: Let’s Review Together — vertical flick only; no sideways drift; no edge band.

**Retest:** `mobile-conversation-coherence.test.ts`, `studio-samsung-activate.test.ts`, `studio-conversation-tablet-anchor.test.ts`. Combined Samsung pass below — not certified until Tagia runs it.

---

## MJ-D15 — Materials bubble vs optional details field

**Status:** OPEN — correction ready for real-phone retest. Not certified. Not closed.

**Found:** 2026-08-26 Samsung. On “Do you already have any files or materials we should know about?”, tapping **Nothing yet** or **Reference examples** did not fill **Add any details about your materials**. The customer had no visible confirmation of what the Studio recorded.

**Cause:** Intended data model, then a confirmation gap. Materials is the only `bubbleMode: "multi"` question. Bubbles are the recorded choice (`resolveGuideAnswerFromUi` joins them). Typed text is optional extra detail appended as `bubbles — details`. `handleToggleBubble` correctly does **not** call `writeTextDraft` for multi-select, so it will not overwrite custom notes. Single-select questions (need / business / deadline) still copy the chip into the type field. MJ-D9 moved Speak/Type into the same cluster, so an empty details field now looks like the answer was not recorded. Selected-chip gold already existed; the empty optional field was the missing confirmation.

**Fix:** Do not copy bubble labels into the details field. Show `The Studio recorded {choice}.` when materials bubbles are selected. Placeholder and hint state that extra details are optional.

**Retest:** `studio-guide-answer-resolve.test.ts`, `mobile-conversation-coherence.test.ts`. Samsung: tap Nothing yet / Reference examples → gold chip + recorded sentence; details field stays empty unless Tagia types extra notes; Continue still saves the bubble.

---

## MJ-D16 — Voice Off still starts the microphone

**Status:** OPEN — correction ready for real-phone retest. Not certified. Not closed.

**Found:** 2026-08-26 Samsung. Tagia tapped **Fill it out myself**. UI showed Voice Off. The browser still asked **Allow access to your microphone**, then **Listening — tap to finish**.

**Cause:** First-entry gate uses immediate `pointerdown`. Choosing Fill it out myself unmounts the gate and mounts Speak/Type under the same finger. The leftover `click` / `pointerup` hits the new mic and calls `startConversationDictation()`, which requests permission. Not a persisted Voice On auto-start. Persistent Voice On/Off toggles are ordinary `onClick` and were not this path.

**Fix:** Gate buttons consume the pointer gesture. After the gate, listening stays disarmed until that same gesture settles. `handleStartListening` no-ops while disarmed and stops any recognition that slipped through. Voice Off also aborts dictation. Later explicit mic taps still work.

**Retest:** `mobile-conversation-coherence.test.ts`, `studio-samsung-activate.test.ts`. Samsung: Fill it out myself on a clean visit and after a prior Voice On session — no permission prompt, no Listening.

---

## MJ-D17 — Cropped Lobby still flashes during Let’s Get Started

**Status:** OPEN — correction ready for real-phone retest. Not certified. Not closed.

**Found:** 2026-08-26 Samsung. Going Let’s Get Started → Conversation Room still briefly showed the cropped clock-Studio / black-space Lobby.

**Cause:** `shouldForceLobbyEntryFilmOnPhone` returned false while `transitioning`. A stored New visit already had `filmOpen === false`, so the Entry Film unmounted before Conversation Room painted. The plate zoom (`transform-origin: 38% 42%`) then flashed the cropped clock. Not a final landing; a navigation-order leak.

**Fix:** Keep the Entry Film mounted until the next route paints. Phone front door stays true during transitioning. `showEntryFilm` includes `transitioning`. No delay overlay.

**Retest:** `studio-lobby-entry-choice.test.ts`. Samsung: Let’s Get Started from the Welcome film — no cropped-clock flicker before Conversation Room.

---

## MJ-D18 — Stale bubble selection on the next opening question

**Status:** OPEN — correction ready for real-phone retest. Not certified. Not closed.

**Found:** 2026-08-28 Samsung. After entering Maya and tapping Continue, **What are you working on today?** opened with **Presentation or document** already gold. The customer had not selected a need.

**Cause:** Continue uses immediate `pointerdown`. `revealActiveQuestionCluster()` then moves the new chip row under the still-settling finger. The leftover `click` hits a newly mounted chip (`useSamsungActivate` `onClick` is not debounced on a new node) and runs `handleToggleBubble`. `goToStep` already cleared `selectedBubbles`; the leftover tap wrote them again. Not a stored-answer restore.

**Samsung 2026-08-28 follow-up:** After **Social media graphics** → Continue, **What is the name of your business?** opened with **I’m still deciding** already gold. Same class as the need-question leftover click: a newly mounted chip’s `onClick` fires when that node never received `pointerdown` (`lastAt === 0`), after the first disarm had already re-armed. Not a stored-answer restore. Not a separate business-name hydration bug.

**Fix:** Disarm bubble toggles until that Continue/Skip gesture settles. Continue consumes the gesture. Chips are keyed to the current question. Forward Continue opens with no chips and an empty composer. Change an answer still restores gold from the stored answer for *that* question only. Follow-up: ignore leftover `click` unless this node saw `pointerdown`; re-arm bubbles 400ms after the gesture settles so MJ-D10 reveal cannot retarget the same finger.

**Retest:** On **What is the name of your business?**, no bubble is gold until an explicit tap. Do not continue past that question yet.

---

## MJ-D19 — Choose Your Services mobile hierarchy

**Status:** OPEN — phone chrome compact ready. Not certified. Not closed.

**Found:** 2026-08-28 Samsung. Choose Your Route is clean. Choose Your Services is overloaded: Choose Your Services, Back to Routes, Services, Estimated Investment, Promote Something Now / route label, Close, then the cards. Owner likes the Studio Controls drawer and service-list scrolling. Do not change those.

**Cause:** The builder sheet treated every metadata line as a heading. Highway eyebrow + title + long intro + `Services: N` + Estimated Investment + Back to Routes + Close all sat above the job list. Phone sheet also used `max-width: calc(100vw - 1.25rem)` so it was not full practical width.

**Fix (phone only):** Title = Choose Your Services. Compact route context = customer label (Promote Something Now). Compact Estimated Investment. Back to Routes secondary. Close quieter, still present. Hide redundant `Services` count and the long intro in the sheet (Voice still has the lead). Job-list scroller, Studio Controls, route logic, investment math, Back, Close, social-posts SKU, and carousel exclusion unchanged. Desktop builder layout unchanged.

**360px (Cursor, after compact):** Sheet width **360**. Header+toolbar chrome **91px**. First service card top **171px** (`Make Me a Business Card`). Intro and `Services` count `display: none`. Route context visible. Before (prior CSS): intro + dual totals + highway eyebrow put the first card near **~268px**; sheet max-width was **340**.

**Samsung 2026-08-28:** Owner likes the corrected sheet on **Promote Something Now**. That is not a full MJ-D19 PASS.

**Cross-route share (not a Samsung pass):** All four selectable Launch Now lanes open the same `ServiceList` (`data-panel="builder"`) with the same phone CSS. No per-road chrome branch. I-285 Perimeter Loop is not selectable and has no job shelf. Cursor 360px: all four customer labels stay **1 line**; chrome **91px**; first card top **171px**; sheet width **360**. Locked Random Exit label is **I Know What I Need** (not “I Know What I Want”). Job lists still differ by route. Not certified. Not closed.

**Retest:** `mobile-conversation-coherence.test.ts`. MJ-D19 is not fully passed. Do not ask Tagia to walk every route.

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
