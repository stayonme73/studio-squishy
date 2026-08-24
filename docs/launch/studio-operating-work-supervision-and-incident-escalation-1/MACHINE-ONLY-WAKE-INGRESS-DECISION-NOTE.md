# Machine-only wake ingress — decision note

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**Status:** PLANNING ONLY. Not implemented. Not certified.  
**Ledger:** L14  
**Date:** 2026-08-24  
**Verdict of the authenticated sweep proof:** **BLOCKED BY NETLIFY TEAM PROTECTION** — not a Studio-layer pass, not a Studio-layer fail.

This note is provider-independent. It does not select Build-A-Bot, Make, Claude, Resend, Netlify Functions, or any other vendor. It does not authorize a connector, gateway, or scheduler.

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

The existing Machine sweep route remains the system of record. The missing piece is a **wake entrance**, not a second Machine.

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

### Rate limiting

- Bound request rate per source.
- Fail closed when the bound is exceeded (reject; do not run a sweep).
- Do not let a stuck scheduler hammer the Machine.

### No customer UI or page exposure

- HTML login walls, marketing pages, and app routes are out of scope for this entrance.
- A successful wake returns Machine JSON only.
- An auth failure returns a non-secret Machine error body, not a human login page.

### Bounded retries

- The wake caller retries with a stated backoff and a hard cap.
- Exhausted retries are recorded as **never completed**, not as a healthy check.

### Ran-versus-never-ran evidence

The Machine must be able to distinguish:

- the wake **ran** and the sweep evaluated (healthy or not)
- the wake **never ran** (blocked, unreachable, auth wall, timeout, exhausted retries)

A 401 HTML team-login page is **never-ran**. It must not be stored as a completed sweep.

### Scheduler failure becomes an incident

- A dead, silent, or blocked scheduler is itself an incident.
- That incident is Machine-owned, append-only, and visible on Incident Command.
- Humans must not have to notice that wakes stopped.

### How it calls the existing Machine sweep

- Ingress authenticates the caller, then invokes the **existing** Machine sweep (`POST /api/operating/supervision/sweep` contract: Machine computes health, claims the sweep, writes evaluations to the durable store).
- Ingress does not compute lease health, open incidents, or recover work.
- Ingress does not bypass schema version 2 or the live Supabase store.
- Duplicate incident and recovery rules stay in the Machine, not in the gateway.

---

## Smallest safe certification path

Do **not** start this path until Tagia authorizes an implementation pass. Smallest later proof:

1. Keep the current certification site private. No public-site shortcut.
2. Add a **wake-only** entrance that is unreachable as a Studio page.
3. Prove one noninteractive POST: header secret, no query string, Machine JSON, sweep evaluation written to live Supabase, no duplicate incident or recovery, Incident Command still at schema version 2.
4. Prove a denied POST (wrong or missing secret) returns fail-closed Machine JSON and writes no sweep evaluation.
5. Prove a blocked or silent caller is recorded as never-ran / scheduler incident.
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
