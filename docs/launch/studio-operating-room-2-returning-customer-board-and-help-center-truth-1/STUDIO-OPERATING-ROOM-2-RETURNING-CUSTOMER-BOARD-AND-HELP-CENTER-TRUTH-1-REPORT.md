# STUDIO-OPERATING-ROOM-2-RETURNING-CUSTOMER-BOARD-AND-HELP-CENTER-TRUTH-1

**Package:** STUDIO-OPERATING-ROOM-2-RETURNING-CUSTOMER-BOARD-AND-HELP-CENTER-TRUTH-1  
**Room:** 2 — Customer-facing truth + friction cleanup  
**Status:** PARKED FOR MANAGER — **not CLOSED**  
**Room 2 closed:** **NO**  
**Section 2 closed:** **NO**  
**Do not auto-advance:** yes  
**Merge:** no  
**Owner routine:** NONE

Section 1 `STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1` is **CLOSED** at **`45b09b1`**. `90dcc84` remains an earlier PARK, not that close.

Did **not** replay the first-time Lobby → checkout walk. Did **not** create a new paid order. Did **not** reopen Resend. Did **not** start the next Room 2 section.

Unsigned returning-customer evidence: `docs/launch/studio-operating-room-2-returning-customer-board-and-help-center-truth-1/customer-eyes/`  
Signed-in Board evidence: `docs/launch/studio-operating-room-2-returning-customer-board-and-help-center-truth-1/customer-board-walk/`

---

## Scope (this section only)

Returning Client → Studio Board → Help Center → stale “Ask Squishy” / legacy labels → Project Builder companion / redirect → communication-control clarity.

Method: **CUSTOMER-USE → FIND → FIX → BREAK → RETEST → PARK FOR MANAGER**

---

## Customer-eyes walks

### Unsigned returning-customer walk (kept)

**Result:** **9 / 9 PASS**. Non-blocking notes from that park remain below.

### Signed-in Studio Board walk (this continuation)

**Result:** **17 / 17 PASS**.

Maya fixture: Cedar & Bloom Home Organizing · Make Me a Flyer $69 · unique sandbox email · no new Stripe checkout · no Resend. Board opened at `/studio-board`.

| Check | Result |
|---|---|
| Sign-in opens Studio Board | PASS |
| Current Project | PASS |
| New Project | PASS |
| View submitted project details / Open Project Record | PASS |
| No Ask Squishy / Current Campaign / New Campaign residue | PASS |
| Project communication + Ask a question | PASS |
| Speak / Type stay off the Board | PASS |
| Review / Delivery not claimed ready while Current Status is Project Intake Received | PASS |
| Project Record shows Ask the Studio | PASS |
| Project Record does not tell Maya to open Review now | PASS |
| Help Center email FAQ: Board is the source of truth | PASS |
| Fresh return to Board | PASS |
| New browser, same Board | PASS |

Shots: `customer-board-walk/shots/` · JSON: `customer-board-walk/board-walk-evidence.json`

---

## Fixes found, then retested

First park (kept):

1. **Ask Squishy** on Project Record is now **Ask the Studio**. Speaker label is Studio.
2. Board / Project Record **Campaign** jargon is now project language: Current Project, New Project, Project Journey, Open Project Record, Waiting to start.
3. Help Center email FAQ no longer says “in this version” or that mail is off. It matches checkout: Board is the source of truth; email is a courtesy. Dropped “test or external tool.”
4. Refund channel customer labels no longer say Squishy chat. Refund intake prompts no longer name Tagia’s desk.
5. Project Builder companion label is Studio (route already redirects).
6. Duplicate Speak / Type buttons removed from the Studio control strip. Ask a question remains, with a sentence pointing to the dock.
7. Dock Continue was being overwritten back to Send while answering. Restored so dock and tablet match.

This signed-in Board continuation:

8. Board next-step copy no longer says “campaign” (“begin your project” / “building your concepts”).
9. Current Project stays on screen: the project grid cannot collapse to zero under Project communication / Refund Request, and the Current Project card can scroll so **View submitted project details** is reachable.
10. Project Record journey only shows the Review “open now” hint on the current step. Upcoming Ready for Review no longer tells Maya to open Review.
11. Timeline **Campaign created** is now **Project created**.
12. Project Record Current Status uses the same Board overlay, so Maya saw **Project Intake Received** on both surfaces instead of Building Concepts on the Record while the Board said intake received.

---

## Customer friction log

| Where | Kind | Blocking? | Note |
|---|---|---|---|
| `/route-map` source | quarantined residue | **No** | Direct Route still names Squishy in locked Route Map source. Customer path redirects. Do not restyle Route Map. |
| Kitchen / Owner Console | later room | **No** | Staff Squishy language stays put. |
| Board screenshot height | evidence | **No** | One-screen Board puts communication under the grid. Card-level shots are in `01b` / `01c`. |

---

## Automated retest

Previous park: targeted vitest **50 / 50 PASS**.

This continuation: targeted vitest **59 / 59 PASS** (Section 1 close stamp, Section 2 returning-customer, Board overview / next-action / post-submit signals, Project Record view, refund intake, Help Center nav).

Green checks are **not** a section close.

---

## What this package did **not** do

- Close Room 2 Section 2
- Reopen or restamp Section 1
- Fully close Room 1
- Close or rewrite `d6974eb`
- Create a new paid Stripe order
- Start Owner Console
- Change locked Route Map visuals
- Visual redesign
- Merge
- Start the next Room 2 section

---

## Next

Manager close review of this second Room 2 section. Do not auto-advance.
