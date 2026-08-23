# Supervision dependency audit (read-only, 2026-08-23)

Owner-accepted facts. No implementation in this file. No fake connections.

## Connection truth

| System | Account/tool | Credentials in this env | Code connector | Machine send | Machine receive | Schedule | Failure detection | Customer/project context | Owner alert | Proven? |
|--------|--------------|-------------------------|----------------|--------------|-----------------|----------|-------------------|--------------------------|-------------|--------|
| Claude | Anthropic Messages only in code | `ANTHROPIC_API_KEY` absent | Decision-learner + optional design reasoner | Not as an agent | Model JSON only if keyed | No | No for supervision | No incident object | No | **Not connected** |
| Build-A-Bot | Not in repo | No | No | No | No | No | No | No | No | **Not present** |
| Resend | Adapter yes | `RESEND_API_KEY` / from address absent | Yes | If configured | Provider id only | Sweep route exists; sweep secret absent; no cron | Watchdog findings; Owner action not required | Campaign id | No pager | **Parked / not live-proven** |
| Machine records | Campaign, tasks, jobs, exceptions | Local store | Yes | Production events | Same stores | Sweep routes unscheduled | Production stalls, not agent/security incidents | Yes on those records | Desk folders only | **Partial** |
| Owner Console | `/file-room/owner-console` | Session | Yes | Exception folders | Folder state | No next-check timer | Known exception kinds | Campaign labels | Open the desk | **Decision desk, not incident command** |

## Owner Console gap vs required incident report

Present in some form: campaign, what happened, some deadline/money/policy exception kinds, exception event history, Owner actions on the desk.

Missing: severity covering security/breach; stalled agent/tool/provider; last healthy time; suspected breach impact; who to contact; next automatic action and next check time; out-of-band alert; serious security layout.

## Squishy

Canonical existing customer-guide asset: `public/squishy/squishy-studio-guide-v1.png` (1122×1402 PNG). Watchkeeper use is **not** certified in this parked mobile package.

## Consequence

Mobile real-phone certification cannot honestly close this gap. Resume mobile only after `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1` closes.
