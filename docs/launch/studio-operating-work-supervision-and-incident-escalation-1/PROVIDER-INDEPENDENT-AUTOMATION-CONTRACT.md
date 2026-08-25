# Provider-independent automation contract (opening)

Automation (timers, webhooks, retries, wake-ups) must satisfy this contract **before** any vendor is called “connected.”

The Machine remains the system of record. The automation provider is a wake mechanism.

## Required capabilities

1. Fire a check at a stated time without a human.  
2. POST to a Machine endpoint with a shared secret (no secret in query strings).  
3. Retry with a bounded backoff when the Machine is unreachable.  
4. Record success/failure back into a Machine incident or check log.  
5. Distinguish “check ran and found healthy” from “check never ran.”  
6. Carry incident id, campaign id, and severity when waking an alert path.  
7. Fail closed: a dead scheduler must itself become an incident.

## Current blocker (C13 / L14)

The private certification host requires human Netlify Team Login. **C1 PASS:** that wall still holds. An external watchdog must not use that host.

Recorded 2026-08-24: `POST /api/operating/supervision/sweep` on the private Studio host with `x-studio-operating-secret` and no query string received **401 HTML**. The Studio returned no Machine JSON. Studio service authentication never ran. This is **not** a mismatched sweep secret.

The separate machine-only wake **runtime** now exists (see `MACHINE-ONLY-WAKE-RUNTIME-IMPLEMENTATION-CONTRACT.md`):

- Keep the certification site private.
- Stop sweep tests against the private Studio host.
- Do not rotate `STUDIO_OPERATING_SWEEP_SECRET` again for this failure.
- Do not proxy to the private host from a second URL.
- Do not use a Netlify management API token as visitor authentication.
- Do not claim the authenticated sweep passed or failed at the Studio layer.
- **C13 WAITING ON NETLIFY SUPPORT.** Provider 429 remains unproven. Do not retry the wake origin for C13.
- Authenticated wake **NOT RUN** and blocked on C13.
- Do not connect a scheduler until C1–C20 pass. L15 remains unproven.

Wake-runtime contract (implemented and deployed; not live-production certified):

- Provider request cap **before** handler authentication. Wrong-secret traffic is bounded with no Supabase write. Application still returns 401 JSON and writes nothing when the Studio secret is wrong.
- Authenticated store-backed cap: **18 unique successful wakes per rolling hour**. Repeated idempotency keys do not consume additional capacity.
- Durable 24-hour wake idempotency: table `supervision_wake_idempotency`, RPCs `supervision_claim_wake_idempotency` and `supervision_complete_wake_idempotency`. No process memory. Existing `supervision_idempotency` stays heartbeat-only.
- Never-ran-on-hydrate is **EVENTUAL** detection (L15). Independent scheduler-death detection remains unproven until a separate heartbeat observer is certified. Capability 7 (“a dead scheduler must itself become an incident”) is not closed by hydrate-only detection.
- If Supabase is down after authentication: sanitized 503, no claimed durable failed-to-run write, caller retains the attempt result, stale-last-success creates the incident after recovery.

## Build-A-Bot

Candidate only. Connect only if a live proof shows the list above.

## Make.com

Do not add Make unless Build-A-Bot is proven insufficient **and** the Owner separately authorizes Make.
