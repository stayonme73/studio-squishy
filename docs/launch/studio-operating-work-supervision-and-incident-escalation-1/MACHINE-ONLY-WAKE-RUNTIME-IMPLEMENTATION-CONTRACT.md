# Machine-only wake runtime — implementation contract

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**Status:** **IMPLEMENTED AND DEPLOYED** on a separate wake Netlify site. Package remains **OPEN / IN PROGRESS**. **Not** live-production certified. **Not** closed.  
**Owner decision:** 2026-08-24 architecture conditionally approved; wake runtime later built and deployed.  
**Ledger:** L14 · L15  
**Authority:** this contract + `MACHINE-ONLY-WAKE-INGRESS-DECISION-NOTE.md`

Binding conditions below remain in force. Do not close this package. Do not claim live-production certification. Do not contact the wake origin for C13 retries. Do not run authenticated wake until C13.

---

## Binding Owner conditions

1. Not a proxy to the private Studio host.  
2. Executes the existing provider-independent Machine sweep logic directly.  
3. Reads and writes the same Supabase supervision store, schema version 2.  
4. Supabase remains the only supervision source of truth.  
5. No Studio pages, customer UI, sign-in, or unrelated API routes.  
6. Accepts only `POST` on the wake path.  
7. Validates `x-studio-operating-secret` **before** initializing the Machine.  
8. Wrong or missing credentials write nothing.  
9. Rate-limits at the **provider** before the handler, then again after auth for unique successful wakes; supports durable 24-hour idempotency; returns sanitized Machine JSON.  
10. Records **ran**, **failed-to-run**, and **never-ran** distinctly. Never-ran-on-hydrate is **EVENTUAL** detection only. Independent scheduler-death detection is **unproven**.  
11. Does not connect a scheduler yet.  
12. Does not introduce Build-A-Bot, Make, Claude, Resend, or another database.

A second URL that `fetch`es the private Studio sweep route is **forbidden**. That recreates L14.

---

## 1. Dedicated origin / provider, and why

**Recommended origin:** a **second Netlify site** on the existing Netlify team, with a **separate hostname**.

**Why this provider**

- Team Login is **per site**. The private Studio site stays locked for humans. The wake site has Team Login **off**.
- Tagia already operates Netlify. No new vendor account is required for the door itself.
- Same git repository can publish an isolated wake package without publishing Studio pages.
- The wake site still uses HTTPS and env vars Netlify already knows how to hold.

**Why not the current certification site**

- Team Login wraps the whole site. A new path on the same host would still return 401 HTML.
- Making that site public is rejected.

**Why not a proxy function on a second site**

- `fetch(privateStudio/api/operating/supervision/sweep)` hits Team Login again. That is L14 with extra steps.

**Why not Cloudflare / AWS / a new PaaS for this pass**

- Extra account, extra secret-copy surface, extra bill. Allowed later only if the second Netlify site cannot be created on the current plan. Not the default.

**Wake site must**

- Have **no** Netlify Team Login, password, or SSO visitor gate.
- Have **no** identity widget, form, or HTML app.
- Never store `NEXT_PUBLIC_SITE_URL` (or any URL) of the private Studio host as a call target.
- Never make outbound HTTP to the private Studio host.

**Private Studio site must**

- Stay private.
- Keep reading Incident Command from the **same** Supabase store after wakes run.

---

## 2. How existing sweep code is reused (no second Machine)

The wake runtime is a **thin HTTP entrance** around code that already exists.

| Reuse | Module / behavior |
|--------|-------------------|
| Header name | `SUPERVISION_AUTH_HEADER` = `x-studio-operating-secret` (`contract.ts`) |
| Secret check | `authorizeSupervisionService` / `expectedOperatingSecret` (`service-auth.ts`) — **call this first** |
| Store | `createLiveSupervisionRepositoryAsync` + live Postgres REST/RPC client |
| Schema | `SUPERVISION_POSTGRES_SCHEMA_VERSION = 2` |
| Sweep | `machine.sweep()` including `tryClaimSweep` (10s claim) and `recordSweepEvaluation` |
| Truth | Same Supabase RPCs: hydrate, claim, evaluate, persist |

**Required extraction (implementation pass, not this recording)**

Add one shared function, used by both the private Studio route and the wake runtime, for example `runSupervisionSweepOnce()`. It must:

1. Assume auth already succeeded.  
2. Create / hydrate the live Postgres repository.  
3. Construct the existing Machine with `recordSource: "live"`.  
4. Call `machine.sweep()` **once**.  
5. Flush.  
6. Return the existing sanitized sweep JSON shape.

**Forbidden duplication**

- No copied lease-health rules.  
- No second incident schema.  
- No in-memory-only store in launch runtime.  
- No `studio-data-json` on the wake site.

**Forbidden private-host behavior on the wake site**

`getLiveSupervisionMachine()` today also starts an in-process `setInterval` sweep. The wake site **must not** start that timer. Wake work is **request-scoped**: one authenticated POST, one `sweep()`, exit. Set `STUDIO_SUPERVISION_DISABLE_LIVE_SWEEP=1` on the wake origin (name only; see §4).

The private Studio may keep its in-process timer for human sessions. That is not a second source of truth; both write the same store. `tryClaimSweep` already serializes overlapping sweeps.

---

## 3. Exact deployed routes

**Wake origin only** (separate Netlify site; not the private Studio host).

| Method | Path | Result |
|--------|------|--------|
| `POST` | `/api/operating/supervision/sweep` | Only allowed wake. Auth header required. No query string. |
| `GET`, `PUT`, `PATCH`, `DELETE`, `HEAD` | `/api/operating/supervision/sweep` | `405` JSON `{ "error": "method_not_allowed" }` |
| Any | any other path, including `/` | `404` JSON `{ "error": "not_found" }` |

**Headers (wake POST)**

- Required: `x-studio-operating-secret`  
- Required: `idempotency-key` (reuse `SUPERVISION_IDEMPOTENCY_HEADER`)  
- Forbidden: secret in query string or path  

**Response**

- Success: existing Machine JSON (`ok`, `path`, `machineComputesHealth`, `providersRemainUnconnected`, `sweep`, incident **summaries**). No secret, no Supabase key, no stack traces.  
- Auth failure: `401` JSON `{ "error": "Service authentication failed." }` — **not HTML**. Writes nothing.  
- Provider cap exceeded **before** the handler: provider `429` (no Studio function, no Supabase write).  
- Missing launch secret on the wake site: `503` JSON, write nothing.  
- Authenticated unique-wake cap / claim held: `429` JSON `{ "error": "sweep_rate_limited" }` or skipped-claim shape already returned by `machine.sweep()` when `skippedBecauseClaimHeld: true`.  
- Store unavailable after auth: sanitized `503` JSON `{ "error": "supervision_store_unavailable" }`. **Do not claim** a durable failed-to-run row was written. The caller keeps its attempt result. After the store recovers, stale-last-success / overdue next-check creates the incident.

**Private Studio routes stay as they are.** Humans use Team Login. The wake origin does not call them.

---

## 4. Environment-variable names only

Wake origin (production):

| Name | Role |
|------|------|
| `STUDIO_OPERATING_SWEEP_SECRET` | Shared sweep secret. Same value as ignored local / intended Machine secret. Never log. |
| `STUDIO_SUPERVISION_SUPABASE_URL` | Same project as live supervision. |
| `STUDIO_SUPERVISION_SUPABASE_SECRET_KEY` | Same Secret Key (`apikey` only). |
| `STUDIO_SUPERVISION_RUNTIME` | Must be `launch`. |
| `STUDIO_SUPERVISION_PROVIDER` | Must be `supabase-postgres`. |
| `STUDIO_SUPERVISION_DISABLE_LIVE_SWEEP` | Must be `1` on the wake origin. |

Optional compatibility names already in `SUPERVISION_LAUNCH_ENV_KEYS` (`STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`) are **not** to be added to the wake site if the primary names above are set.

**Must not be present on the wake origin**

- Session / Owner login secrets  
- Payment keys  
- Resend / SMTP  
- Any URL used to HTTP-call the private Studio host  
- `STUDIO_SUPERVISION_ALLOW_INPROCESS_POSTGRES=1`  
- Dev-only proof secret as production auth  

Netlify-injected names (`NETLIFY`, `NODE_ENV`) are allowed. They must not be used to skip secret checks.

---

## 5. Build isolation (prove no Studio pages)

The wake deploy **must not** run the main Studio `next build` that emits `/file-room`, `/sign-in`, customer routes, or the OpenNext server handler for the full app.

**Required layout (implementation pass)**

- Isolated package directory, e.g. `supervision-wake/`, with its own Netlify publish/function entry.  
- Bundler includes **only** `src/lib/studio-work-supervision/**`, the tiny wake handler, and `src/config/studio-work-supervision-and-incident-escalation-v1.ts` if needed for constants.  
- No `src/app/**` pages. No `public/` Studio assets. No Owner Console. No Incident Command HTML.

**Proof artifacts before go-live**

1. Deploy file list / function bundle listing: **zero** matches for `file-room`, `sign-in`, `owner-console`, `incident-command` page modules.  
2. Runtime probe: `GET https://<wake-host>/` returns **404 JSON**, not HTML.  
3. Runtime probe: `GET https://<wake-host>/file-room/incident-command` returns **404 JSON**.  
4. Runtime probe: `POST` wake path without secret returns **401 JSON**, not Netlify login HTML.  
5. CI or local script fails the wake build if the bundle contains Studio page chunks.

If isolation cannot be proven, **do not deploy**.

---

## 6. Rate-limit mechanism (two layers)

Wrong-secret traffic must be bounded **without** writing to Supabase. Authenticated unique successes have a separate store-backed cap.

### Layer A — provider cap, before the handler

Apply a **Netlify Traffic / rate-limit rule** (or equivalent provider request cap) on the wake hostname so abusive or wrong-secret POSTs are throttled **before** the Studio function runs.

- Scope: all HTTP to the wake origin (at minimum `POST /api/operating/supervision/sweep`).  
- Suggested bound: **60 requests per client IP per minute**.  
- Result: provider `429`. No function auth, no Machine init, no Supabase write.  
- This is not Studio JSON and not Team Login HTML.

If the current Netlify plan cannot attach this rule, **do not ship** the wake site. Stop and ask Tagia (plan upgrade vs another CDN cap). Do not “authenticate first” as a substitute for this layer.

### Layer B — application, after the provider lets the request in

1. Reject query strings.  
2. Validate `x-studio-operating-secret`. On failure, return **401 JSON** and **write nothing**.  
3. Require `idempotency-key`.  
4. Apply store-backed limits (same Supabase, not Redis, not process memory):  
   - Existing `supervision_try_claim_sweep` (10s TTL) — overlapping sweeps skip or 429.  
   - **Cap: 18 unique successful wakes per rolling 60 minutes.** Count rows in `supervision_wake_idempotency` where `status = 'completed'` and `first_completed_at` is within the last 60 minutes.  
   - **Repeated `idempotency-key` values do not consume extra capacity.** A replay inside 24 hours returns the stored body and must not increment the unique-success count.  
5. Only then initialize the Machine and run `sweep()` once.

In-memory-only limits on a serverless isolate are **not** sufficient. Do not add Upstash, Redis, or another database.

---

## 7. Durable 24-hour wake idempotency (no process memory)

Existing `supervision_idempotency` + `supervision_accept_heartbeat` is **heartbeat-only**: unique `(lease_id, idempotency_key)`, no stored HTTP body, no 24-hour replay. **Do not** use that table for wake HTTP idempotency.

Wake idempotency is a **required additive object in the same Supabase project** (not a second database). Schema version remains **2**; this is an additive table/RPC, not a new source of truth.

**Table:** `supervision_wake_idempotency`

| Column | Role |
|--------|------|
| `idempotency_key` | Primary key; value of `idempotency-key` header |
| `created_at` | First insert time |
| `expires_at` | `created_at + 24 hours` |
| `status` | `in_progress` \| `completed` |
| `first_completed_at` | Set once on first successful sweep; used for the 18/hour unique count |
| `response_status` | HTTP status of the stored Machine response |
| `response_body` | Sanitized Machine JSON only (no secrets) |

**RPC (atomic, `FOR UPDATE` / insert-conflict):** `supervision_claim_wake_idempotency(p_key text, p_now timestamptz)`

Returns one of:

- `{ "kind": "replay", "status": n, "body": <json> }` — unexpired `completed` row. **Do not** run `sweep()`. **Do not** count a new unique success.  
- `{ "kind": "in_progress" }` — unexpired `in_progress` row. Return `409` JSON; no second sweep.  
- `{ "kind": "fresh" }` — inserted new row or replaced expired row; caller may run `sweep()` (still subject to the 18/hour unique cap).  
- `{ "kind": "hour_cap" }` — fresh key would exceed 18 unique successes in the rolling hour. Return `429`; no sweep.

**RPC:** `supervision_complete_wake_idempotency(p_key text, p_status int, p_body jsonb, p_now timestamptz)`

Called only after a **ran** sweep. Sets `status = completed`, `response_body`, and `first_completed_at` if null. Unique-hour capacity is consumed **once** at first complete, not on later replays.

`GRANT EXECUTE` stays `service_role` / Secret Key `apikey` only, same as other supervision RPCs. `anon` / `authenticated` revoked.

If these objects are not present, the wake site **fail-closes** (503). It must not fall back to process memory.

**Bounded retry (future caller contract; no scheduler connected now)**

- Max **3** HTTP attempts.  
- Backoff **1s, 4s, 16s**.  
- Same `idempotency-key` on every retry.  
- Stop on 401 (wrong secret).  
- Provider 429 / app 429 / 503 / network: retry within the cap; exhausted retries are caller-side failed-to-run, not a durable store write if Supabase was down.

**Wake runtime outbound**

- **0** requests to the private Studio host.  
- At most **2** retries on transient Supabase 5xx/network for an already-authenticated attempt, then return sanitized 503.

---

## 8. Ran vs failed-to-run vs never-ran (honest detection)

A request that never arrives **cannot** write its own row.

| Class | Meaning | How it is recorded |
|--------|---------|---------------------|
| **Ran** | Auth succeeded, Machine `sweep()` completed (including `claimed: false` skip). | `supervision_sweep_evaluations` / claim rows plus completed `supervision_wake_idempotency`. HTTP 200 Machine JSON. |
| **Failed-to-run (caller-visible)** | Request reached the wake origin after provider cap and Studio auth, but sweep did not complete. | HTTP **503** sanitized JSON. Caller **retains its attempt result**. |
| **Failed-to-run (durable)** | Same, **and** Supabase was healthy enough to accept a write. | Optional same-schema receipt. **Not guaranteed.** |
| **Auth reject** | Wrong or missing Studio secret (after provider cap). | HTTP **401 JSON**. **Write nothing.** |
| **Never-ran** | No successful run by the due time. | **EVENTUAL** only: seen on the **next hydrate** / Incident Command read via stale last success and `supervision_due_next_checks`. Not a live pager by itself. |

**If Supabase is down after authentication**

- Return sanitized **503** `{ "error": "supervision_store_unavailable" }`.  
- **Do not claim** a durable failed-to-run write occurred. The wake door cannot write that fact into a dead store.  
- The caller keeps the 503 as its attempt result.  
- After the store recovers, **stale-last-success / overdue next-check** creates the incident. That is eventual, not simultaneous.

**Never-ran-on-hydrate is EVENTUAL detection, not independent real-time detection.**  
Nothing raises an alarm at the missed due instant unless a later read/wake happens. That limit stays explicit until a **separate scheduler heartbeat observer** is certified. That observer is **not** part of this wake-runtime pass and is **unproven** (ledger L15).

**Certification of eventual never-ran (before any scheduler)**

1. Note last successful evaluation time (or none).  
2. Do not POST to the wake origin for the due window.  
3. Hydrate later.  
4. Pass only if the store shows overdue / never-ran — not a completed healthy sweep.  
5. Do **not** mark this as independent scheduler-death detection.

Private-host 401 **HTML** remains L14 never-ran at the **Studio** origin and must not be used as wake-origin proof.

---

## 9. Rollback / removal

1. Unpublish or delete the wake Netlify site (or lock it to zero functions).  
2. Remove wake-site env vars in Netlify UI (do not paste values into git).  
3. Leave the private Studio site private and unchanged.  
4. **Do not** drop Supabase `studio_supervision` schema or version 2 RPCs.  
5. Git: revert the wake-package commit in a later authorized pass if needed.  
6. After removal, only in-process sweep on a running Studio node (or none) remains; L14 is the expected state for external POST to the private host.

Rollback does not require a merge to `main`.

---

## 10. Estimated free-plan usage and possible cost

Assumptions for certification: a few Owner POSTs, then later at most one wake per 5–15 minutes **if** a scheduler is ever authorized (not this pass).

| Item | Estimate |
|------|----------|
| Invocations | Certification: tens. Later 5‑minute cadence: ~9k POST/month. |
| Compute | Short Node function, JSON in/out, Supabase RPC. Well under typical Netlify free/starter function quotas. |
| Bandwidth | Negligible (small JSON). |
| Supabase | Same project; a few RPCs per wake. No new database. |
| Second Netlify site | **$0** if the current team plan already allows another site. If the plan allows only one site, the likely add-on is Netlify’s paid starter/extra-site tier (check the invoice at implementation; do not guess a locked price here). |
| New vendors | **$0.** No Build-A-Bot, Make, Claude, Resend, Redis. |

If a second site is not allowed without paid upgrade, **stop and ask Tagia** before spending. Do not switch to a public Studio site to save money.

---

## 11. Complete certification matrix

No row is a live-production certification. Package remains OPEN. Do not treat any PASS as package close.

**Current blocker:** C13 WAITING ON NETLIFY SUPPORT. Authenticated wake (C18) is **NOT RUN** and blocked on C13. Scheduler (C24) is **NOT CONNECTED** and forbidden until C1–C20 pass. L15 / C21 remains unproven.

| Id | Status | Proof | Pass condition | Fail / blocked |
|----|--------|--------|----------------|----------------|
| C1 | **PASS** | Private Studio stays Team-Login protected | Human still gets login wall on Studio host | Site made public |
| C2 | **PASS** (unauthenticated boundary) | Wake origin has no Team Login | `POST` without secret → **401 JSON**, not HTML | 401 HTML (L14 recreated) |
| C3 | NOT RUN | Not a proxy | Function source / logs show **zero** HTTP to private Studio host | Any `fetch` to Studio host |
| C4 | NOT RUN | Auth before Machine init | Missing/wrong secret: no Supabase writes, no `sweep()` | Hydrate/sweep before auth |
| C5 | NOT RUN | Same store | Wake write visible from private Incident Command live read | Divergent DB or JSON file |
| C6 | NOT RUN | Schema 2 | `supervision_verify_schema` → version 2, provider `supabase-postgres` | Version ≠ 2 |
| C7 | NOT RUN | Direct Machine logic | Sweep evaluations match existing `machine.sweep()` fields | Reimplemented health rules |
| C8 | **PASS** (unauthenticated boundary: `GET /` → 404 JSON) | No pages | `GET /` and `GET /file-room/incident-command` on wake host → 404 JSON | HTML app or sign-in |
| C9 | **PASS** (unauthenticated boundary) | POST only | Non-POST on wake path → 405 JSON | GET sweep succeeds |
| C10 | NOT RUN | No query string | POST with `?secret=` rejected; secret not parsed from URL | Secret accepted from query |
| C11 | **PASS** (unauthenticated boundary) | Sanitized JSON | Response has no sweep secret, no `sb_secret_`, no stack | Leak |
| C12 | **PASS** (unauthenticated boundary) | Wrong secret writes nothing | Pre/post hydrate: evaluation count unchanged | Row created |
| C13 | **WAITING ON NETLIFY SUPPORT** | Provider cap before handler | Burst of unauthenticated POSTs is 429 at the **provider** with no function/Supabase write | Unlimited function hits on bad secrets; 429 unproven |
| C14 | **PASS** (unauthenticated boundary) | App 401 still writes nothing | After provider allows one request, wrong secret → 401 JSON, no store write | 401 HTML or a store row |
| C15 | NOT RUN (blocked on C13) | Unique-success cap 18/hour | 19th **distinct** successful key in 60 minutes → 429; no extra evaluation | Cap 12 or replays counted |
| C16 | NOT RUN (blocked on C13) | Replay does not consume cap | Repeat same `idempotency-key` does not increase unique-success count | Replay counted as new wake |
| C17 | NOT RUN (blocked on C13) | Durable wake idempotency | Replay served from table `supervision_wake_idempotency` via RPCs `supervision_claim_wake_idempotency` and `supervision_complete_wake_idempotency`; process memory unused | Memory-only replay or heartbeat table `supervision_idempotency` reused |
| C18 | **NOT RUN** (blocked on C13) | Ran | One good POST → 200 Machine JSON + new evaluation in Supabase | 200 with no store write |
| C19 | NOT RUN (blocked on C13) | Store down after auth | Sanitized 503; **no claim** of a durable failed-to-run write | 200, HTML, or fake store receipt |
| C20 | NOT RUN | Never-ran is EVENTUAL | No POST in due window → later hydrate shows overdue; **not** certified as real-time | Called “independent alarm” |
| C21 | **NOT RUN / unproven** (L15) | Scheduler-death observer | Must remain **NOT RUN / unproven** this pass (L15) | Observer claimed without cert |
| C22 | NOT RUN (blocked on C18) | No duplicate incident/recovery | Second distinct good POST does not clone incidents/recoveries beyond Machine rules | Duplicate incident ids |
| C23 | NOT RUN (blocked on C18) | Incident Command | After wake, Command still initializes at schema 2 from live store | Schema mismatch / mix fixtures |
| C24 | **NOT CONNECTED** | No scheduler connected | No cron/Build-A-Bot/Make. Forbidden until C1–C20 pass. | Scheduler added |
| C25 | NOT RUN | No extra vendors/DB | Only Netlify wake site + existing Supabase | Redis/new DB/Resend/etc. |
| C26 | NOT RUN | Rollback | Wake site removed; Studio private; schema 2 intact | Studio opened or schema dropped |
| C27 | NOT RUN | Bundle isolation | Wake artifact listing has no Studio page modules | Full Next app shipped |

**Stop rules**

- Any 401 HTML on the **wake** origin → BLOCKED (L14 class). Do not rotate the sweep secret.  
- Any proxy to the private host → FAIL. Remove the proxy. Do not “just add a token.”  
- C13 provider 429 remains **unproven**. Do not retry the wake origin for C13 while Netlify Support is investigating.  
- Do not connect a scheduler until C1–C20 pass. C21 stays unproven.

---

## Explicit non-goals

- Do not close the package or claim live-production certification.  
- Do not contact either origin for C13 retries. Do not run authenticated wake until C13.  
- Do not merge, start L13, Board persistence, or mobile.  
- Do not open a new package.  
- Do not rotate `STUDIO_OPERATING_SWEEP_SECRET` for L14.  
- Do not claim an authenticated sweep pass or fail at the private Studio layer.
