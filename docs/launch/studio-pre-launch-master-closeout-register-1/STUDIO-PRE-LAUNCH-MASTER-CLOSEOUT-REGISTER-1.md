# STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1

**Package:** `STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1`  
**Status:** **ACTIVE_REGISTER** · **NOT_AN_EXECUTION_PACKAGE**  
**Base tip:** `92f47e200ab59979a2c8b16e813abfef9e067765`  
**Branch:** `operating/pre-launch-master-closeout-register-1`  
**Config:** `src/config/studio-pre-launch-master-closeout-register-v1.ts`  
**Authority:** Tagia — register construction with sequencing corrections  

**GIANT WARNING:** This register preserves and sequences remaining work. It does **not** authorize execution of future packages.

Do not start any listed certification or production package without separate Owner authorization. Every future area carries `doNotStartWithoutOwnerAuthorization: true`.

---

## Protected control point

| Control | Truth |
|---------|-------|
| Room 4B | CLOSED |
| Room 4C | CLOSED WITH EXPLICIT LIMITS at `92f47e2` |
| Room 4 | OPEN |
| Room 5 | NOT_STARTED |
| Scenario 1 Cedar Lane | PASS WITH EXPLICIT LIMITS |
| Scenario 2 Harbor Roast | PASS WITH EXPLICIT LIMITS |
| Scenario 3 Moss & Thread | PASS WITH EXPLICIT LIMITS |
| Carousel | NOT ON LAUNCH MENU |
| Merge | none |

Room 4C closeout: `docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/STUDIO-OPERATING-ROOM-4C-CLOSEOUT.md`

---

## Mandatory carry-forward truths

1. Launch Now services remain READY WITH EXPLICIT LIMITS.
2. Carousel remains NOT ON LAUNCH MENU.
3. Room 4C is complete and must not be reopened casually.
4. Dedicated mobile certification remains required before Room 4 closes.
5. External real-customer photo submission and rights verification remain unproven.
6. Independent AI voice-naturalness QA remains not certified.
7. Synthetic narration requires customer listening until that QA exists.
8. Music licensing remains constrained by recorded Eleven Music Starter boundaries.
9. Customer review is not owner production labor.
10. Existing Customer-One E2E remains COMPLETE_AND_FROZEN and is not the Owner-as-Customer Real Studio Campaign.
11. The three fictional Room 4C scenarios do not replace the real Studio pre-launch campaign.
12. Public website transition is Room 5 and is required before controlled soft opening — not post-launch maturity.
13. Room 5 is not started.
14. No merge is authorized.

---

## Classification vocabulary

Exactly one per area:

- `COMPLETE_AND_FROZEN`
- `COMPLETE_WITH_EXPLICIT_LIMITS`
- `PARTIALLY_PROVEN`
- `REQUIRED_NOT_STARTED`
- `PARKED_BY_SEQUENCE`
- `BLOCKED_OWNER_DECISION`
- `BLOCKED_EXTERNAL_DEPENDENCY`
- `NOT_REQUIRED_FOR_LAUNCH`

---

## Register areas (20 + cross-cutting gate)

### Cross-cutting gate (launch-critical)

#### X. External Customer Content Intake and Rights Certification

| Field | Value |
|-------|-------|
| Classification | REQUIRED_NOT_STARTED |
| Current truth | Studio-generated certification fixtures (Room 4B/4C) do **not** prove the external customer upload/rights path. |
| Evidence | Room 4C closeout limits 4–5; production-assurance rights packages (internal/kitchen — not customer-route proof) |
| Do not reopen | Room 4C Scenario 3 as substitute proof |
| Remaining gap | Full customer-route upload → identity/SHA → ownership → campaign/crop permissions → likeness/privacy → third-party IP → accept/reject/quarantine → cleared-to-production / uncleared-blocked → durable rights records |
| Risk if omitted | Photo-led Launch Now work can accept customer photos without a truthful cleared path; mobile upload cert would be false |
| Dependencies | None for starting design; must complete **before** mobile journey certification can truthfully certify uploads |
| Sequence | **A — before Room 4 closes** (required while photo-led work remains on Launch Now) |
| Proposed package | `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1` |
| Owner decision | Confirm Launch Now continues to accept customer-photo-led work (default: yes → this gate required) |
| doNotStartWithoutOwnerAuthorization | true |
| Close condition | All listed rights/intake proofs pass on the actual customer route |
| Soft-open | Required before Room 4 close if customer-photo-led remains accepted |

---

### 1. Room 4C Multi-Service Client Gauntlet

| Field | Value |
|-------|-------|
| Classification | COMPLETE_WITH_EXPLICIT_LIMITS |
| Current truth | Closed at `92f47e2`. Scenarios 1–3 PASS WITH EXPLICIT LIMITS. Owner production labor: none. |
| Evidence | `STUDIO-OPERATING-ROOM-4C-CLOSEOUT.md`; tip `92f47e2` |
| Do not reopen | Yes — unless genuine defect |
| Remaining gap | None for package promise; carry-forwards remain |
| Sequence | Complete |
| Proposed package | n/a |
| doNotStartWithoutOwnerAuthorization | true (reopen only) |
| Soft-open | Preserve |

### 2. Full mobile customer-journey certification

| Field | Value |
|-------|-------|
| Classification | REQUIRED_NOT_STARTED |
| Current truth | Room 4C mobile notes are responsive coverage only. |
| Evidence | S1–S3 `MOBILE-RESPONSIVE-OBSERVATIONS.md` |
| Remaining gap | Phone cert for hire, communication, uploads, feedback, approval, delivery |
| Dependencies | **Requires gate X first** (external content intake/rights) so upload certification is truthful |
| Sequence | **A — before Room 4 closes** (after X) |
| Proposed package | `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1` |
| Collision check | No existing `room-4d` / `mobile-customer-journey` package branch; do **not** auto-assign Room 4D/4E labels |
| doNotStartWithoutOwnerAuthorization | true |
| Soft-open | Required before Room 4 close |

### 3a. Studio name and core identity

| Field | Value |
|-------|-------|
| Classification | BLOCKED_OWNER_DECISION |
| Current truth | Final public Studio name/core identity not Owner-settled for launch surfaces |
| Remaining gap | Settled name/identity for campaign, promotion, website, brand presentation |
| Sequence | Before Owner-as-Customer Real Studio Campaign; before public promotion; before final public website; before branded email activation |
| Proposed package | `STUDIO-OPERATING-STUDIO-NAME-AND-CORE-IDENTITY-1` |
| Owner decision | Required |
| doNotStartWithoutOwnerAuthorization | true |
| Soft-open | Required before Owner-as-Customer campaign and soft opening |

### 3b. Domain, branded email, and sender verification

| Field | Value |
|-------|-------|
| Classification | BLOCKED_EXTERNAL_DEPENDENCY |
| Current truth | Room 1 yellow sticky: branded domain/email PARKED_WITH_EXTERNAL_PREREQUISITE at `d6974eb` |
| Evidence | `docs/launch/studio-operating-room-1-customer-life-closeout-v1.md`; launch-readiness locked board |
| Dependencies | Purchased/verified domain + business email identity; name/identity should be settled first |
| Sequence | Required before controlled soft opening (branded sender needs) |
| Proposed package | Resume `STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1` when identity exists |
| doNotStartWithoutOwnerAuthorization | true |
| Soft-open | Required before soft opening where branded email is launch-necessary |

### 4. Customer-facing public website transition

| Field | Value |
|-------|-------|
| Classification | PARKED_BY_SEQUENCE — ROOM 5 |
| Current truth | Room 5 NOT_STARTED. Soft-opening preparation room. |
| Evidence | `docs/launch-readiness-execution-order-v1-locked.md` room 5 |
| Remaining gap | Public customer-facing site transition |
| Sequence | **D — before controlled soft opening** (not post-launch maturity) |
| Proposed package | Room 5 opening package (name deferred until Room 5 authorization) |
| doNotStartWithoutOwnerAuthorization | true |
| Soft-open | **Required before controlled soft opening** |
| Post-launch maturity | **No** — do not classify here |

### 5. Payment, pricing, refunds/cancellations, and profitability

| Field | Value |
|-------|-------|
| Classification | PARTIALLY_PROVEN |
| Current truth | Stripe hosted Checkout payment truth sealed; Help Center refund policy locked; profitability/cost-floor incomplete |
| Evidence | `studio-operating-payment-truth-1` tip `82ce432`; Help Center V1; refund inspect docs |
| Remaining gap | Pricing completeness, profitability/cost-floor verification, refund/cancellation operational proof under launch conditions |
| Sequence | Map gaps early; **must be settled before outside-customer trial** |
| Proposed package | `STUDIO-OPERATING-PAYMENT-PRICING-REFUND-PROFITABILITY-LAUNCH-MINIMUM-1` |
| doNotStartWithoutOwnerAuthorization | true |
| Soft-open | Minimums before trial; remainder before soft opening if needed |

### 6. Studio Voice customer-service certification

| Field | Value |
|-------|-------|
| Classification | PARTIALLY_PROVEN |
| Evidence | Voice↔Machine↔customer communication packages; Conversation Room doctrine |
| Remaining gap | Dedicated customer-service readiness certification |
| Sequence | Before Owner-as-Customer Real Studio Campaign |
| Proposed package | `STUDIO-OPERATING-STUDIO-VOICE-CUSTOMER-SERVICE-CERTIFICATION-1` |
| doNotStartWithoutOwnerAuthorization | true |

### 7. Machine full-function certification (Launch Now limits)

| Field | Value |
|-------|-------|
| Classification | PARTIALLY_PROVEN |
| Current truth | Kitchen + Launch Now services READY WITH EXPLICIT LIMITS; not a full-function stamp |
| Sequence | Before Owner-as-Customer Real Studio Campaign |
| Proposed package | `STUDIO-OPERATING-MACHINE-LAUNCH-NOW-FULL-FUNCTION-CERTIFICATION-1` |
| doNotStartWithoutOwnerAuthorization | true |

### 8. Voice ↔ Machine ↔ Team communication stress testing

| Field | Value |
|-------|-------|
| Classification | PARTIALLY_PROVEN |
| Evidence | Room 1 / Voice-Machine packages; Room 3 desk |
| Remaining gap | Dedicated stress suite |
| Sequence | Before Owner-as-Customer Real Studio Campaign |
| Proposed package | `STUDIO-OPERATING-VOICE-MACHINE-TEAM-STRESS-1` |
| doNotStartWithoutOwnerAuthorization | true |

### 9. Complete AI-team roster and role boundaries

| Field | Value |
|-------|-------|
| Classification | REQUIRED_NOT_STARTED |
| Sequence | Before Owner-as-Customer Real Studio Campaign |
| Proposed package | `STUDIO-OPERATING-AI-TEAM-ROSTER-AND-ROLE-BOUNDARIES-1` |
| doNotStartWithoutOwnerAuthorization | true |

### 10. Team orientation before live customer work

| Field | Value |
|-------|-------|
| Classification | REQUIRED_NOT_STARTED |
| Sequence | Before Owner-as-Customer Real Studio Campaign |
| Proposed package | `STUDIO-OPERATING-TEAM-ORIENTATION-BEFORE-LIVE-CUSTOMERS-1` |
| doNotStartWithoutOwnerAuthorization | true |

### 11. Failure / recovery scenarios and escalation testing

| Field | Value |
|-------|-------|
| Classification | PARTIALLY_PROVEN |
| Evidence | Room 3 Owner Console escalation/recovery notes |
| Sequence | Before controlled outside-customer trial |
| Proposed package | `STUDIO-OPERATING-FAILURE-RECOVERY-ESCALATION-CERTIFICATION-1` |
| doNotStartWithoutOwnerAuthorization | true |

### 12. Security, customer-data handling, backup, and recovery

| Field | Value |
|-------|-------|
| Classification | REQUIRED_NOT_STARTED (launch-safe minimum) |
| Sequence | Launch-safe minimum before Owner-as-Customer; reinforced before outside trial and soft opening |
| Proposed package | `STUDIO-OPERATING-SECURITY-DATA-BACKUP-LAUNCH-MINIMUM-1` |
| Post-launch maturity | Broader security beyond minimum only |
| doNotStartWithoutOwnerAuthorization | true |

### 13. Terms, privacy, IP/customer-content, and operational policies

| Field | Value |
|-------|-------|
| Classification | PARTIALLY_PROVEN |
| Evidence | Help Center V1 locked (`docs/help-center-v1-locked.md`) |
| Remaining gap | Launch confirmation of terms/privacy/IP/customer-content against live operations |
| Sequence | Before controlled outside-customer trial |
| Proposed package | `STUDIO-OPERATING-POLICY-LEGAL-LAUNCH-CONFIRMATION-1` |
| doNotStartWithoutOwnerAuthorization | true |

### 14. Standardized final-file delivery and customer records

| Field | Value |
|-------|-------|
| Classification | PARTIALLY_PROVEN |
| Evidence | Room 2 review/final delivery truth packages |
| Sequence | Contract before Owner-as-Customer; operational proof before outside trial |
| Proposed package | `STUDIO-OPERATING-FINAL-FILE-AND-CUSTOMER-RECORD-CONTRACT-1` |
| doNotStartWithoutOwnerAuthorization | true |

### 15. Capacity, queue, deadline, and overload rules

| Field | Value |
|-------|-------|
| Classification | PARTIALLY_PROVEN |
| Evidence | Room 3 capacity signals |
| Sequence | Before controlled outside-customer trial |
| Proposed package | `STUDIO-OPERATING-CAPACITY-QUEUE-DEADLINE-OVERLOAD-1` |
| doNotStartWithoutOwnerAuthorization | true |

### 16a. Customer-One E2E (frozen baseline)

| Field | Value |
|-------|-------|
| Classification | COMPLETE_AND_FROZEN |
| Current truth | Browser-certified with explicit limits. Journey sandbox. **Not** the real Studio campaign. |
| Evidence | `docs/launch/CUSTOMER-ONE-E2E-CERT-1.md`; tip `d39165b` product / worktree `cert/customer-one-e2e-1` |
| Do not reopen | Yes |
| Do not relabel as incomplete | Yes |
| Sequence | Complete |

### 16b. Owner-as-Customer Real Studio Campaign

| Field | Value |
|-------|-------|
| Classification | REQUIRED_NOT_STARTED |
| Current truth | Tagia hiring the Studio to produce the Studio’s genuine pre-launch campaign. Additional operational proof — **not** a replacement for frozen Customer-One E2E. |
| Remaining gap | Real Studio campaign production + fulfillment under Launch Now limits |
| Dependencies | See “Before Owner-as-Customer” gate list below |
| Sequence | After Room 4 close prerequisites + B-gate readiness; before outside-customer trial |
| Proposed package | `STUDIO-OPERATING-OWNER-AS-CUSTOMER-REAL-STUDIO-CAMPAIGN-1` |
| doNotStartWithoutOwnerAuthorization | true |
| Soft-open | Required before outside-customer trial |

### 17. Controlled outside-customer trial

| Field | Value |
|-------|-------|
| Classification | REQUIRED_NOT_STARTED |
| Dependencies | Owner-as-Customer completed + payment/pricing/refund/profitability + policies + failure/recovery + capacity + delivery/records + security minimum + Voice/Machine/Team readiness + no unresolved critical Customer-One defect |
| Sequence | **C — before controlled soft opening** |
| Proposed package | `STUDIO-OPERATING-CONTROLLED-OUTSIDE-CUSTOMER-TRIAL-1` |
| doNotStartWithoutOwnerAuthorization | true |

### 18. Pre-launch promotion (parallel where safe)

| Field | Value |
|-------|-------|
| Classification | REQUIRED_NOT_STARTED |
| Current truth | Planning may run in parallel after this register. Public promotion must not claim open, use unsettled name, point to unapproved destination, interfere with certification, or accept premature customer work. |
| Sequence | Parallel planning after register; public push only after name/identity + safe destination; creative produced via Owner-as-Customer Real Studio Campaign |
| Proposed package | `STUDIO-OPERATING-PRE-LAUNCH-PROMOTION-PLAN-1` (planning) |
| doNotStartWithoutOwnerAuthorization | true |

### 19. Final end-to-end launch rehearsal

| Field | Value |
|-------|-------|
| Classification | REQUIRED_NOT_STARTED |
| Sequence | **D — before controlled soft opening** (after outside trial + Room 5 site) |
| Proposed package | `STUDIO-OPERATING-FINAL-END-TO-END-LAUNCH-REHEARSAL-1` |
| doNotStartWithoutOwnerAuthorization | true |

### 20. Evidence-based launch / no-launch decision

| Field | Value |
|-------|-------|
| Classification | REQUIRED_NOT_STARTED |
| Sequence | **D — endpoint before soft opening** |
| Proposed package | `STUDIO-OPERATING-LAUNCH-NO-LAUNCH-DECISION-1` |
| Owner decision | Required |
| doNotStartWithoutOwnerAuthorization | true |

---

## Corrected dependency sequence

### A — Required before Room 4 can close

1. This register (ACTIVE — not execution)
2. External Customer Content Intake and Rights Certification
3. Full mobile customer-journey certification (using cleared upload/rights path)

### B — Required before Owner-as-Customer Real Studio Campaign

4. Final Studio name / core identity
5. AI-team roster and role boundaries
6. Team orientation
7. Studio Voice customer-service readiness
8. Machine readiness within Launch Now limits
9. Voice ↔ Machine ↔ Team stress testing
10. External-content intake/rights path (from A)
11. Full mobile journey certification (from A)
12. Minimum security / data / backup controls
13. Standard final-file / customer-record contract

### C — Required before controlled outside-customer trial

14. Owner-as-Customer Real Studio Campaign completed
15. Payment and pricing truth
16. Refund / cancellation handling
17. Profitability and cost-floor verification
18. Minimum terms / privacy / IP / customer-content policies
19. Failure / recovery / escalation testing
20. Capacity / queue / deadline / overload rules
21. Standardized delivery and customer records
22. Security / backup minimum bar
23. Studio Voice / Machine / Team readiness
24. No unresolved critical Customer-One E2E defect

### D — Required before controlled soft opening

25. Controlled outside-customer trial
26. Room 5 customer-facing public website transition
27. Branded domain / email requirements necessary for launch
28. Final end-to-end launch rehearsal
29. Evidence-based launch / no-launch decision

### E — Post-launch maturity only

- Broader security beyond launch-safe minimum
- Optional brand refinements
- Higher-capacity automation
- Advanced independent media-naturalness improvements **if** customer-listening limits remain truthful
- Non-Launch-Now services

**Not E:** public website (Room 5) — that is D.

### Parallel (careful)

- Pre-launch promotion **planning** after register
- Public promotion only under the promotion constraints above
- Actual Studio pre-launch campaign creative via Owner-as-Customer Real Studio Campaign

---

## Proposed next single package (not started)

**`STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`**

Rationale: Required before Room 4 closes while photo-led Launch Now remains accepted; mobile upload certification cannot truthfully pass without it. No Room 4D/4E label assigned (collision check: none found; prefer descriptive package IDs).

Opening scope (when separately authorized — **not this commit**): package contract + customer-route intake/rights design + acceptance matrix; no production of customer deliverables; no Room 5; no merge.

---

## Protection

- Do not execute the roadmap from this register alone.
- Do not reopen Room 4B / Room 4C without genuine defect.
- Do not alter approved customer deliverables.
- Do not invent services or change frozen Launch Now classifications.
- Do not put carousel on the Launch Now menu.
- Do not start Room 5 from this package.
- Do not merge.
- Do not begin website construction, promotion execution, Owner-as-Customer campaign, or outside-customer trial without separate authorization.
