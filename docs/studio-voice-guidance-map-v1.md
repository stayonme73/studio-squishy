# Studio Voice Guidance Map v1

Inspection + Guidance Pass tracking for Conversation Room decision help.
Not a business-rule freeze until Tagia explicitly locks it.

**Central problem (Cedric):** The system lets people proceed, but it does not help them decide.

**Pass status**

| Stage | Status |
|-------|--------|
| Route | **Cold-certified 2026-07-19** (clean-browser functional; Cursor overlay still present) |
| Services | **Cold-certified 2026-07-19** |
| Studio Plan | **Cold-certified 2026-07-19** |
| Checkout | **Cold-certified 2026-07-19** |
| Project Intake | **Package 1: Intake Reliability v1 cold-certified PASS 2026-07-19** |
| Board handoff | **Cold-certified 2026-07-19 as guided test** — public launch blocked by seed-only auth |
| Auth | **Sign-in / Session Hardening PASS** — next: Password Recovery when authorized (`docs/auth-implementation-evidence-ledger.md`) |
| Lobby entry | **Functional contract LOCKED** (`docs/studio-lobby-entry-split-v1-locked.md`) — next: production film design approval, then implement; no code until design approved |

**Parking Lot (locked):** `docs/parking-lot-locked-until-launch-blockers.md` — reopen only after Intake Reliability → Auth Inspection → Auth Implementation → Truthful Handoff → Post-completion Tablet.

---

## Plan + Checkout Guidance Pass v1 (2026-07-19)

### Inspection findings

| Finding | Decision |
|---------|----------|
| Tablet owned Plan confirm; panel extras had no duplicate Confirm | Keep — one primary on tablet |
| Live primary was “Yes, this is correct”; unused “Looks Good, Continue” | Rename primary to **Continue to Checkout**; secondary **Edit Plan** |
| Tablet Voice quote duplicated long freedom paragraph + Before Checkout checklist | Quote = brief orientation; checklist keeps locked freedom items |
| Spoken Plan narration read entire plan aloud | Replace with brief orientation; facts stay scannable on tablet |
| Checkout tablet was “Open Checkout” pointer while panel already open | Tablet = prep guidance + route/count/total + taxes note; reopen is secondary “Show payment form” |
| Voice bridge ≈ panel lead (narrator) | Align both to last-chance-before-lock prep line |
| `checkoutPaymentSuccessVoice` unused; `intakeVoiceBridge` spoke on success | Speak success line only after `markPaymentReceived` via `checkoutPaymentSuccessVoice` |
| Live card failure / cancel / retry | **Gap — do not invent.** Terms gate + honesty copy only; Intake has Return to Checkout recovery |
| Totals | Plan tablet + Checkout grid both use `computePlanPricingTotals` — no mismatch found |
| “Locked” wording | Matches post-payment Project Change behavior — approved for this pass |
| Taxes/fees | Honest: Estimated Investment; taxes/live processing not applied in this build |

### Implementation notes

- Config: `conversation-room-guide-v1.ts` — `studioPlanVoiceOrient`, CTA labels, checkout prep/success copy, `checkoutTaxesFeesNote`
- Tablet Plan: `ConversationStudioPlanTablet.tsx` — orientation quote; primary Continue to Checkout; secondary Edit Plan; revisions/materials via tertiary link → panel
- Tablet Checkout: `StudioGuideTabletView.tsx` — status facts + prep guidance; secondary reopen only
- Panel Checkout: customer route label (no highway); prep + scope + taxes notes; single Complete Checkout in SecureCheckoutGrid
- Runtime: payment-success speech uses `checkoutPaymentSuccessVoice` after confirmed payment
- **Unchanged:** Route recommendation, Services guidance/cooldown, working-draft architecture, Intake UI, Board handoff, catalog

### Pass conditions (ready for cold cert)

- [x] Plan opens with concise orientation
- [x] Services, price, timeline clear; revisions/materials via More details
- [x] Edit Plan + Continue to Checkout not competing across surfaces
- [x] Edit Plan → Services preserves selections
- [x] Checkout identifies purchase + total; last-chance warning before pay
- [x] Success Voice only after confirmed payment → Intake
- [x] Back/refresh preserve working draft
- [x] No new panel shell / draft store

### Cold cert evidence — Plan + Checkout (2026-07-19)

**Plan — Cedric answers**
| Question | Evidence |
|----------|----------|
| What services? | Business Card $49, Flyer $69 (later Menu $89) listed on tablet |
| Total? | Estimated Investment $118 → $207 after edit |
| How long? | Estimated Timeline shown with materials asterisk |
| Can I change? | Before Checkout checklist + orientation line |
| What to press? | Primary **Continue to Checkout**; secondary **Edit Plan** |
| Revisions/materials/scope? | Tertiary link opens Plan details panel (revision / We'll Need / View Scope); **no** Continue CTA in panel |

**Plan — behaviors**
- Voice once on entry: brief orientation only (no full re-read)
- Edit Plan → services preserved (3→still 3 before remove test)
- Refresh on Plan kept services + total
- Tablet facts + panel extras complement (no dual confirm)

**Checkout — Cedric understands**
- Purchase: Get My Business Started + listed services + $ totals on tablet and panel
- Taxes: honesty note — not applied in this build
- Last edit point + Project Change after payment (aligned tablet + panel)
- Intake next after payment (tablet lead + success speech)

**Checkout — stress**
- Back to Plan / Edit Plan / add service → totals update tablet+panel ($118→$207)
- Refresh on Checkout preserved stage + services + $118
- Show payment form reopens panel
- Rapid triple Complete Checkout → **one** success speech; Intake opens once; purchased services intact
- Pay-once guard added in `SecureCheckoutGrid` (`completing`) + runtime `paymentCompleteGuardRef`

**Wording**
- “Locked/fixed” means purchased scope is fixed after payment; later changes follow Project Change — present on tablet + panel; spoken line stays short without contradicting

**Known gap (unchanged)**
- Live payment failure / cancel / retry — blocker for live-payment readiness; not invented

**Cold-cert gate (5/5)**
1. Review confidently — PASS  
2. Understand the purchase — PASS  
3. Edit safely — PASS  
4. Pay once — PASS  
5. Know what happens next — PASS  

→ **Intake + Board Handoff cold-certified as guided test** — full report: `docs/final-cedric-usability-report-2026-07-19.md`. No automatic post-walk edits.

---

## Intake Reliability v1 (2026-07-19)

**Goal:** Fix the two Intake launch blockers only — dynamic tablet status + autosave to existing campaign draft. No second store. No auth / handoff / Lobby / cosmetic work.

### Inspection (confirmed)

| Question | Answer |
|----------|--------|
| Where answers live | React state in `ProjectIntakeMultiServiceForm` → durable on `CampaignRecord.routeMapIntakeDraft` |
| Purchased project? | Yes — campaign record (`studio-squishy:current-campaign`), not working draft |
| Reuse? | `saveRouteMapIntakeDraft` — **do not** use pre-payment working draft |
| Keys | `shared:materials`, `shared:{fieldId}`, `{serviceId}:{fieldId}` |
| File bytes | Not on this form; metadata-in-string only elsewhere |

### Implementation

- `buildProjectIntakeTabletStatus` — Completed / Still needed / Next from live answers
- Autosave: debounced 500ms → `saveRouteMapIntakeDraft` on answer changes
- Tablet receives live status via Runtime `intakeLiveAnswers`
- Manual SAVE DRAFT retained

### Parking Lot

Deferred items locked in `docs/parking-lot-locked-until-launch-blockers.md` with reopen trigger after launch-blocker sequence.

### Next package (do not start until this passes Cedric refresh)

**Package 2: Production Authentication Inspection v1** — blueprint only; no account creation.

### Cold certification — Intake Reliability v1 (2026-07-19) **PASS**

Multi-service purchase: Flyer + Business Card (`efe64752-…`).

| Check | Result |
|-------|--------|
| Shared + per-service typed answers restore after refresh | **PASS** — correct keys and fields |
| Materials **I do not have this yet** | **PASS** — pressed, not error; Completes; Next acknowledges later |
| Optional left blank | **PASS** — never in Still needed; never blocks submit |
| Autosave settle (>1s) then refresh | **PASS** |
| Completed grows only when satisfied | **PASS** |
| Still needed shrinks / clear restores | **PASS** — clear Phone → Still needed + submit disabled; restore recovers |
| Next truthful | **PASS** — remaining required ↔ materials-later ready line |
| Rapid typing race | **PASS** — last value (`BBB-final-555`) wins draft |
| Manual SAVE DRAFT | **PASS** — Progress saved |
| Submit gate + same campaign/services | **PASS** — one campaign; Flyer + Card intact |
| Second Intake store | **PASS** — only `routeMapIntakeDraft` on current campaign |

**Debounce / unload edge (documented, no package expansion)**

- Type final word and refresh before 500 ms: **only the unsettled keystroke is lost**; last settled answer returns.
- Navigation / unload **does not flush** the pending debounce timer (no `beforeunload` / `pagehide` save). Ordinary settled typing is safe; mid-keystroke refresh can drop that unsettled fragment under the current contract.

→ **Package 1 cold-certified PASS.** Package 2 (Auth Inspection, blueprint only) is green-lit. Parking Lot remains locked.

---

## Intake + Board Handoff Guidance Pass v1 (2026-07-19)

### Objective
Purchase complete → Studio picks up the baton for production — not an abrupt sign-in wall.

### Implementation notes

**Intake**
- Tablet: production status (Completed / Still needed / Next) — not “open the panel” pointer-only
- Panel: production-framed lead + one materials-later tip (chips already encode later/none)
- Voice: payment success already opens collection; submit speaks required-complete + why sign-in
- Required vs optional remains field badges; missing ≠ error (later/none paths)

**Board handoff**
- `studio-voice-board-handoff` session passport: awaiting-signin → awaiting-board-welcome → consume
- Sign-in shows Voice handoff lead when passport set (auth UI not redesigned)
- Client auth panel links include `from=/studio-board`
- Board speaks welcome once on first arrival after handoff
- No account creation invented (seed login only — documented)

**Unchanged:** Lobby, Route, Services, Plan, Checkout

### Auth inspection

| Check | Result |
|-------|--------|
| Sign-in | Exists; seed users only — no in-app account creation |
| Return URL | `/sign-in?from=` allowlist includes `/studio-board`; invalid → Board |
| Board arrival | Proxy gate → sign-in → `router.replace(returnTo)` |
| Dead ends | Help Center link on sign-in; auth panel now preserves `from=` |

### Pass conditions (ready for cold cert)

- [ ] Payment → Intake feels like production beginning
- [ ] Tablet explains production status
- [ ] Optional/required/later clear without form narration
- [ ] Submit explains why sign-in (project exists)
- [ ] Sign-in banner matches Voice intent
- [ ] Auth returns to Board
- [ ] First Board arrival welcome (not “Done.”)
- [ ] No new pages / no duplicate CTA layers

### Spoken copy (Intake + Board)

**Payment → Intake (unchanged certified):**
> Payment is complete. Next, I'll collect the project details and materials the Studio needs to begin.

**Intake submit → before auth:**
> Everything required to begin has been collected. Your project has been created. The next step is signing in so you can access your Studio Board, track progress, communicate with the Studio, and receive updates.

**Board arrival:**
> You're all set. From here you can follow your project's progress, communicate with the Studio, upload additional materials, and review updates.

### After this pass

Stop adding guidance. Run one full Cedric think-aloud from Lobby → Board without coaching. Note every hesitation.

### Spoken copy (Plan + Checkout)

**Plan open:**
> Here's your Studio Plan. Review the services, price, and timeline. You can still make changes before checkout.

**Checkout open:**
> Before you pay, confirm your services and total. This is your last step to make changes before the project scope is locked.

**Payment confirmed → Intake:**
> Payment is complete. Next, I'll collect the project details and materials the Studio needs to begin.

### Documented gaps (not fixed this pass)

1. Live payment failure / cancel / retry UX (honesty copy only today)
2. Studio Review Lobby clickability
3. Hydration overlay (`OwnerQaPanel`)
4. Board sign-in wall without Voice transition
5. Intake tablet still pointer-only

---

## Confirmed findings (pre-pass / earlier)

**Route — Business setup**
- Spoken: “Based on what you told me, Get My Business Started is the strongest match. You can choose another route if something else fits better.” (help, not command)
- Recommended badge visible immediately; all four routes present
- Preview of another route did not write `customerSelectedRoute`; confirm required
- Alternate confirm (Promote Something Now) committed only after Continue CTA
- Reload + Back to routes: `routeRecommendation` i75 + badge preserved

**Route — alternate opening answers (painted-doorway check)**
- Marketing materials → Promote Something Now (i20), spoken strongest-match line, no silent commit
- Update something existing → Update What I Already Have, spoken strongest-match line, no silent commit

**Services**
- Guidance before browsing; no Logo-as-starting-service wording
- Business Card is 2nd on I-75 shelf (after Flyer)
- Tablet “Your project so far” count: 0 → 1 → 3 (rapid) → 2 (remove) → 2 after Plan → Edit Plan
- First add spoken with real service name; rapid adds produced **one** spoken confirm (cooldown)
- Full explanation spoken once on route confirm, not after each add

**Hydration overlay:** still appears in Cursor browser; stack points at `OwnerQaPanel.tsx` (Studio Review), not StudioWorkspace. Cert in a clean Chrome profile for visual owner sign-off.

---

## Confirmed findings (pre-pass)

### Lobby
- “Studio Review” looks like a primary customer action to a first-time visitor.
- Inspect later: hide, rename, or restrict to inspection mode.
- **Out of scope for Pass v1.**

### Name question
- Answer control too far from the question; three methods should be obvious.
- Desired: “You can say your name, type it below, or skip for now.”
- Input should sit near the active question.
- **Out of scope for Pass v1** (Opening polish later).

### First project question
- “Business setup” and “Branding or logo” overlap.
- Desired distinction line exists in Cedric notes; not wired in Pass v1.
- **Out of scope for Pass v1.**

### Skippable questions
- Skip needs one explanatory line.
- **Out of scope for Pass v1.**

### Route (major)
- Customer who selected Business setup still had to decode highway lanes alone.
- **Pass v1:** Voice recommends from project need; Recommended badge; confirm CTA; customer labels without highway chrome on the Conversation Room chooser.

### Services (major)
- “Browse… add what fits” is narrator, not guide.
- **Pass v1:** Decision copy + short post-add confirmation; tablet shows project status instead of duplicating “Build Your Project.”

### Logo on Get My Business Started
- **Not a route-filter bug.** There is no Logo / “Make Me a Logo” shelf SKU in the live Route Map V2 union.
- Closest catalog item `bf-001` Brand Identity Refresh **excludes** new logo creation from scratch and is not on the Route Map shelf.
- Business card intake asks for logo *materials*, not a logo deliverable.
- **Pass v1 action:** Document gap; do not invent a Logo product. Guidance names services that exist (business cards + one promotional piece). Business card moved earlier on the I-75 shelf.
- Adding a Logo SKU requires a separate catalog decision from Tagia.

### After adding a service
- Needed one short confirmation — **Pass v1.**

### Duplicate labels
- Tablet duplicated Build Your Project while the panel did the same — **Pass v1:** tablet = status + open list.

---

## Separate defects (log only — not Pass v1)

1. Studio Review appears clickable in the Lobby.
2. Hydration “2 Issues” overlay interferes with testing — see below.
3. Board handoff reaches an abrupt sign-in wall without a Voice transition.
4. Intake tablet guidance is pointer-only.
5. Plan and Checkout have dual-CTA / narrator issues.

### Hydration overlay (cert note)

`StudioWorkspace.tsx` ~line 62 is **not** a `typeof window` branch; it is the tablet `role="region"` screen. React’s generic hydration message often lists `typeof window` as a possible cause; the stack frame is misleading.

Observed noise sources in prior certs:
- Cursor browser `data-cursor-ref` attribute injection
- Extension `fdprocessedid` attributes on inputs

**Certification:** Use a clean browser profile (extensions off, not the Cursor embedded browser) so the “2 Issues” gremlin is not sitting on the controls. A nearby `typeof window` check in `ConversationRoomRuntime` boot lives inside `useEffect` only and should not SSR-mismatch by itself.

---

## Pass v1 copy (Route + Services)

**Route (Business setup → Get My Business Started):**
> Based on what you told me, Get My Business Started is the strongest match. You can choose another route if something else fits better.

**Services:**
> You do not need everything here. Many new businesses begin with business cards and one promotional piece. You can add or remove services anytime before checkout.

**After add (example):**
> Make Me a Business Card has been added to your Studio Plan. You can keep building or review your selections whenever you're ready.

Rapid adds within ~4.5s stay visual-only so Voice lines do not stack. After a pause, the next add may speak briefly again. The full services explanation is spoken once on route confirm — not after every add.

---

## Next

After Route + Services cert: Plan + Checkout, then Intake + Board handoff.
