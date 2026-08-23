# Package AGENTS notes — work supervision and incident escalation

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**State:** OPEN / IN PROGRESS — **Foundation Pass 1 accepted. Runtime Pass 2 accepted. Durable Pass 3 in progress. Not closed. Not certified.**

- Room 4. Not Room 5. Not Room 4D/4E.  
- Machine owns leases, heartbeat truth, sweep, incident records, and the durable store.  
- Workers may register and heartbeat through `/api/operating/supervision/*`. They may not declare themselves healthy.  
- Durable store is `studio-data-json` under `data/supervision/`. Do not invent a second database. Do not claim Supabase holds these records.  
- Do not connect or claim Claude, Build-A-Bot, Make, or Resend.  
- Do not add a scheduler connector until durable restart recovery is accepted.  
- Mobile certification is PARKED; do not start the phone walk.  
- Squishy Watchkeeper: `public/squishy/squishy-studio-guide-v1.png` only; CSS rings only; never on security incidents.  
- Additive command route: `/file-room/incident-command`. Do not reopen the Owner Console decision desk.  
- No merge.
