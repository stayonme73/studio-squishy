# STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1 REPORT

**Package:** STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1  
**Room:** 1 — Customer Life + Communication (this section only)  
**Branch:** `operating/design-renderer-proof-1`  
**Scout status:** PARKED — ready for Manager visual review · **no merge**  
**Close rule used:** BUILD → BREAK → CUSTOMER-USE → FIX → RETEST  
**Previous section:** Studio Voice ↔ Machine ↔ Customer Communication = CLOSED (`4abc161`)

Maya fixture (unchanged): Maya Brooks · Cedar & Bloom Home Organizing · Back-to-School Reset · Make Me a Flyer / `v2-rtu-flyer` / Studio fee **$69**. Wordmark-only. Established facts only: 2-hour session $149, August 24 – September 14 2026, (804) 555-0186, cedarandbloom.example, CTA Book Your Reset. No new business facts. No Canva. No Make. No Owner Console. Lifecycle email was **not** started.

---

## A. Overall verdict

**READY FOR MANAGER CLOSE — LIVE MAYA REVIEW + REVISION LOOP PASSED 24/0**

Maya received her actual flyer, reviewed it, asked for one included change, saw acknowledgement, got Version 2 through Machine production + QA, re-reviewed the new file (not a stale cache), asked Studio from the record, exhausted the one included round, asked a question that did not become a revision, approved **Version 2 exactly**, and that exact hash became Final Delivery. Fresh browser return kept approval, revision history, and status.

Owner routine = **NONE**.

This section does **not** close Room 1. Next Room 1 section is Resend + lifecycle notifications + watchdog/failure drills. Do not start it until Tagia says so.

---

## B. Actual Maya flyer artifacts (look at the files)

Do not certify from metadata alone. These are the PNGs:

| Version | Launch copy (open this) | Hash (first 12) | What changed |
|---|---|---|---|
| 1 | `docs/launch/studio-operating-review-revision-full-loop-1/artifacts/maya-flyer-v1.png` | `0dd0ead533ba` | Headline is “Promotional flyer for Back-to-School Reset.” CTA is the navy **Book Your Reset** button. |
| 2 | `docs/launch/studio-operating-review-revision-full-loop-1/artifacts/maya-flyer-v2.png` | `5429a61f9497` | Headline is **Book Your Reset** (Maya’s included revision). Offer, price, dates, phone, web, CTA button unchanged. |

Live campaign for the passing walk: `maya-review-loop-1786812827368`  
Source Machine files (not committed; `data/` stays local):

- `data/campaign-design-artifacts/maya-review-loop-1786812827368/.../renders/v1/flyer.png`
- `data/campaign-design-artifacts/maya-review-loop-1786812827368/.../renders/v2/flyer.png`

Customer Review screenshots:

- `customer-board-walk/shots/01-board-review-ready.png`
- `customer-board-walk/shots/02-maya-reviews-real-flyer.png`
- `customer-board-walk/shots/03-revision-requested-ack.png`
- `customer-board-walk/shots/04-rereview-version-2.png`
- `customer-board-walk/shots/05-approved-exact-version.png`
- `customer-board-walk/shots/06-fresh-context-return.png`

---

## C. Production → QA → Review

Renderer success is **not** customer-ready.

| Proof | Result |
|---|---|
| Sealed Machine flyer path produced Maya’s PNG | PASS |
| Internal `qa_pass` recorded before Review | PASS |
| Review proof bytes presented from File Room | PASS |
| QA Review pin on the job (`ELIGIBLE_FOR_REVIEW`, `flyer-v1` then `flyer-v2`) | PASS |
| Board told Maya Review was ready | PASS |
| Voice: “Is my flyer ready for me to review?” → from record: she can review it now | PASS |

**Deliberate QA fail (earlier run of this package):** campaign `maya-review-loop-1786809577378` bound as `QA_FAILURE` / `qa_fail` because design-qa required `approvedIdentitySourceId` on a **wordmark-only** flyer. Review did not open. Fix: identity-source check only when the brief requires a logo variant. Later walks then `qa_pass`. Current passing walk started from that corrected gate — renderer success still does not equal Review.

---

## D. First revision

Maya’s request (existing facts only): **make Book Your Reset more prominent as the headline.**

Proved:

1. Coral sticky = revision request. Yellow/project question ≠ revision.
2. Submit request changes → PATCH `request_revision`.
3. Customer ack: “Revision requested — returning to production.”
4. Durable ledger: `jobCorrectionUses` length **1**.
5. Machine received the instruction (`machineFlyerRevisionEmphasis`) and re-rendered without Tagia relay.
6. Version 2 PNG hash **≠** Version 1.
7. Unrelated customer facts did not drift (price, dates, phone, web, offer).

---

## E. Customer acknowledgement + Voice after the change

| Maya asked | Answer |
|---|---|
| Did you receive my revision? | Yes. On the project record. (Still true after Version 2 is ready — not “unknown” just because spine left `revision_requested`.) |
| Did you make my requested change? | Yes. Record shows the requested change applied in the current version. |
| Which version am I looking at? | You are looking at **Version 2**, the current version on the project record. |
| How many changes do I have left? | No remaining rounds of the **1 included**. |

---

## F. Machine routing + revision QA + re-review

- Revision PATCH runs `ensureDispatchExecution` on the same project.
- New identity goes through QA again before Review proofs for Version 2 are presented.
- Old Version 1 PNG remains in the proof list. Version 2 is current (`You are reviewing Version 2`).
- Re-review is a reload of the customer Review Room, not a Kitchen-only refresh.

---

## G. Revision allowance

Frozen SKU: **one included revision round**. Not invented.

- Valid included revision consumed → remaining **0 of 1**.
- Job-level **Request Revision** disabled.
- Routine overage does not summon Tagia. Owner = NONE.

---

## H. Question vs revision vs approval

| Act | What happened |
|---|---|
| Project question “Do you need anything else from me?” **before** revision | Did not create a correction use. Spine stayed `ready_for_review`. |
| Coral sticky + Request Revision | Created the one included round. |
| Approve Section + Approve for Delivery | Bound Version 2. Not a revision. |

Those three states stay separate.

---

## I. Old-version trap

- After Version 2 exists, the Review preview current file is Version 2 (newest proof). Maya cannot silently approve Version 1 as “current.”
- Approval pin is `flyer-v2` / `sha256:5429a61f9497…` — the Version 2 bytes, not Version 1 `0dd0ead533ba`.
- Final Delivery files all carry that same approved hash. A Version 1 hash on delivery is rejected (`stale_version_cannot_win` PASS; CDF count 5, none are v1).
- Assemble refuses to build Final Delivery from Version 1 proofs when the pin is Version 2.

---

## J. Exact approval + exact Final Delivery

Live pin:

- `workVersionId`: **flyer-v2**
- `contentSha256`: `sha256:5429a61f9497981225629a631c85b09998eb28c2aeba4811c4a34db62c4a300e`
- `status`: CUSTOMER_APPROVED

Spine after approve: **`ready_for_delivery`**.  
`clientDeliveryFiles` hashes match the pin. Unapproved / missing / wrong hash fail closed.

Approval means this identity — not “whatever file is newest later.”

---

## K. Leave and return

Fresh Playwright context (empty cookies / localStorage): sign in → Review URL for the same job.

- Approval decision id preserved
- One correction use preserved
- Spine still `ready_for_delivery`
- Not localStorage-only

---

## L. Revision attachment finding

**Current Review does not support attaching a file to a revision.** No invent.

**Recommendation:** later enhancement, not a launch blocker for this SKU’s first included text/emphasis revision. If a later customer needs to attach a reference with a change, use the closed Materials capability as the storage/receipt path — do not fake an attach control in Review.

---

## M. Owner-dependence

**NONE.** Production, QA, Review, revision, re-QA, approval, and Final Delivery did not require Tagia.

---

## N. Customer friction found and fixed (this section)

| Defect Maya exposed | Fix |
|---|---|
| Review looked at receipt JSON instead of `flyer.png` | Observer / bind resolve the PNG path |
| QA pin stripped on Board job rebuild → Review 403 | Job sync copies QA / approval / final-delivery pins through |
| Wordmark flyer failed QA for missing logo identity | Identity source required only when a logo variant is required |
| Sticky “Place note” intercepted by comms banner | Force-safe click + panel stacking in the walk; sticky still customer-visible |
| Job Request Revision stayed disabled until round-trip | Enable from local revision intent |
| Session reset wiped in-progress notes | Reseed only on package identity / submitted |
| Catalog has 5 deliverable strings; submit required all five prepared | Presenting the sealed flyer marks the frozen-plan keys prepared from the same identity; customer Review still shows the proofed flyer |
| “Did you receive my revision?” became unknown after Version 2 | Answer from correction ledger / applied change, not only `revision_requested` spine |
| GET sync yanked Review back to `revision_requested` from stale `needs_revision` tasks, so Maya saw Version 2 but a submitted/locked package and could not approve | Keep `ready_for_review` when the QA pin is live; clear `needs_revision` after QA-pass present |
| Approve for Delivery stayed disabled until local section Approve | Local can-approve gate + wait for enabled |
| Final Delivery blocked because only one CDF existed for five frozen-plan keys | Assemble Final Delivery rows for every frozen-plan key, all bound to the **exact approved hash** |

Cosmetic redesign was not done. Remaining copy nits (section labeled from frozen plan as “One defined design direction”; C8b “Submitted to customer”) are existing Review language, not a new kitchen.

---

## O. One project truth

Compared across Machine bind, Voice answers, Board, production observer, QA records, Review proofs, correction ledger, approval pin, Final Delivery files.

Different wording is okay. No contradictory payment, version, allowance, or approved-hash facts on the passing walk.

---

## P. Break tests

Covered live or by unit on this package:

- Question mistaken for revision — live PASS
- Duplicate / exhausted second revision — job Request Revision disabled
- Refresh / reload during re-review — Version 2 shown
- Fresh browser after approve — preserved
- QA reject then pass — earlier wordmark QA fail, then pass
- Stale Version 1 approval / delivery — fail closed
- Exact final-delivery mismatch — fail closed

---

## Q. Remaining limits (do not pretend)

1. Frozen flyer plan lists five included slots (direction, design, print PDF, digital PNG, QC). Customer Review shows the flyer proof on the first prepared+proofed slot. Final Delivery writes five CDF rows, **all the approved PNG identity Maya signed**. A separately hashed print PDF is not what she approved in Review. SKU law was not rewritten.
2. Lifecycle email / Resend / watchdog is **next**, still Room 1. In-app Board + Voice + Review was enough to run this section.
3. Review has no revision file-attach control.
4. Room 1 is **not** closed. Whole-customer torture test still waits.

---

## R. Totals

| Suite | Result |
|---|---|
| Live Maya Review walk | **24 passed / 0 failed / 0 blocked** (`customer-board-walk/board-walk-evidence.json`) |
| Automated (maya-life, review-revision-full-loop, job-control, review-room, flyer-job-truth, design-quality) | **63 passed / 0 failed** |

---

## S. Recommendation for next Room 1 section

**START next (when Tagia says so, not automatically):**

`STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1`

Stay in Room 1. Do not start Owner Console, Room 2, or soft opening. Do not merge this branch unless separately authorized.

---

## T. Git / park

**Tip:** `3c90dc0`  
Parked after commit + push of this scoped package. Remote/local match is confirmed in the chat after push. **No merge.**
