# Final Cedric Usability Report — 2026-07-19

**Scope:** Intake + Board Handoff cold certification, then one uninterrupted Cedric think-aloud  
**Lobby → Discovery → Route → Services → Plan → Checkout → Intake → Sign In → Board**  
**Rules observed:** no coaching, no interface explaining while moving; Cursor browser used (not a clean Chrome profile — note under cosmetic).  
**Implementation freeze:** No product edits after this walk. This report is the sieve.

---

## Verdict (scorecard)

| Test | Result | Notes |
|------|--------|-------|
| Orientation | **Mostly pass** | Strong mid-journey; fails on post-complete blank tablet and Lobby CTA wording vs destination |
| Decision help | **Pass** (prior cold certs) | Route recommendation + Services guidance held on this walk |
| Editability | **Pass** | Plan Before Checkout + Checkout last-chance clear |
| Transition clarity | **Conditional pass** | Payment→Intake and Intake→auth Voice are clear; tablet Still needed is static; Sign In skipped when already authenticated |
| Recovery | **Partial fail** | Intake refresh without SAVE DRAFT loses typed fields; campaign/purchase preserve worked; Back/return purchase scope held in prior cert |
| Trust | **Pass with honesty** | Taxes/fees note; materials-later not error-styled; Developer Sandbox visible on Checkout |
| Completion | **Guided-test pass / public launch fail** | Seed login reaches Board; cold customer without account cannot complete |

---

## Launch blockers

1. **Authentication currently supports seeded test accounts only. Customer account creation and/or production authentication is required before public launch.**  
   A real cold customer who has no account cannot complete the journey. Do not disguise that with guidance copy.  
   **Handoff may pass as a guided test flow; public customer completion remains blocked.**

2. **Intake tablet Completed / Still needed / Next does not update as fields change** (static config lists). Cedric cannot tell from the tablet whether he is still blocked or merely being reminded of categories. Fails the “remain accurate as fields change” cert question.

3. **Intake typed values are not durable on refresh unless SAVE DRAFT is used** (no autosave). Prior cold-cert finding; still true. Violates recovery expectation for entered intake information.

---

## Serious confusion

1. **Post-complete Conversation Room tablet can be blank** (`data-stage=complete`, eyebrow only). On this walk, leftover complete state after clearing campaign left Cedric with no visible next step until **Start a new conversation**. Looks like a broken room, not a finished project.

2. **Intake primary CTA: “SAVE & CONTINUE TO STUDIO BOARD”** while the next real step is often **Sign In**. Cedric can believe the Board opens immediately; Voice then explains sign-in — mismatch between button and outcome when signed out.

3. **Already-authenticated session skips Sign In** after Intake submit (lands on `/studio-board` while handoff passport can still say `awaiting-signin`). Fine for a returning tester; confusing for cert expectations that always show the handoff Sign In surface. Cold unsigned path was verified separately and works.

4. **Lobby primary control aria copy** references “Studio Route Map” while navigation goes to **Conversation Room**. Harmless if unnoticed; misleading if Cedric reads the control name.

---

## Minor friction

1. Checkout **Developer Sandbox / Test continue to Project Intake** is visible — honest for this build, but cold Cedric may pause (“Is this fake?”). Trust-adjacent, not a blocker for sandbox journey testing.

2. Board greeting can show **“Good afternoon, Tagia”** after `client-a@local.dev` login (session/display identity quirk). Does not block Board use.

3. Board campaign title follows one service name (e.g. Flyer or Business Card) even when two services were purchased — plan still lists both; title feels incomplete.

4. Voice speaks a short add confirmation on each service add — within cooldown design; Cedric may still notice the second add speech.

5. Dual Continue buttons (comm panel + tablet) on Discovery — exploration, not true confusion once one works.

6. Intake status distinguishes “missing materials delay production” well in copy; tablet lists still never shrink after Cedric fills required fields — he re-reads Still needed unnecessarily.

---

## Cosmetic observations

1. Cursor / Next.js **hydration issues overlay** (`SignInScene`, OwnerQaPanel) during cert — not customer chrome; clean Chrome profile still required for owner visual cert.

2. Lobby copy “Welcome!Your creative journey…” missing space (pre-existing).

3. Highway internal label **I-75** still visible on Services panel chrome while tablet uses customer route label — prior pass intended Conversation Room customer labels; panel title remnant.

4. “Unsaved draft” status on Intake is useful; easy to miss next to the long form.

---

## Passed moments

### Intake (guided cert)

| Cedric question | Evidence |
|-----------------|----------|
| Why am I giving this information? | Tablet + panel: production framing; “help the Studio begin production” |
| What has already been completed? | Completed: Payment received, Services confirmed |
| What is still required? | Panel Required badges; Still needed categories (static) |
| What can I provide later? | “I do not have this yet” / “I will provide this later”; tip that missing ≠ erase purchase |
| What happens after I submit? | Voice: project created + sign-in for Board |
| Blocked vs informed? | Copy says missing delays production; submit enabled when required filled — **but tablet Still needed never clears**, so blocked-vs-informed is muddy on the tablet |

**Behaviors verified**

- Required vs Optional visually marked in field headings — **pass**
- “I do not have this yet” pressed state, not error styling — **pass**
- Multi-service (Flyer + Business Card) intake sections + shared materials once — **pass**
- Voice does not narrate every field — **pass** (one payment→intake line; one submit completion line)
- One useful completion transition speech — **pass** (not stacked)
- Submit path creates project + handoff passport — **pass** (prior + this walk)

**Behaviors failed / partial**

- Tablet status accuracy as fields change — **fail**
- Refresh preserves typed intake without SAVE DRAFT — **fail**
- Back/return preserves purchased scope — **pass** (prior cert + campaign intact on Board)

### Board handoff (guided cert)

| Check | Result |
|-------|--------|
| Before sign-in: project created, why sign-in, what Board is for, sign-in expected | **Pass** when handoff passport active (Studio Voice banner) |
| Handoff Voice only from completed Intake | **Pass** — normal `/sign-in` uses Client Access copy; `from=/studio-board` alone without passport does **not** claim project created |
| `from=/studio-board` survives refresh | **Pass** |
| Client Access link preserves `from=` | **Pass** (code: `ClientAccessStatePanel` → `/sign-in?from=…studioBoard`) |
| Failed auth keeps Board destination | **Pass** (`Invalid credentials`; URL still `from=/studio-board`) |
| Successful auth → `/studio-board` | **Pass** (seed `client-a@local.dev`) |
| Board welcome once | **Pass** (“You're all set…”) |
| Board refresh does not replay welcome | **Pass** (handoff consumed / null; no replay) |
| Leave/return no duplicate project records | **Pass** on observed campaign id continuity this session |
| Services + intake attached | **Pass** (both SKUs + intake answers on campaign) |

### Full think-aloud (highlights)

| Stage | Cedric (aloud) | Classification |
|-------|----------------|----------------|
| Lobby | “Looks like a lobby. Big start control.” | Orientation pass |
| Conversation Room after prior complete | “Tablet is empty. What do I do?” | **Serious** until Start new conversation |
| Discovery | Answers name / need / business; skips materials | Smooth; exploration on Skip |
| Route | “Recommended Get My Business Started — I’ll take that.” | Decision help pass |
| Services | “Cards and a flyer — that matches what I said.” Adds two | Pass; short add Voice |
| Plan | “$118, can still change, Continue to Checkout.” | Pass |
| Checkout | Notices taxes honesty + sandbox | Trust pass; sandbox pause = minor |
| Intake | “Why still needed if I filled things?” Re-reads status | **Serious** (static status) |
| Submit → Board (already signed in) | Hears project-created / sign-in Voice but is already on Board | Minor / conditional |
| Board | Sees project + materials still needed | Completion pass for guided auth |

---

## Intake + Board cold-cert gate summary

| Gate | Result |
|------|--------|
| Payment → Intake feels like production beginning | **PASS** |
| Tablet explains production status | **PARTIAL** — explains categories; does not stay accurate |
| Optional / required / later clear | **PASS** |
| Submit explains why sign-in | **PASS** |
| Sign-in banner matches Voice (handoff only) | **PASS** |
| Auth returns to Board | **PASS** (seed) |
| Board welcome once | **PASS** |
| Public customer can complete without seed account | **FAIL — launch blocker** |

**Intake + Board handoff: PASS as guided test flow. NOT ready for public launch.**

---

## Do not start next

No automatic edits from this report. Tagia prioritizes from launch blockers → serious confusion → minor friction. Tiny polish must wait until the sieve is applied deliberately.
