# Host Journey Operating Runbook V1

**Status:** Operating guide for Host iPad / projection sessions  
**Scope:** Live commerce path only — Route Map → Build Your Project → Studio Plan → Secure Checkout → Project Intake → Studio Board  
**Not in scope:** Lobby Guide voice / dictation / TTS; quarantined Discovery / Project Summary paths

## Live path (code truth)

1. **Route Map** — `/route-map`
2. **Build Your Project** — `/project-builder?road=…`
3. **Studio Plan** — same route with `&view=studio-plan`
4. **Review and Confirm** — `/checkout` (legacy `/payment` redirects here)
5. **Project Intake** — `/route-map?step=intake` (requires paid/paid-state campaign)
6. **Studio Board** — `/studio-board` (**requires signed-in Host session**)

Quarantined (do not demo as live): `/project-summary`, `/project-details`, `/business-discovery-studio`, `/studio-guide-prototype` as front door.

## Before every Host session

1. Prefer a **production-like** serve: `npm run build` then `npm run start` (clears “1 Issue” / Studio Review overlays that appear only in `next dev`).
2. If commerce routes 404 or typed routes break (`PageRoutes = never`), stop, delete `.next`, rebuild, restart. Do not continue a broken cache session.
3. Sign in as Host **before** projecting Studio Board. There is **no auth bypass**.
4. Confirm Review and Confirm honesty copy is visible: card processing is **not** live; confirm continues to Project Intake. Do not project a “Save failed” status (remote sync may be unavailable while local progress still works).

## Pause points (Host script)

| Pause | Where | What to say |
|-------|--------|-------------|
| Route choice | Route Map | Customer picks a lane; Host does not force a road. |
| Scope | Build Your Project | Squishy rail is an **example conversation**, not prior chat. |
| Plan review | Studio Plan | Confirm services + Estimated Investment before checkout. |
| Confirm | Review and Confirm | This build records the plan locally; no card is charged. Dummy card fields may still be required by the form — use test values; nothing is processed. |
| Intake | Route Map intake | Materials/details before Studio Board. |
| Board | Studio Board | Must be signed in; project appears after paid + intake continuity. |

## Paid-state path (do not skip)

Intake continuity depends on campaign paid state. Always:

1. Complete Review and Confirm (Confirm / Test continue) so `markPaymentReceived` runs.
2. Land on `/route-map?step=intake`.
3. Finish intake gates before opening Studio Board.

Skipping checkout and deep-linking intake will fail or show incomplete continuity (HJ-INT-01).

## Studio Board handoff

- Unsigned sessions receive a redirect to sign-in (expected).
- Host must authenticate on the iPad / demo machine first.
- After sign-in, return to `/studio-board` for the paid campaign.

## Projection hygiene

- Use `npm run start` (production build) when projecting to customers so **Studio Review** (`OwnerQaPanel`) is not mounted.
- Never narrate Studio Review or hydration “1 Issue” badges as product UI.

## Recovery

| Symptom | Action |
|---------|--------|
| Routes 404 after pull/rebuild | Delete `.next`, `npm run build`, `npm run start` |
| Intake blocked / empty | Re-run checkout on the same campaign; do not skip paid state |
| Board → sign-in | Sign in as Host; do not expect anonymous Board access |
| Stale copy after deploy | Hard refresh; confirm build timestamp |

## Honesty statements (approved)

- Confirm page title: **Review and Confirm** (not “Secure Checkout” until live processing ships)
- Payment: local plan record + continue to intake; **not** live card processing
- Emails: stage emails are **not** sent in this build; status is on Studio Board after intake
- Squishy companion: **example only**

## Related docs

- `docs/customer-journey-v1-locked.md` — journey names + live chain
- `src/config/legacy-route-quarantine-v1.ts` — quarantine list
- `src/config/payment.ts` — checkout copy source of truth
