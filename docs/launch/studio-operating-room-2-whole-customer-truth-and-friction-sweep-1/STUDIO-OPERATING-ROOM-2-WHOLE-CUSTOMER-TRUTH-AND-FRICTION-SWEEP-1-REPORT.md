# STUDIO-OPERATING-ROOM-2-WHOLE-CUSTOMER-TRUTH-AND-FRICTION-SWEEP-1 REPORT

**Package:** STUDIO-OPERATING-ROOM-2-WHOLE-CUSTOMER-TRUTH-AND-FRICTION-SWEEP-1  
**Room:** 2 — Customer-facing truth + friction cleanup  
**Status:** PARK for Manager  
**Section 5 closed:** **NO**  
**Room 2 closed:** **NO** — this is the last planned Room 2 section, parked for the closeout call  
**Do not auto-advance:** yes  
**Do not start Owner Console / Room 3:** yes  
**Merge:** no  
**Owner routine:** NONE

Front-door fixture: Jordan / Hale Weekend Bakery through hosted checkout handoff. No new Stripe charge.

Paid spine fixture: Maya Brooks · Cedar & Bloom Home Organizing · Make Me a Flyer $69. Two linked Maya records on one account so Review could bind without repeating Stripe certification.

Live evidence: `docs/launch/studio-operating-room-2-whole-customer-truth-and-friction-sweep-1/customer-walk/`

Prior closes remain: Section 1 `45b09b1` · Section 2 `e609203` · Section 3 `3328807` · Section 4 `6cf9ca0`.

Email remains **🟡 COME BACK LATER / PARKED WITH EXTERNAL PREREQUISITE** at `d6974eb`. Neither PASS nor FAIL for this sweep.

---

## Complete customer journey chronology

1. Lobby — first-time Let’s Get Started vs Returning Client Sign In  
2. Conversation Room — Speak / Type  
3. Route recommendation — Suggested starting point  
4. Service selection — Make Me a Flyer $69  
5. Studio Plan review  
6. Hosted checkout handoff — Open checkout vs Continue to secure checkout; unpaid until Stripe  
7. Signed-in Maya Board — paid, Project Intake still needed  
8. Materials — wordmark-only flyer; optional Add more; unsupported `.exe` rejected  
9. Help Center  
10. Production underway — Building Concepts  
11. Stale intake tab after production begins  
12. Project Record agrees with Board  
13. Revision in progress — no Open Review Room  
14. Review-ready Board + Voice  
15. Review Room — Version 1, Ask a question / Request a revision / Approve this version  
16. Revision confirm, then keep reviewing and approve Version 1  
17. Board after approval — Final Delivery ready  
18. Final — Review is complete, preparing files, no downloads yet  
19. Stale Review tab after approval  
20. Delivery — Print-ready PDF + Digital PNG  
21. Fresh-context return later — same project, files remain, no unfinished Review action  

---

## First-time entry result

**PASS.** Let’s Get Started is the new-customer start. Returning Client is Sign In, not a competing first-time CTA. Speak and Type are both present. Route stays a suggestion. Selected service and $69 are obvious on details and Studio Plan. Open checkout and Continue to secure checkout are distinct. Checkout names Stripe and does not claim payment already happened. No forbidden residue on Lobby.

Acceptable: Conversation Room portrait tablet can clip the Checkout heading at this chrome. The full checkout panel still states the unpaid-until-Stripe rule in complete sentences. Not a launch blocker. Not a Conversation Room redesign.

---

## Post-pay / intake result

**PASS.** Paid Maya Board is Waiting on Project Intake / Complete Project Intake. Voice: payment is confirmed and Project Intake is still needed. No fake project-created or production-started claim. Wordmark-only flyer does not demand a logo.

---

## Materials result

**PASS after fix.** Real file picker works. Unsupported `.exe` is rejected immediately with a useful next-step list. Duplicate path does not add jargon. Received ≠ approved remains in source copy. Optional logo/photo no longer look like a current Studio need: missing optional items are labeled **Optional**, they sit under **Add more (optional)** instead of expanding as Still needed, and the tab says **Materials caught up** when nothing required is blocking.

This sweep did not reopen Materials architecture. Send-to-Studio receipt remains previously certified.

---

## Board / Project Record result

**PASS after fix.** Current Project / New Project / Open Project Record language is present. No Current Campaign / Ask Squishy residue on the signed-in Board. Board and Project Record agreed on Building Concepts. Ask a question stays distinct from Report a problem. Refund no longer prefixes the service as “Job:”.

After approval, current status is Final Delivery ready / Open Final Delivery / nothing required. Return-later Board matches.

---

## Voice / status result

**PASS after fix.** Board + Project Record + Voice stayed on one current meaning when asked about the project under view:

| Question | Current answer |
|----------|----------------|
| What is happening with my project? | Intake still needed (paid, pre-intake) |
| Do you need anything from me? | Project Intake |
| Has work started? | Work has started; Review not claimed open |
| Did you receive my revision? | Received; Review not claimed open |
| Is my work ready to review? | You can review it now. Open the Review Room from your Studio Board. |
| Are my final files ready? | Final files are ready in Final Delivery |

Voice no longer says “Review is not open yet” when the Machine spine is `ready_for_review`. Notification/email failure was not treated as current project status. Email was not reopened.

---

## Help / problem-reporting result

**PASS.** Help Center stays job-free. Ask a question vs Report a problem remains distinct. No Ask Squishy. No “each job” on the live Help path.

---

## Review result

**PASS.** Customer sees Make Me a Flyer, Cedar & Bloom, Version 1, Ask a question, Request a revision, Approve this version. No hash / QA / Squishy residue. Revision confirm names Version 1 and the included round.

---

## Revision / re-review result

**PASS.** Revision-in-progress Board says Review will open again when the new version is ready. Open Review Room is not the main next action. The live Review path used Keep reviewing then approved Version 1 rather than waiting on a second renderer cycle. That does not reopen Section 3 machinery.

---

## Approval / Final result

**PASS after fix.** Approval confirmation names the customer-visible version. After approval, Board is Final Delivery ready, not Open Review Room. Final says Review is complete and files are being prepared; downloads are not offered there.

A stale Review tab after approval previously still said **Ready for review / You are reviewing Version 1** while the sidebar said Approved. That was a genuine mixed-state defect. After the fix, the same tab says **Approved. The Studio is preparing your final files from the exact version you approved** and **You approved Version 1**. Request a revision and Approve this version stay disabled.

Acceptable: that historical URL still uses REVIEW ROOM chrome. Current Board truth is Final Delivery. Downloads live on Delivery / Open Final Delivery.

---

## Delivery result

**PASS.** One approved design → Print-ready PDF + Digital PNG, Version 1. What was bought, approved, and offered for download agree. No Download All. No QC / design-direction fake files. No MIME/provider jargon. Incomplete delivery does not look complete on this flyer path.

Acceptable: the walk opened Review-room `roomState=delivery`, which still titles REVIEW ROOM. The customer Board CTA is Open Final Delivery.

---

## Return-later result

**PASS.** Fresh browser context, sign in again: same Cedar & Bloom project, Final Delivery ready, files remain, Review is not recreated as an unfinished action.

---

## Stale-tab / mixed-state results

**PASS after fix.**

- Intake tab after production begins follows Building Concepts; Complete Project Intake does not remain the current action.  
- Review tab after approval is historical, not actionable, and no longer claims Ready for review.  
- Board after Final Delivery is Final Delivery ready.  
- Two Maya records on one account required a sign-in refresh so Current Project followed the Review fixture. A single-project customer does not hit that. Mixed projects on one Board remain a later concern, not a Maya flyer launch blocker.

---

## Terminology sweep

**Fixed on the live path:**

- Refund “Job:” / “Select a job” → service language  
- Optional materials “Still needed” → Optional, under Add more  
- Materials sync copy “this campaign” → “this project”  
- Stale Review “Ready for review” after approval → approved / you approved Version 1  

**Reachable and left as acceptable / dormant:**

- OwnerQaPanel **STUDIO REVIEW** — development overlay only  
- Campaign Strategy preview labels — limited SKU `cp-001`, not the Maya flyer path  
- Internal `jobId` / Kitchen / QA identifiers in code, logs, and Owner surfaces  
- Historical Voice thread on Board still showing an earlier “you can review it now” after the project has moved on. Current status overlay is the authority.

---

## Friction findings + classifications

| Finding | Classification |
|---------|----------------|
| Unsupported `.exe` looked selectable until Send | **Launch blocker** — fixed; immediate rejection |
| Voice said Review was not open while Board said Open Review Room | **Launch blocker** — fixed; `ready_for_review` spine is review-eligible |
| Refund single-service line said “Job:” | **Important** — fixed; Section 4 residue |
| Optional logo/photo showed Still needed after materials were caught up | **Important** — fixed |
| Stale Review tab after approval still said Ready for review | **Important** — fixed |
| Two-project walk fixture / session cookie current project | **Acceptable** — walk fixture; mixed projects later |
| Conversation Room tablet can clip Checkout heading | **Acceptable** — full checkout panel remains complete |
| Historical Review URL after approval still titled REVIEW ROOM | **Acceptable** — actions disabled; Board is current |
| Campaign Strategy labels | **Dormant** — limited SKU |
| STUDIO REVIEW badge | **Dormant / dev-only** |
| Live Resend / branded sender / inbox proof | **Deferred** — `d6974eb`, neither PASS nor FAIL |

No remaining launch blocker on the live customer spine walked here.

---

## Defects found and fixed

1. **Unsupported material files.** `MaterialsIntakePanel` now rejects through `isAllowedCustomerMaterialFile` on select, matching the store.  
2. **Voice vs Board on Review-ready.** `assembleCustomerLifeTruth` treats Machine `spineStatus === "ready_for_review"` as review-eligible so Voice does not dump “Review is not open yet.”  
3. **Refund “Job:” on the live Board.** Section 4 missed the single-service meta line and the select placeholder. Narrow repair inside this package.  
4. **Optional materials looking required.** Missing optional items are Optional; Add more starts collapsed; caught-up tab when nothing required is blocking.  
5. **Stale Review after approval looking current.** Closed spines use approved copy and “You approved Version 1,” not Ready for review.

Earlier closed sections were not broadly reopened. Items 3–5 are proven live-path residues from Sections 2–4, repaired narrowly here.

---

## Explicit deferred Resend / domain note

Live Resend / branded sender / inbox proof remains **PARKED WITH EXTERNAL PREREQUISITE** at `d6974eb` (`STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1`). Not closed. Do not fake. This yellow sticky **does not block Room 2** and **is neither PASS nor FAIL for this sweep.** Room 1 stays **COMPLETE EXCEPT DEFERRED EXTERNAL DOMAIN/EMAIL**.

---

## Automated totals

**111 / 111 PASS** on the scoped Room 2 / Voice / materials / Review suite.

## Live-walk totals

**46 / 46 PASS · 0 FAIL · 0 BLOCKED.**

---

## Owner-dependence result

**NONE.** A normal customer can read where to start, what is selected, whether they have paid, what The Studio needs, where to ask, which version they are reviewing, what they approved, and where to download files without Tagia translating status or naming the next click.

Routine interpretation is not required. Email identity still is, and that remains the parked Room 1 sticky.

---

## Final Room 2 verdict

**ROOM 2 READY TO CLOSE WITH EXPLICIT NON-BLOCKING LIMITS**

A normal customer can move from first entry through return-after-delivery without inside knowledge, without resolving contradictory current status, and without depending on Tagia for routine help.

Explicit non-blocking limits:

1. Branded email / domain remains parked at `d6974eb` — neither PASS nor FAIL.  
2. Mixed projects on one returning Board / session current-project pointer are not certified here.  
3. Campaign Strategy labels remain for a limited SKU, not the launch flyer path.  
4. Historical Review chrome after approval may still exist; it is not actionable current truth.  
5. Conversation Room tablet Checkout heading can clip; the pay rule remains readable.

Do **not** close Room 2 automatically because tests are green. This section is **PARK for Manager**. If Tagia accepts this sweep, the actual Room 2 closeout call can be made. After that, Room 3 is Owner Console.

**Do not start Owner Console or Room 3 from this package.**

---

## Final commit / push / sync

Park tip **`b3397a6`**. Pushed to `operating/design-renderer-proof-1`. **No merge.**
