# C8-CERT-1 — Customer-One Review Room browser certification

**Status:** **BROWSER-CERTIFIED WITH EXPLICIT LIMITS** · local evidence protection
**Protected starting tip:** `77f6835394911417d25f0561872c3a5611c200a7`
**Sync at start:** `0 ahead / 0 behind`
**Package type:** Certification preparation + browser proof only (not a feature package)
**Master Launch List:** unchanged in this evidence commit

## Local test-data identity and boundaries

| Field | Value |
|-------|--------|
| Customer | `client-a` / `client-a@local.dev` (seeded local test account) |
| Wrong customer | `client-b@local.dev` |
| Owner/staff | `tagia@local.dev` |
| Campaign (revision path) | `c8-cert-1-customer-one` |
| Job (revision path) | `c8-cert-1-customer-one:sm-001` |
| Campaign (approval path) | `c8-cert-1-customer-one-approve` |
| Job (approval path) | `c8-cert-1-customer-one-approve:sm-001` |
| Marking | Local certification-only names and copy (`C8-CERT-1`) |

Credentials are not recorded in this document. Session tokens and cookies were not staged.

## Preparation method

1. Untracked local helper: `test-artifacts/c8-cert-1/prepare.mjs`
   - Writes disposable campaign/tasks/materials under `data/` for `client-a`
   - Job starts in `building_concepts` with prepared deliverables + client-visible `review_proof` (`Proof v1 — C8-CERT-1`)
2. Supported Studio release: owner session →
   `PATCH /api/campaigns/{id}/jobs/{jobId}` `{ action: "submit_for_owner_approval" }`
   → spine `ready_for_review` with real `status_change` + `approval` activity
3. Second job cloned locally and released the same way for Scenario E (does not mutate Scenario D package)

**Product code changed:** No.

## Exact supported actions used

- `submit_for_owner_approval` (production workspace)
- Review GET (read-only)
- `acknowledge_review_received`
- `save_feedback` (via Review Tools autosave)
- `request_revision`
- `approve_for_delivery`
- Project Communication send (Board COMM reuse)

## Scenarios A–F

### A — Studio submits review version — **PASS**

- Route: `/feedback-studio?jobId=c8-cert-1-customer-one%3Asm-001`
- Visible: handoff **Submitted to customer** in chain; Studio submission receipt shows:
  - Version: `Proof v1 — C8-CERT-1`
  - Submitted: `Jul 29, 2026, 8:14 PM` (server release time)
  - From: `Tagia`
  - Action required: review and return feedback or approve
- Proof file listed in deliverable card

### B — Customer receives review — **PASS**

| Checkpoint | `client_review_received` count |
|------------|--------------------------------|
| Before workspace open (GET only) | **0** |
| After first authorized open | **1** |
| After refresh GET | **1** |
| After second tab + repeated PATCH acknowledge | **1** |

Idempotency sequence: **0 → 1 → 1 → 1**

- Receipt scoped: `messageRef = release:approval:c8-cert-1-customer-one:sm-001:2026-07-30T00:14:58.495Z`
- Actor: session-derived `client-a` / Client A
- Handoff current label: **Received by customer**
- GET remained read-only (no receipt on GET-only baseline)

### C — Customer reviews — **PASS (with voice limit)**

- Sticky note saved: `C8-CERT-1: tighten the headline on the first post.`
- Section decision: revision on `3 social post concepts`
- Draw tool opened; no durable stroke inventory (0 marked sections) — not forced
- Voice: **not exercised** (browser/mic permissions not used in timebox)
- Handoff current: **Customer reviewing**
- Draft remained editable; no locked package yet
- PROJECT COMMUNICATION available
- Preview / deliverables remained central

### D — Customer returns feedback — **PASS**

Pre-submit confirmation showed:

- 1 sticky note (+ note text)
- 0 marked sections
- 0 voice notes
- 1 section decision
- Version context: Proof v1 — C8-CERT-1
- Action: Request changes

After submit:

- Handoff: **Feedback returned**
- Persisted `submittedAt`: `2026-07-30T00:19:18.074Z`
- `submissionType`: `revision_requested`
- Locked feedback package receipt (immutable notice, inventory, sender Client A)
- Editing / Request Revision / Approve disabled
- Second formal submission blocked (`422` — already submitted / not ready for review)
- PROJECT COMMUNICATION still sent a message after lock; package sticky/`submittedAt` unchanged

### E — Customer approves — **PASS** (separate job)

Used `c8-cert-1-customer-one-approve:sm-001` (Scenario D package left untouched).

- `approve_for_delivery` → spine `approved`
- `submittedAt` / `submissionType: approved_for_delivery` persisted
- Repeat approval blocked (`422`)
- No delivery files invented
- Browser reopen showed handoff **Approved** and locked package
  (`Approved for delivery`, version `Proof v1 — C8-CERT-1 Approve`)

### F — Access protection — **PASS**

| Actor | GET review | PATCH acknowledge |
|-------|------------|-------------------|
| Signed-out | **401** | **401** |
| Wrong customer (`client-b`) | **403** | **403** |
| Staff/owner (`tagia`) | (staff may read via ownership rules) | **403** — `Only the authorized customer can record review receipt.` |

Browser Sign In surface verified reachable earlier in the session for customer auth entry.

## Desktop / phone

| Viewport | Result |
|----------|--------|
| ~1440 / wide desktop | Handoff chain, Studio submission, REVIEW TOOLS, PROJECT COMMUNICATION present; work central |
| ~390 phone | No horizontal overflow (`scrollWidth === 390`); locked package + handoff readable; REVIEW TOOLS + PROJECT COMMUNICATION present |

## Lobby-background observation only

**Present** (blurred Lobby/utility backdrop behind Review Room). Not repaired; continuity not rebuilt.

## Network / server evidence (summary)

- Release: owner `submit_for_owner_approval` → `ready_for_review`
- Receive: customer PATCH `acknowledge_review_received` once per release
- Submit revision / approve: existing review PATCH actions + `submittedAt`
- Access denials: 401 / 403 as above

## Artifacts

Untracked under `test-artifacts/c8-cert-1/`:

- `prepare.mjs` / `prepare-result.json`
- `screenshots/` (desktop + phone captures from browser cert)

Do not stage credentials, cookies, or `data/` dumps.

## Limitations (explicit)

- Voice-note flow not exercised
- Drawn-stroke inventory depth not certified (draw tool opened; inventory remained 0 marked sections)
- Approval certified using a separate prepared job (Scenario D package not mutated)
- Local certification records remain under `data/` pending Tagia cleanup approval
- Screenshots / `test-artifacts/c8-cert-1/` remain untracked

## Defects

None. No blocking product defect found.

## Certification classification

**BROWSER-CERTIFIED WITH EXPLICIT LIMITS**

C8a and C8b Review Room browser behavior is certified for Customer-One on
desktop and phone within the limits above. No product code changed.

## Next smallest action

Await Tagia authorization to push this evidence commit. After remote
protection, perform a separate docs-only Master Launch List truth refresh.
Do not combine that refresh with this evidence commit. Do not clean
certification data without Tagia approval.

## Repository boundary confirmation

- Product code: unchanged
- Master Launch List: unchanged
- Artifacts under `test-artifacts/c8-cert-1/`: remain untracked
- Local certification records under `data/`: remain local and unstaged
- Unrelated dirty WIP: untouched
