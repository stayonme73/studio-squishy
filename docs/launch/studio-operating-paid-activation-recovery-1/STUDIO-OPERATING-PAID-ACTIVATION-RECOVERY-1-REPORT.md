# STUDIO-OPERATING-PAID-ACTIVATION-RECOVERY-1 REPORT

**Package:** STUDIO-OPERATING-PAID-ACTIVATION-RECOVERY-1  
**Branch:** `operating/design-renderer-proof-1`  
**Scout status:** PARKED — final-review ready · **no merge**  
**Starting control:** customer paid-entry repair `792aa17` (Maya $69 flyer → hosted Stripe → intake). That path was **not reopened**.  
**Evidence:** `docs/launch/studio-operating-paid-activation-recovery-1/`

---

## Plain English

Maya can already pay. This package makes sure the Studio actually **picks the order up** after money clears, even if a behind-the-scenes step hiccups.

Confirmed payment stays true. Activation, project structure, and routing eligibility then either finish or retry from durable disk state. Tagia is not the restart button.

---

## 1. Defect we started from

Payment Truth could succeed while the operating chain was still asleep:

- `confirm` treated payment as success even if activation/routing/dispatch failed (`pending_retry`).
- Already-paid **reconcile** returned “confirmed” **without waking** the chain.
- Campaign **GET** (customer leave/return) did not retry.
- Sealed Machine kit structure-ensure failures were **skipped silently**.
- There was **no sweeper**. Recovery only happened if Stripe or a staff/customer surface happened to re-observe.

A charged project could sit paid-but-stuck until someone noticed.

---

## 2. What now happens

```
confirmed payment → structure ensure → activation → routing eligibility → dispatch identity
```

On failure the campaign is marked `pending_retry` (still paid). Recovery retries from disk.

Wake paths (none require Owner judgment):

| Trigger | What it does |
|---------|----------------|
| Payment confirm / webhook replay | Immediate retries (2) on the paid campaign, then a best-effort sweep of other stranded paid campaigns |
| Already-paid reconcile | Recovers instead of early-return |
| Campaign GET (`/current` and `/[id]`) | Customer leave/return wakes that project |
| Campaign PATCH / materials change | Same recovery chain |
| `POST /api/operating/paid-activation-recovery` | Durable sweep (cron secret or staff/owner session) |

Authoritative state lives on the Campaign Record + task/job files. A closed browser cannot strand the Machine at this layer.

Routine recovery: **Owner = NONE**.

---

## 3. Failure scenarios tested

| Scenario | Result |
|----------|--------|
| Payment succeeds, activation first throws | In-process retry recovers; project activated; Owner none |
| Activation exhausts retries | Payment stays confirmed; `pending_retry` written; later recover succeeds |
| Partial completion (pending_retry, jobs reconstructable) | Recovered; one flyer job; no duplicates |
| Process interrupted/restarted (paid, no activation record) | Recovered from durable payment truth |
| Same payment event again | `alreadyPaid`; same job ids / `activatedAt`; one job record |
| Customer leaves and returns mid-recovery | `wakePaidCampaignEnvelope` (GET path) activates |
| Already-paid reconcile | Wakes `pending_retry` instead of returning asleep |
| Sweep without a browser | Recovers the stranded campaign; Owner none |
| Retry duplicates | Same `buildJobId(campaignId, v2-rtu-flyer)` set |

---

## 4. Automatic / retry recovery behavior

- Default **2 immediate retries** after a failed chain attempt.
- Durable `pending_retry` + `lastError` if still stuck.
- Idempotent reconstruct via existing `ensurePostPayActivation` → routing → dispatch.
- Partial activation now writes `pending_retry` on the **working** campaign (line items / cycle work are not discarded on failure).
- Sealed kit structure is re-applied on every recover. Missing structure after a sealed purchase is treated as needs-recovery, not as silent success.

---

## 5. Duplicate-prevention proof

Replay of the same Stripe/sandbox confirmation:

- does not create a second campaign
- does not mint a second flyer job
- preserves `activatedAt` and `jobIds`

Job identity remains `buildJobId(campaignId, skuId)`.

---

## 6. Customer-visible behavior (Maya continuation)

Pattern: Maya Brooks · Cedar & Bloom · `v2-rtu-flyer` · **$69**. Did **not** re-run hosted Stripe (paid-entry sealed). Did **not** fake Studio Voice.

| Moment | What Maya sees |
|--------|----------------|
| Paid, recovery pending, intake not done | **Waiting on Project Intake** / Complete Project Intake. Tablet still says **Payment received**. Not “building concepts.” Not “project has been created.” |
| Recovery succeeds, intake not done | Same honest intake CTA. Machine `postPayActivation.status = activated`, phase `awaiting_intake`. |
| Intake done, Machine still stuck | Board: **Payment confirmed** — “Your payment is confirmed. The Studio is still getting your project ready. This usually finishes on its own.” Production-gate “Building Concepts” is suppressed. |

Incomplete Project Intake still wins (Package 1b). Recovery copy is for when the Machine is stuck **after** that customer step would otherwise claim work has started.

---

## 7. Owner-dependence result

**Owner = NONE** for routine recovery.

Tagia does not create jobs, flip status, open a screen, or kick a queue for these retries.

The sweep route may be *called* by staff/cron; the recovery itself does not ask Tagia to decide.

---

## 8. Regression totals

| Suite | Result |
|-------|--------|
| Paid activation recovery (package) | **13/13** (10 recover + 3 Maya customer-eyes) |
| Paid-path related (payment truth, paid-cycle, activation, routing, dispatch, honesty, intake, Board, Package 4) | **89/89** |
| campaign-tasks + material-use | **349/349** |

Checkout / Payment Truth UI from CUSTOMER-PAID-ENTRY-REPAIR-1 was not reopened. No new hosted-Checkout dry run.

---

## 9. Remaining limits

- Studio Voice still does not narrate recovery. Do not fake it.
- Jargon / STUDIO REVIEW chrome remains in truth/customer-experience cleanup unless it blocks a customer.
- Flyer materials-slot “logo” inference can still delay production after activation is healthy. That is not this package and is not SKU-law.
- A permanently invalid sealed kit lock will keep `needsRecovery` true and retry; it does not invent Owner rescue or pretend structure exists.
- Production dispatch tools / renderer QA → Review bind are later packages.
- Cross-device Project Claim was not reopened.

---

## 10. Commit state

See git after this package’s scoped commit on `operating/design-renderer-proof-1`. **No push. No merge.**

Unrelated worktree churn (`current-identity.json`, renderer version folders, other launch docs) is **not** in this commit.

---

## 11. Recommended next broad package

**Status + Studio Voice** (Board-first honesty, then a Voice handoff line that reads live truth — still not a status engine, still not Package 4 Voice Host).

Then: Review handoff → cleanup → Owner Console → full rehearsal.

After that chunk: send Maya through what was just built before skipping several steps ahead.

---

## SUCCESS CRITERIA CHECK

| Criterion | Result |
|----------|--------|
| Confirmed payment cannot quietly strand behind the scenes | YES |
| Failure, partial, interrupt, replay, leave/return proved | YES |
| Retry does not duplicate project/activation/jobs | YES |
| Customer never shown false success if Machine stuck | YES |
| Durable state, not one live browser | YES |
| Routine recovery Owner = NONE | YES |
| Paid-entry path not reopened | YES |
| Studio Voice not faked | YES |

---

**READY FOR OWNER / MANAGER REVIEW**

**Scout PARKED.**
