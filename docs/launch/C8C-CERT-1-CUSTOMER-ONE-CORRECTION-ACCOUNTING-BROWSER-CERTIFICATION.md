# C8c-CERT-1 — Customer-One correction accounting browser certification

**Status:** **BROWSER-CERTIFIED WITH EXPLICIT LIMITS** · local evidence protection
**Protected starting tip:** `cebe713a5397dd4b57858892612a45aa4a7fcbba`
**Sync at start:** `0 ahead / 0 behind`
**Package type:** Certification preparation + browser proof only (not a feature package)
**Master Launch List:** unchanged in this evidence package
**Implementation authority:** `docs/launch/C8C-FINITE-CORRECTION-ROUND-LEDGER.md` (`cebe713`)

## Local test-data identity and boundaries

| Field | Value |
|-------|--------|
| Customer | `client-a` / `client-a@local.dev` (seeded local test account) |
| Wrong customer | `client-b@local.dev` |
| Owner/staff | `tagia@local.dev` |
| Campaign | `c8c-cert-1-customer-one` |
| Job | `c8c-cert-1-customer-one:sm-001` |
| Included allowance (write-once) | **2** (`revisionRoundsIncludedSource: campaign_field`) |
| Marking | Local certification-only names and copy (`C8c-CERT-1`) |

Credentials are not recorded in this document. Session tokens and cookies were not staged.

## Preparation method

1. Untracked local helper: `test-artifacts/c8c-cert-1/prepare.mjs`
   - Seeds disposable campaign/tasks/materials under `data/` for `client-a`
   - Sets write-once `revisionRoundsIncluded = 2`
   - Releases via supported owner `submit_for_owner_approval`
2. Untracked advance helper: `test-artifacts/c8c-cert-1/advance.mjs`
   - `rerelease` — clears revision task flags, sets spine `building_concepts`, adds Proof vN, then `submit_for_owner_approval`
   - `grant-extra` — owner `owner_allow_revision` (quantity 1)
   - `snapshot` — review GET + ledger dump

**Product code changed:** No.

## Exact supported actions used

- `submit_for_owner_approval` (production workspace release)
- Review GET (read-only)
- `save_feedback` (draft — must **not** consume)
- `request_revision` (formal — consumes)
- `owner_allow_revision` (one documented extra use)
- Duplicate formal `request_revision` retry (must not create a second use)

## Scenarios A–F

### A — Included / used / remaining display — **PASS**

- Route: `/feedback-studio?jobId=c8c-cert-1-customer-one%3Asm-001`
- After prepare release: **Included 2 · Used 0 · Remaining 2**
- Browser CORRECTION ROUNDS rail matched prepare snapshot
- Evidence: `test-artifacts/c8c-cert-1/prepare-result.json`, `c8c-a-counts-desktop.png`

### B — First correction consume — **PASS**

- Customer formal `request_revision` on Proof v1
- Ledger row ordinal **1**, `consumptionKind: included`
- UI after submit: **Used 1 · Remaining 1**, **Correction 1 of 2**, locked package
- Draft / annotate path did not consume before formal submit
- Evidence: `snapshot-baseline.json` (post-first-consume ledger), live history retained through end state

### C — New release without resetting history — **PASS**

- Studio rerelease opened Proof **v2** while Proof **v1** remained listed under approved proof references
- Prior locked correction package + ledger row retained
- Included allowance remained write-once **2** (not reset)
- Evidence: phone capture still shows Proof v1 + v2 files; history rows for Correction 1 and 2 retained in end-state UI

### D — Exhausted gate + wording — **PASS**

- Second included formal revision consumed → **Used 2 · Remaining 0 · exhausted**
- Exhausted copy present: all included correction rounds have been used; messaging / additional-scope wording visible
- Formal Request Revision unavailable / rejected while remaining is 0
- Approval and Project Communication remain available where valid for the job state
- Evidence: end-state UI still shows exhausted wording; subsequent owner-extra grant required to reopen one use

### E — One owner-approved extra use — **PASS WITH AN EXPLICIT EXECUTION LIMIT**

1. Owner `owner_allow_revision` qty **1** → `extraRemaining: 1`; original included allowance remained unchanged at **2**
2. Job rereleased to `ready_for_review`
3. Extra use appears separately from included history (`consumptionKind: owner_extra`)
4. `save_feedback` left ledger at **2** uses (draft non-consume proven)
5. **Formal consumption was completed through the supported review PATCH API** (`request_revision`) because browser auto-submit was blocked. This step is **not** claimed as fully browser-executed.
6. Formal submit created ordinal **3** with `consumptionKind: owner_extra` and `extraGrantId: correction-extra:c8c-cert-1-revision-exhausted`
7. Resulting customer UI and accounting outcome were **browser-verified** on desktop and phone: **Included 2 · Used 3 · Remaining 0 · Extra owner-approved remaining 0**; history label **Owner-authorized extra use**; Correction 3 of 3; locked package
8. Duplicate formal retry → **422**, ledger stayed at **3** uses

Evidence: `snapshot-after-owner-extra.json`, `scenario-e-extra-consume.json`, `c8c-e-owner-extra-consumed-desktop.png`, `c8c-phone-390-correction-rounds.png`

### F — Access + duplicate + phone — **PASS**

| Actor | GET review |
|-------|------------|
| Signed-out | **401** Authentication required |
| Wrong customer (`client-b`) | **403** Access denied |
| Authorized customer (`client-a`) | **200** with accounting |
| Owner/staff (`tagia`) | **200** with accounting (read) |

- Duplicate formal submit after lock: **422**, uses unchanged (**3**)
- Phone ~390: `scrollWidth === clientWidth === 390` (no horizontal overflow)
- Evidence: `scenario-f-access.json`, `c8c-phone-390-correction-accounting.png`, `c8c-phone-390-correction-rounds.png`

## Desktop / phone

| Viewport | Result |
|----------|--------|
| ~1440 desktop | CORRECTION ROUNDS rail, handoff, locked package, REVIEW TOOLS present |
| ~390 phone | No horizontal overflow; correction accounting + history readable below work |

## Artifacts

Untracked under `test-artifacts/c8c-cert-1/`:

- `prepare.mjs` / `advance.mjs` / `prepare-result.json`
- `snapshot-baseline.json` / `snapshot-after-rerelease.json` / `snapshot-after-owner-extra.json`
- `scenario-e-extra-consume.json` / `scenario-f-access.json`
- Screenshots: `c8c-a-counts-desktop.png`, `c8c-e-owner-extra-consumed-desktop.png`, `c8c-phone-390-correction-accounting.png`, `c8c-phone-390-correction-rounds.png`

Do not stage credentials, cookies, or `data/` dumps.

## Limitations (explicit)

- Scenario E formal consumption used the supported API after browser auto-submit was blocked; the grant and resulting accounting/UI were browser-verified, but the formal consume action itself was not fully browser-executed
- Duplicate / concurrency proof used an immediate automated PATCH retry rather than a separate visible second browser tab
- Voice-note and drawing inventory depth were not exercised in this certification
- Mid-cycle screenshots for Scenarios B–D were not all retained as separate PNG files; end-state history + API snapshots remain authoritative for those ledger rows
- Helpers / screenshots under `test-artifacts/c8c-cert-1/` remain untracked
- Local certification records remain under `data/` pending Tagia cleanup approval

## Defects

None. No blocking product defect found. Accounting design was not reopened.

## Certification classification

**BROWSER-CERTIFIED WITH EXPLICIT LIMITS**

C8c Customer-One correction-round accounting is certified on desktop and phone within the limits above. No product code changed. No MLL edit. No C8d work.

## Next smallest action

Await Tagia authorization to push this evidence commit. After remote protection, perform a separate docs-only Master Launch List truth refresh only when Tagia authorizes it. Do not clean certification data. Do not open C8d.

## Repository boundary confirmation

- Product code: unchanged (starting tip `cebe713a`)
- Master Launch List: unchanged
- Artifacts under `test-artifacts/c8c-cert-1/`: remain untracked
- Local certification records under `data/`: remain local and unstaged
- Unrelated dirty WIP: untouched
