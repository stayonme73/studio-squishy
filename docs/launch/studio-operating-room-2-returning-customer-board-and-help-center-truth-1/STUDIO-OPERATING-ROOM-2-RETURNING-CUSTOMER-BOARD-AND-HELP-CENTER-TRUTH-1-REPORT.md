# STUDIO-OPERATING-ROOM-2-RETURNING-CUSTOMER-BOARD-AND-HELP-CENTER-TRUTH-1

**Package:** STUDIO-OPERATING-ROOM-2-RETURNING-CUSTOMER-BOARD-AND-HELP-CENTER-TRUTH-1  
**Room:** 2 — Customer-facing truth + friction cleanup  
**Status:** PARKED FOR MANAGER — **not CLOSED**  
**Room 2 closed:** **NO**  
**Section 2 closed:** **NO**  
**Do not auto-advance:** yes  
**Merge:** no  
**Owner routine:** NONE

Section 1 `STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1` is **CLOSED** at **`45b09b1`**. `90dcc84` remains an earlier PARK, not that close. This package starts only after that stamp.

Did **not** replay the first-time Lobby → checkout walk. Did **not** create a new paid order. Did **not** reopen Resend.

Evidence: `docs/launch/studio-operating-room-2-returning-customer-board-and-help-center-truth-1/customer-eyes/`

---

## Scope (this section only)

Returning Client → Studio Board → Help Center → stale “Ask Squishy” / legacy labels → Project Builder companion / redirect → communication-control clarity.

Method: **CUSTOMER-USE → FIND → FIX → BREAK → RETEST → PARK FOR MANAGER**

---

## Customer-eyes walk

**Result:** **9 / 9 PASS**. Non-blocking notes: **3**. Blocking pauses: **0**.

| Beat | What the customer could see / do |
|---|---|
| Lobby Returning Client | Sign In to access Studio Board. Separate from Let’s Get Started. No Squishy. |
| Sign In | Opens Board after sign-in. Mentions Help Center. No unfinished-build jargon. |
| Help Center | No Squishy. Email FAQ matches Board as source of truth. Refund language stays soft / per job. |
| `/project-builder` | Redirects to Conversation Room. Companion is not live. |
| `/route-map` | Redirects to Conversation Room. Locked Squishy Route Map copy is not visible. |
| Communication controls | Speak / Type live only on the permanent dock. Ask a question stays on the strip with a hint to use the dock. |
| Board / Project Record gate | Unsigned returning client is sent to Sign In. |

Signed-in Board chrome was **not** live-walked (no existing session; account creation was not used). The stale labels Maya already saw on Board — **Ask Squishy**, **CURRENT CAMPAIGN**, **New Campaign** — are removed in customer copy and locked by tests.

---

## Fixes found, then retested

1. **Ask Squishy** on Project Record is now **Ask the Studio**. Speaker label is Studio.
2. Board / Project Record **Campaign** jargon is now project language: Current Project, New Project, Project Journey, Open Project Record, Waiting to start.
3. Help Center email FAQ no longer says “in this version” or that mail is off. It matches checkout: Board is the source of truth; email is a courtesy. Dropped “test or external tool.”
4. Refund channel customer labels no longer say Squishy chat. Refund intake prompts no longer name Tagia’s desk.
5. Project Builder companion label is Studio (route already redirects).
6. Duplicate Speak / Type buttons removed from the Studio control strip. Ask a question remains, with a sentence pointing to the dock.
7. Dock Continue was being overwritten back to Send while answering. Restored so dock and tablet match.

---

## Customer friction log

| Where | Kind | Blocking? | Note |
|---|---|---|---|
| Signed-in Board | coverage | **No** | Live signed-in Board / Ask the Studio was not re-walked this park. Copy is locked; needs a signed-in customer session if Manager wants visual proof on that surface. |
| `/route-map` source | quarantined residue | **No** | Direct Route still names Squishy in locked Route Map source. Customer path redirects. Do not restyle Route Map. |
| Kitchen / Owner Console | later room | **No** | Staff Squishy language stays put. |

---

## Automated retest

Targeted vitest **50 / 50 PASS** (Section 1 close stamp, Section 2 returning-customer, Board overview signals, refund intake, Help Center nav).

Green checks are **not** a section close.

---

## What this package did **not** do

- Close Room 2 Section 2
- Reopen or restamp Section 1 except to record Tagia’s CLOSED stamp
- Fully close Room 1
- Close or rewrite `d6974eb`
- Create a new paid order
- Start Owner Console
- Change locked Route Map visuals
- Visual redesign
- Merge

---

## Next

Manager close review of this second Room 2 section. Do not auto-advance.
