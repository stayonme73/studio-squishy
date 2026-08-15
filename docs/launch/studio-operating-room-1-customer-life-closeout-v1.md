# Room 1 — Customer Life + Communication closeout

**Room:** 1  
**Room closed:** **NO**  
**Merge:** no  
**Do not start:** Owner Console · Rooms 2–5

This is the Room 1 closeout ledger. It is **not** a green check. Technical tests passing do not close the room.

---

## COME BACK LATER — live customer lifecycle email

> **FLAG: PARKED WITH EXTERNAL PREREQUISITE. NOT CLOSED. DO NOT FAKE.**

**Package:** `STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1`  
**Protected checkpoint:** `d6974eb` — do not rewrite or claim this package CLOSED  
**Verdict:** PARKED WITH EXTERNAL PREREQUISITE

**Why it is parked, not closed:** The Studio does not yet have a purchased and verified business domain or business email identity.

**Gates intentionally deferred until that identity exists:**

1. Branded sender certification
2. Real inbox delivery proof
3. Live provider reject/retry proof against the final Studio sender setup

Do **not** fake those gates with temporary infrastructure (`resend.dev` onboarding sender as “Studio identity,” disposable inboxes as close proof, etc.).

When the Owner later establishes the Studio domain and business-email identity, **return to this same package** and finish live Resend certification.

Until then, Board + Voice remain the honest customer surfaces. Queued notices and the existing Resend adapter stay wired. Email is a nudge, not the project record.

---

## Board (Room 1 sections)

| Section | Status |
|---|---|
| Paid entry | Sealed prior |
| Project claim / return | Sealed prior |
| Paid activation recovery | Sealed prior |
| Materials + real uploads | Sealed prior |
| Studio Voice ↔ Machine ↔ customer | Sealed prior |
| Review + revision + exact Final Delivery | **CLOSED** (`07c1434`) |
| Resend / lifecycle email + watchdog live cert | **PARKED WITH EXTERNAL PREREQUISITE** (`d6974eb`) — see flag above |
| Whole-customer torture test | **PARKED FOR MANAGER** — `STUDIO-OPERATING-ROOM-1-WHOLE-CUSTOMER-LIFE-TORTURE-TEST-1`. Architecture park `5407796`. Same-package Voice summary correction recorded in the torture-test report. Room 1 still **not closed**. |

Room 1 still requires the locked chaotic-failure pass (wrong upload, duplicate, stall/timeout recover, QA fail then pass, stale-version, return-later, failed notification with Board/Voice still honest). That pass **must not** require branded inbox certification.

---

## Authority

- `docs/launch-readiness-execution-order-v1-locked.md`
- `src/config/studio-launch-readiness-execution-order-v1.ts`
- `src/config/studio-room-1-customer-life-closeout-v1.ts`
