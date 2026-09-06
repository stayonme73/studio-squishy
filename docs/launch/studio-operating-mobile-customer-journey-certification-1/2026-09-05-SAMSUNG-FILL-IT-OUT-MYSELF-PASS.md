# Samsung Fill it out myself PASS (2026-09-05)

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`  
**Branch:** `operating/mobile-customer-journey-certification-1`  
**Status:** OPEN / IN PROGRESS. Not closed. Live-phone certification is **not** stamped.  
**Supervision:** not started. **Merge:** no. **Room 5:** do not start.  
**Step 2 Choose Your Services:** still frozen. Do not restyle.

This records a real-device Voice Choice pass and the actual root cause of the earlier “taps do nothing” reports. It does **not** close Mobile.

---

## Root cause

The hotel/network LAN IP changed to **10.179.174.254**. Next.js `allowedDevOrigins` still listed only the old Studio LAN **10.1.10.208**.

Samsung could receive HTML (Voice Choice painted). `/_next` client assets from that host were **403**. Hydration and today’s JavaScript never ran. That produced HTML-without-JS: the page looked present, taps did nothing, and the temporary debug strip could not appear.

This was **not** a Fill-button miss on today’s instrumented client.

---

## Samsung PASS — Fill it out myself

After the origin allowlist included `10.179.174.254` and today’s client actually loaded, Tagia performed **one normal tap** on **Fill it out myself**.

| Check | Result |
|-------|--------|
| CHOOSE off ran | PASS |
| VOICE=off | PASS |
| GATE=no | PASS |
| Voice Choice gate exited | PASS |
| Name question opened | PASS |
| Microphone listening/start | none observed |

**Fill it out myself PASSES real-device Samsung activation.** Ledger: MJ-D16 (leftover-mic / Voice Off) and MJ-D20 (stale origin).

---

## Cleanup

Temporary Samsung tap-debug HUD / `studioTapDebug` instrumentation has been removed. `allowedDevOrigins` keeps only the two recorded private-network IPs (`10.1.10.208`, `10.179.174.254`). No wildcards.

---

## Resume URL (no debug query)

**https://10.179.174.254:3000/?studioPaymentSandbox=1**

Close any leftover debug tab first. There must be **no** `SAMSUNG TAP DEBUG` strip. Step 2 stays frozen. Do not merge. Do not close Mobile.
