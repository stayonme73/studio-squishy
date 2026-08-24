# Machine-only wake ingress — decision note

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**Status:** PLANNING ONLY. **Architecture conditionally approved 2026-08-24. Not implemented. Not certified.**  
**Ledger:** L14 · L15  
**Date:** 2026-08-24  
**Verdict of the authenticated sweep proof:** **BLOCKED BY NETLIFY TEAM PROTECTION** — not a Studio-layer pass, not a Studio-layer fail.

**Owner decision:** a separate machine-only **wake runtime** is approved only if it executes existing Machine sweep logic against the same Supabase store and **never proxies** to the private Studio host. Implementation contract: `MACHINE-ONLY-WAKE-RUNTIME-IMPLEMENTATION-CONTRACT.md`. Do not build until Tagia authorizes that pass.

A second URL that forwards to the private host is rejected: it recreates L14.

This note does not select Build-A-Bot, Make, Claude, or Resend. It does not authorize a scheduler.

---

## What the proof actually showed

One POST to the private certification host:

- path `/api/operating/supervision/sweep`
- secret only in `x-studio-operating-secret`
- no query string
- HTTP **401**
- response **HTML**, not Machine JSON
- The Studio returned no sweep body
- therefore the request **never reached** Studio service authentication

This is **not** evidence that `STUDIO_OPERATING_SWEEP_SECRET` is wrong. Do not rotate that secret again for this blocker. Do not treat a Netlify management API token as visitor authentication.

[Netlify Team Login / password protection](https://docs.netlify.com/manage/security/secure-access-to-sites/password-protection/) is a human team-member gate. It is not a machine-authentication method for an external watchdog.

---

## Deployment conflict (keep both truths)

1. The certification site must remain **private**. Do not make it public.
2. An external watchdog must reach the sweep path **without a human login**.
3. The current private-host configuration cannot satisfy both.
4. Stop testing the sweep against this host until a separate machine-only wake ingress exists.

The existing Machine sweep **logic** and the **Supabase** supervision store remain the system of record. The missing piece is a **thin wake runtime** on a dedicated origin that runs that logic itself. It is not a second Machine, not a second database, and not a proxy in front of Team Login.

---

## Required properties of a machine-only wake ingress

All of the following are required before any scheduler is called connected.

### Separate wake-only endpoint or host

- Expose **only** the authenticated sweep wake path.
- Expose **no** Studio pages, Owner Console, Incident Command UI, customer UI, or static site.
- The private certification app host stays private for humans.

### Studio sweep-secret validation

- Accept the shared sweep secret only in `x-studio-operating-secret`.
- Never place the secret in a query string, path, or log.
- Fail closed on missing, empty, or mismatched secret.
- Do not use a Netlify team session, Team Login cookie, or management API token as the visitor credential.

### Rate limiting (two layers)

- **Provider cap before the handler.** Abusive or wrong-secret traffic is bounded at the edge with no function run and no Supabase write. If the plan cannot attach this cap, do not ship.
- After a request reaches the function: wrong or missing Studio secret still returns **401 JSON** and writes nothing.
- **Authenticated cap:** 18 unique successful wakes per rolling hour. Repeated `idempotency-key` values do not consume extra capacity.
- Durable 24-hour wake idempotency is table `supervision_wake_idempotency` plus RPCs `supervision_claim_wake_idempotency` and `supervision_complete_wake_idempotency` in the same project. No process memory.

### No customer UI or page exposure

- HTML login walls, marketing pages, and app routes are out of scope for this entrance.
- A successful wake returns Machine JSON only.
- An auth failure returns a non-secret Machine error body, not a human login page.

### Bounded retries

- The wake caller retries with a stated backoff and a hard cap, same `idempotency-key` each time.
- Exhausted retries are **caller-side failed-to-run**, not a healthy check.
- If Supabase was down, the wake door cannot durably write “failed-to-run” there. It returns sanitized **503**. The caller retains the attempt result. After the store recovers, stale-last-success / overdue next-check creates the incident.

### Ran-versus-never-ran evidence

The Machine must distinguish **ran**, **failed-to-run**, and **never-ran**.

- **Ran:** authenticated sweep completed and wrote to the live store.
- **Failed-to-run (caller-visible):** authenticated request could not complete; sanitized 503. No claim of a durable store write if Supabase was unavailable.
- **Never-ran-on-hydrate:** no successful run by the due time, seen on a **later** hydrate. That is **EVENTUAL** detection, not an always-on alarm.

A 401 HTML team-login page is **never-ran** at the private Studio origin (L14). It must not be stored as a completed sweep.

### Scheduler failure becomes an incident (required end state; unproven)

- A dead, silent, or blocked scheduler **must** become a Machine-owned incident. That remains the required end state.
- **L15:** independent scheduler-death / never-ran **real-time** detection is **unproven**. Never-ran seen only on the next hydrate is eventual, not a pager at the missed due instant.
- Do not claim humans “never have to notice” until a separate scheduler heartbeat observer is certified. That observer is not part of the wake-runtime build.

### How it runs the existing Machine sweep

- Wake runtime authenticates the caller on the **dedicated origin**, then runs the **existing** `machine.sweep()` in-process against live Supabase (schema version 2).
- It does **not** HTTP-call the private Studio host. A proxy recreates L14.
- It does not invent lease-health rules, a second incident store, or a second Machine.
- Duplicate incident and recovery rules stay inside the existing Machine code.
- The private Studio reads the same Supabase rows afterward.

---

## Smallest safe certification path

Do **not** start this path until Tagia authorizes an implementation pass. Smallest later proof:

1. Keep the current certification site private. No public-site shortcut.
2. Add a **wake-only runtime** on a dedicated origin with no Studio pages. It must execute `machine.sweep()` itself, not forward to the private host.
3. Prove one noninteractive POST: header secret, no query string, Machine JSON, sweep evaluation written to live Supabase, no duplicate incident or recovery, Incident Command still at schema version 2.
4. Prove a denied POST (wrong or missing secret) returns fail-closed Machine JSON and writes no sweep evaluation.
5. Prove eventual never-ran-on-hydrate only: no POST in the due window, later hydrate shows overdue — **not** independent scheduler-death detection (L15 remains unproven).
6. Only then consider connecting an external scheduler against `PROVIDER-INDEPENDENT-AUTOMATION-CONTRACT.md`.

Until that path exists, stop sweep tests against the Team Login–protected host.

---

## Explicit non-goals (this note)

- Do not implement a connector or gateway in this recording.
- Do not connect Build-A-Bot, Make, Claude, or Resend.
- Do not weaken or remove Netlify Team Login on the certification site.
- Do not rotate `STUDIO_OPERATING_SWEEP_SECRET` again for this failure.
- Do not claim the authenticated sweep passed or failed at the Studio layer.
- Do not start L13, Board persistence, merge, close, or mobile work.
