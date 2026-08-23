# Defect and limit ledger

Opening snapshot 2026-08-23. Foundation Pass 1 updates L4/L5 only. Do not treat this as package close.

| Id | Limit | Status |
|----|-------|--------|
| L1 | Claude not connected | Open |
| L2 | Build-A-Bot not in repo | Open |
| L3 | Resend parked; cannot be the out-of-band proof | Open |
| L4 | Machine incident record | **In progress** — in-process append-only incident store exists for Foundation Pass 1. Not persisted. Not scheduled. Not certified. |
| L5 | Owner Console is a decision desk, not incident command | **In progress** — additive `/file-room/incident-command` board exists. Decision desk unchanged. Not certified. |
| L6 | No scheduled heartbeat | Open |
| L7 | Agents/tools/security not in current exception model | Open — Machine incident model exists in-process; not wired to live agents/tools |
| L8 | No proven out-of-band Owner alert | Open |
| L9 | Mobile phone cert parked; not a substitute for this package | Recorded |

## Observed incidents (historical)

These are real events. They are not Watchtower detections.

| Id | Observation | Status |
|----|-------------|--------|
| O1 | **2026-08-23 · Scout browser sign-in stall.** Foundation Pass 1 Owner proof paused on the local `/sign-in` step for **approximately 12.5 minutes** with **no progress**. There was **no automatic heartbeat detection** and **no automatic recovery or report**. **Tagia (Owner) detected the stall manually** and resumed the agent. This confirms the need for independent Machine supervision of agent/tool work. **Do not pretend the new Watchtower detected this event.** The stall occurred before the Watchtower was operational. Evidence: interrupted Cursor browser `browser_fill` on the local Owner sign-in; HTTP `npm run dev` remained up; uncommitted Foundation Pass 1 work was preserved. | Recorded · historical · Watchtower did not detect |

Do not close this package while L1–L3 and L6–L8 remain unproven without an explicit Owner limit stamp. L4/L5 are not closed. O1 does not close L6; it is evidence that L6 is real.
