# STUDIO-OPERATING-ROOM-2-REVIEW-FINAL-DELIVERY-TRUTH-AND-FRICTION-1 REPORT

**Package:** STUDIO-OPERATING-ROOM-2-REVIEW-FINAL-DELIVERY-TRUTH-AND-FRICTION-1  
**Room:** 2 — Customer-facing truth + friction cleanup  
**Status:** PARK for Manager  
**Section 3 closed:** **NO**  
**Do not auto-advance:** yes  
**Merge:** no  
**Owner routine:** NONE

Maya fixture: Cedar & Bloom Home Organizing · Make Me a Flyer $69 · unique sandbox email. Room 1 machinery was used only as the existing Review/Delivery fixture. It was not reopened as a production rebuild.

Live evidence: `docs/launch/studio-operating-room-2-review-final-delivery-truth-and-friction-1/customer-walk/`

Prior closes remain: Section 1 `45b09b1` · Section 2 `e609203`. Ledger stamp `be8fd06` records Section 2 close and does not replace that tip.

---

## Live Review entry

**PASS.** Board told Maya Review was ready. Review Room opened on Make Me a Flyer, Cedar & Bloom, **Version 1**. Lead is now **Review your work**, not Feedback Studio. Copy tells the customer they can ask a question, request a revision, or approve this version.

## Version language

**PASS.** Version 1 is the current labeled proof. Voice answers “Which version am I looking at?” with Version 1 and no hash. Prior versions are labeled Current vs Prior. Identity/pins remain underneath.

## Question vs revision vs approval

**PASS and distinct.**

- **Ask a question** — Project Communication radio. Asking “Which version am I looking at?” did not create a revision use.
- **Mark section for changes** — section tool only.
- **Request a revision** — job action. Confirm: “You are requesting a revision of Version 1. This uses one included revision round.”
- **Approve this version** — job action. Confirm: “You are approving Version 1.” Confirm CTA: “Yes, approve this version.”

## Revision-allowance clarity

**PASS.** Rail is **Revision rounds** (Included / Used / Remaining), not correction-accounting jargon. Exhausted wording: “All included revision rounds have been used.” Request a revision disables. No new policy was invented. Sealed SKU remains 1 included round.

## Approval language

**PASS.** Confirmation names Version 1. It does not approve a future unnamed file. Stale second tab could not treat the old Review as equally approvable after approval.

## Final state

**PASS.** Final lead: “Review is complete. The Studio is preparing the files you will keep.” Downloads stay in Delivery. No fake final package. No QC/design-direction files.

## Delivery / download

**PASS after fix.** Flyer shows print-ready PDF + digital PNG for Version 1. Download buttons work (`pdf=true png=true`). No Download All. No MIME (`image/png` / `application/pdf`). No design-direction or QC rows as fake files.

First live pass showed **“Some of your files are ready / Other work is still with The Studio”** while both promised files were already downloadable, because completeness required staff `mark_delivered` and because the completed-deliverables list included the reviewed design slot as if it were a third file. That was a real customer-truth defect. Fixed narrowly:

- promised-file labels only (PDF + PNG)
- ready_for_delivery with all promised files released counts as customer-complete
- missing PDF then correctly falls back to Delivery in progress / some files ready

## Customer-facing terminology removed/fixed

- Feedback Studio → Review your work
- Correction rounds → Revision rounds
- Submit request changes / Submit approval → Send revision request / Yes, approve this version
- Duplicate Request Revision (section vs job) split
- Campaign leftovers on Review/Delivery chrome → project / Review Room / Project Record / START NEW PROJECT
- Voice hash (`sha256:…`) stripped from “which version did I approve”
- Internal quality-check Voice copy softened
- Delivery MIME → Print-ready PDF / Digital PNG
- Approval activity reason no longer says “release checks / candidate matches”

Help Center still says “each job” in locked policy copy. Left alone.

## Return later

**PASS.** Fresh sign-in still shows project complete, Version 1 files reachable, and no Approve-this-version demand.

## Communication / Help

**PASS.** Review keeps Ask a question vs Report a problem. Help Center opens. No Ask Squishy. Studio Review remains a development overlay only and was not treated as customer copy.

## Stale-version negative proof

**PASS.** Tab B kept the old Review open; after approval it could not approve that tab as current.

## Missing-file negative proof

**PASS.** Withholding the print PDF made Delivery say in progress / some files ready. It did not look like a successful two-file delivery. PDF restored for return-later.

## Defects found during the customer walk and fixes

1. Review chrome said Feedback Studio; job/section both said Request Revision; confirms said Submit.
2. Voice named hashes for the approved version.
3. Delivery listed the reviewed design as a completed deliverable beside PDF/PNG, then said other work was still with The Studio even though both promised files downloaded. Completeness now follows promised files, not staff mark_delivered.

## Automated totals

**118 / 118 PASS** on the scoped Review/Final/Delivery + Room 2 suite.

## Live customer-walk totals

**23 / 23 PASS.**

## Remaining Room 2 residue

- Help Center locked copy still uses “each job” in revision-policy FAQ.
- Update History can still show operational event text under the customer headlines.
- Concept-review preview section labels still include catalog names such as Campaign Strategy (not on the Maya flyer walk).
- Live Resend / branded sender remains parked at `d6974eb` and does not block this section.

## Owner dependence

**NONE.** Maya could tell which version she was reviewing, that a question is not a revision, that approval is this version, and which file is print vs digital.

## Final commit / push / sync

Park tip **`3328807`**. Pushed to `operating/design-renderer-proof-1`. **No merge.**

## Recommendation for the next Room 2 section

Do **not** start it automatically. After Manager review, the next logical customer-truth slice is **post-purchase Board status + return-later contradiction sweep across mixed project states** (Building Concepts vs Review vs Delivery on the same returning Board), still without Owner Console and without reopening Resend.
