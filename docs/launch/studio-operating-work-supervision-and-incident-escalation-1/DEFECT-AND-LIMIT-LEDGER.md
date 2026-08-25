# Defect and limit ledger

Opening snapshot 2026-08-23. Pass 3B records the launch-runtime durability defect. Do not treat this as package close. Do not delete Pass 3 local evidence.

| Id | Limit | Status |
|----|-------|--------|
| L1 | Claude not connected | Open |
| L2 | Build-A-Bot not in repo | Open |
| L3 | Resend parked; cannot be the out-of-band proof | Open |
| L4 | Machine incident record | **In progress** — local `studio-data-json` store under `data/supervision/` is accepted for local development and controlled restart proof only (Pass 3 at `05509c9b`). Launch production requires shared Supabase Postgres. Not launch-certified. |
| L5 | Owner Console is a decision desk, not incident command | **In progress** — additive `/file-room/incident-command` board exists. Decision desk unchanged. Fixture and live records are separate. Not certified. |
| L6 | No scheduled heartbeat | **In progress / blocked for scheduler connect.** Machine sweep runs in-process while Node is awake. Live two-process Supabase proof passed. Wake runtime is implemented and deployed on a separate site. **C13 WAITING ON NETLIFY SUPPORT.** Authenticated wake **NOT RUN**. No external scheduler. Hydrate-only never-ran is eventual (L15), not a scheduler-death alarm. Do not connect a scheduler until C1–C20 pass. |
| L7 | Agents/tools/security not in current exception model | **In progress** — provider-independent registration/heartbeat contract exists; Claude/Build-A-Bot/Make/Resend remain NOT CONNECTED |
| L7 | Agents/tools/security not in current exception model | **In progress** — provider-independent registration/heartbeat contract exists; Claude/Build-A-Bot/Make/Resend remain NOT CONNECTED |
| L8 | No proven out-of-band Owner alert | Open |
| L9 | Mobile phone cert parked; not a substitute for this package | Recorded |
| L10 | JSON file store is not a launch-production incident store | **Pass 3B accepted.** **Pass 3C** wired the live REST/RPC connector. **Live two-process proof passed** with fictional Maple/Harbor records. JSON remains local-only. Package remains OPEN. Do not connect Build-A-Bot until Tagia authorizes it. |
| L11 | Live connector sent Secret Keys as Authorization Bearer | **Corrected.** Current `sb_secret_` keys use `apikey` only. Legacy JWT `service_role` remains a compatibility fallback. Do not paste secrets into chat. |
| L12 | Durable customer identity | **Outside this Owner-auth repair.** Production staff lookup is the immutable bundled seed in memory. Production customer signup and mutable `data/studio-users.json` stay fail-closed. The Edge/Deno proxy gate fail-closes unknown and customer cookies until a durable customer identity repository exists. This cert-only staff path does not solve durable customer authentication. |
| L13 | Durable Studio Board campaign/job repository | **Separate production gap. Not this Edge session repair.** Studio Board campaign, job, task, materials, communication, and related records still use local JSON under `data/`. Netlify cannot provide a durable filesystem. Do not substitute volatile memory, `/tmp`, or bundled JSON. Incident Command live supervision already uses Supabase; Board records need their own production repository in a later scoped package. Do not start L13 from this recording. |
| L14 | Private certification host vs noninteractive Machine wake | **Open. Wake runtime implemented and deployed.** Private Studio still returns Team Login (**C1 PASS**). Authenticated wake **NOT RUN** and blocked on C13. Provider 429 unproven (**C13 WAITING ON NETLIFY SUPPORT**). L14 is **not closed**. O2: private host 401 HTML; Studio auth never ran; not a bad secret. Keep the Studio site private. Stop sweep tests on that host. Wake runtime executes existing `machine.sweep()` against the same Supabase schema v2 and **must not proxy** to the private host. Main Studio Netlify builds are Owner-stated STOPPED. No scheduler yet. Decision note: `MACHINE-ONLY-WAKE-INGRESS-DECISION-NOTE.md`. Implementation contract: `MACHINE-ONLY-WAKE-RUNTIME-IMPLEMENTATION-CONTRACT.md`. |
| L15 | Independent scheduler-death / never-ran real-time detection | **Open. Unproven.** Never-ran seen only on a later hydrate (stale last success / `supervision_due_next_checks`) is **EVENTUAL** detection. It is not an always-on alarm. A separate scheduler heartbeat observer is required before independent death-detection can be certified. Not part of the wake-runtime build. Do not claim L6/L14 are closed by hydrate-only detection. |

## Observed incidents (historical)

These are real events. They are not Watchtower detections.

| Id | Observation | Status |
|----|-------------|--------|
| O1 | **2026-08-23 · Scout browser sign-in stall.** Foundation Pass 1 Owner proof paused on the local `/sign-in` step for **approximately 12.5 minutes** with **no progress**. There was **no automatic heartbeat detection** and **no automatic recovery or report**. **Tagia (Owner) detected the stall manually** and resumed the agent. This confirms the need for independent Machine supervision of agent/tool work. **Do not pretend the new Watchtower detected this event.** The stall occurred before the Watchtower was operational. Evidence: interrupted Cursor browser `browser_fill` on the local Owner sign-in; HTTP `npm run dev` remained up; uncommitted Foundation Pass 1 work was preserved. | Recorded · historical · Watchtower did not detect |
| O2 | **2026-08-24 · Authenticated sweep POST blocked by Netlify Team Login.** Private certification host returned **401 HTML** for `POST /api/operating/supervision/sweep` with `x-studio-operating-secret` and no query string. No Machine JSON. Studio service authentication did not run. This is never-ran evidence, not a completed sweep, and not a mismatched-secret proof. | Recorded · supports L14 · stop sweep tests on this host |

Do not close this package while L1–L3, L6–L8, L10, L14, and L15 remain unproven without an explicit Owner limit stamp. L4/L5 are not closed. O1 does not close L6; it is evidence that L6 is real. O2 does not fail Studio sweep auth; it proves L14. Eventual never-ran-on-hydrate does not close L15. Pass 3 local JSON proof does not close L10.
