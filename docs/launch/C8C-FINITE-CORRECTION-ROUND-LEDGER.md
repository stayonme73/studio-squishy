# C8c — Finite correction-round ledger

**Status:** Implementation complete · awaiting Tagia push authorization
**Protected starting tip:** `43807a5cf1c0218665a05fed11e3632d4a735910`
**Inspection:** C8C-TRUTH-1 (explicit ledger recommendation)
**Contract:** `docs/launch/UNIFIED-REVIEW-FINAL-DELIVERY-ROOM-CONTRACT-V1-LOCKED.md`
**Prior packages:** C8a · C8b · C8-CERT-1

## Objective

Make correction rounds finite, auditable, version-linked, and impossible to
silently reset.

```
remaining =
  write-once included allowance
  + owner-authorized extra uses
  − immutable formal correction-use records
```

## C8C-TRUTH-1 finding (summary)

Prior system had pieces of counting (`revisionRoundsIncluded` /
`revisionRoundsUsed`, UI “Review N of M”) but was not truthful finite
accounting: live package fallback, hardcoded 3/5 gate, mutable counter without
history, single feedback slot, and owner exception without durable extra use.

## Authoritative allowance source

`campaign.revisionRoundsIncluded` is write-once project authority.

Resolution order when absent:

1. frozen approved Studio plan `revisionRule`
2. existing package snapshot helpers
3. one-time legacy live package config fallback

Source is persisted on `campaign.revisionRoundsIncludedSource`.

Existing included values are never overwritten from current package config.

## Ledger schema

Envelope schema **v12** adds:

- `jobCorrectionUses[]` — append-only formal correction-use rows
- `jobCorrectionExtraGrants[]` — owner/admin extra-use grants

Each use records campaign/job, packageId, submittedAt, releaseActivityId,
versionLabel, actor, ordinal, consumptionKind (`included` | `owner_extra`),
and feedback inventory counts.

## Idempotency key

Preferred: `jobId:submittedAt`

Also unique on `packageId` so one locked package cannot consume twice across
retry / concurrent tabs.

## Consumption trigger

Only successful formal `request_revision` after validation.

Does **not** consume on draft save, sticky/draw/voice, acknowledge receipt,
Project Communication, or `approve_for_delivery`.

## Multi-round package history

`JobReviewFeedback` now has stable `packageId`. Locked packages remain in
`jobReviewFeedback[]`. New review releases open a new draft package without
overwriting prior locked submissions.

## Exhausted gate

`canRequestJobRevision` uses ledger-derived `remaining`. When remaining is 0:

- Request Revision is rejected
- no locked submission / ledger row is created
- approval and Project Communication remain available

Hardcoded included=3 / reserve=5 entitlement authority is subordinated
(deprecated helpers retained only for legacy references).

## Owner-authorized extra uses

`owner_allow_revision` appends one `CorrectionExtraGrantRecord` (quantity 1)
without changing `revisionRoundsIncluded`.

## Legacy treatment

- Reconstruct ledger rows only from recoverable locked
  `revision_requested` packages when ledger is empty.
- If only a historical `revisionRoundsUsed` counter exists with no packages,
  treat it as provisional legacy usage that limits remaining — do not invent
  package history.

## Race safety

In-memory append is idempotent by key/packageId. Review PATCH re-reads the
tasks envelope before write; if the package use already exists, the winner’s
envelope is kept and the loser does not overwrite or bump the campaign counter.

Honest limit: file-store last-write-wins is not a distributed lock. Concurrent
protection relies on packageId uniqueness + re-read merge. This is **not**
claimed as browser-proven concurrency.

## Automated proof

**Automated proof is complete** for the focused C8c suites and the surrounding
job-control / review-delivery / owner-decision regression set (write-once
snapshot, ledger idempotency, exhaust gate, no draft/approval/ack/COMM
consumption, multi-cycle package preservation, owner grant, C8b receipts).

## Browser proof

**Browser Scenarios A–F are still pending Tagia certification.**

Desktop (~1440) and phone (~390) behavior are **not** claimed as browser-proven
in this checkpoint. Layout reuses existing Review Room chrome plus the
correction accounting card in the REVIEW TOOLS rail — no new side panel.

## Dirty WIP boundary

Unrelated dirty WIP (timeout/sign-out, Lobby, checkout, OwnerQa, etc.) was not
staged, reset, cleaned, or absorbed.

## Exclusions (honored)

Payment · additional-scope checkout · Delivery merge · highlighter/compare ·
Lobby · Materials · Project Claim · Auth/timeout · Master Launch List update ·
C8d · Review Room shell redesign · Project Communication redesign

No payment or additional-scope workflow was built. No Master Launch List change
is included in this package.

## Remaining limits

- Browser Scenarios A–F not executed in this return
- Concurrent multi-tab races rely on packageId + re-read merge, not DB CAS
- Provisional legacy counter cannot invent missing package history

## Customer-One impact

Customers see truthful included/used/remaining from durable records; each
formal revision consumes exactly one audited use; exhausted wording is honest;
owner may grant one extra use without pretending the original allowance reset.
