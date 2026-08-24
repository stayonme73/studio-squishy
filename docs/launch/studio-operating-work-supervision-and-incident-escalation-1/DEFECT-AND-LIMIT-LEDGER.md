# Defect and limit ledger

Opening snapshot 2026-08-23. Pass 3B records the launch-runtime durability defect. Do not treat this as package close. Do not delete Pass 3 local evidence.

| Id | Limit | Status |
|----|-------|--------|
| L1 | Claude not connected | Open |
| L2 | Build-A-Bot not in repo | Open |
| L3 | Resend parked; cannot be the out-of-band proof | Open |
| L4 | Machine incident record | **In progress** — local `studio-data-json` store under `data/supervision/` is accepted for local development and controlled restart proof only (Pass 3 at `05509c9b`). Launch production requires shared Supabase Postgres. Not launch-certified. |
| L5 | Owner Console is a decision desk, not incident command | **In progress** — additive `/file-room/incident-command` board exists. Decision desk unchanged. Fixture and live records are separate. Not certified. |
| L6 | No scheduled heartbeat | **In progress** — Machine sweep runs in-process while Node is awake. Live two-process Supabase proof passed. No external scheduler. Do not connect a scheduler until Tagia separately authorizes it. |
| L7 | Agents/tools/security not in current exception model | **In progress** — provider-independent registration/heartbeat contract exists; Claude/Build-A-Bot/Make/Resend remain NOT CONNECTED |
| L8 | No proven out-of-band Owner alert | Open |
| L9 | Mobile phone cert parked; not a substitute for this package | Recorded |
| L10 | JSON file store is not a launch-production incident store | **Pass 3B accepted.** **Pass 3C** wired the live REST/RPC connector. **Live two-process proof passed** with fictional Maple/Harbor records. JSON remains local-only. Package remains OPEN. Do not connect Build-A-Bot until Tagia authorizes it. |
| L11 | Live connector sent Secret Keys as Authorization Bearer | **Corrected.** Current `sb_secret_` keys use `apikey` only. Legacy JWT `service_role` remains a compatibility fallback. Do not paste secrets into chat. |
| L12 | Durable customer identity | **Outside this Owner-auth repair.** Production staff lookup is the immutable bundled seed in memory. Production customer signup and mutable `data/studio-users.json` stay fail-closed. This cert-only staff path does not solve durable customer authentication. |

## Observed incidents (historical)

These are real events. They are not Watchtower detections.

| Id | Observation | Status |
|----|-------------|--------|
| O1 | **2026-08-23 · Scout browser sign-in stall.** Foundation Pass 1 Owner proof paused on the local `/sign-in` step for **approximately 12.5 minutes** with **no progress**. There was **no automatic heartbeat detection** and **no automatic recovery or report**. **Tagia (Owner) detected the stall manually** and resumed the agent. This confirms the need for independent Machine supervision of agent/tool work. **Do not pretend the new Watchtower detected this event.** The stall occurred before the Watchtower was operational. Evidence: interrupted Cursor browser `browser_fill` on the local Owner sign-in; HTTP `npm run dev` remained up; uncommitted Foundation Pass 1 work was preserved. | Recorded · historical · Watchtower did not detect |

Do not close this package while L1–L3, L6–L8, and L10 remain unproven without an explicit Owner limit stamp. L4/L5 are not closed. O1 does not close L6; it is evidence that L6 is real. Pass 3 local JSON proof does not close L10.
