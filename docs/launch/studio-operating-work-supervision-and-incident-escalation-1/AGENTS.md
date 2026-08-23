# Package AGENTS notes — work supervision and incident escalation

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**State:** OPEN / IN PROGRESS — **Foundation Pass 1 accepted. Runtime Pass 2 accepted. Durable Pass 3 accepted for local/controlled proof only. Pass 3B production guardrail accepted. Pass 3C live REST/RPC connector ready. Not closed. Not live-certified.**

- Room 4. Not Room 5. Not Room 4D/4E.  
- Machine owns leases, heartbeat truth, sweep, incident records, and the durable store.  
- Workers may register and heartbeat through `/api/operating/supervision/*`. They may not declare themselves healthy.  
- Provider class: memory = unit tests only; `studio-data-json` = local development and controlled certification only; launch production requires `supabase-postgres` with the live REST/RPC connector. Production fails closed otherwise.  
- Live Supabase is **not certified** until Owner applies migrations, sets server-only env names through an approved secret path, and authorizes a real two-process proof. Do not ask Tagia to paste secrets.  
- Do not delete Pass 3 local evidence. Do not claim the JSON file store is launch-certified.  
- Do not expose the Supabase service-role key to the browser. Object/file storage is not the incident database.  
- Do not connect or claim Claude, Build-A-Bot, Make, or Resend.  
- Do not add a scheduler connector until **live** production durability is proven.  
- Mobile certification is PARKED; do not start the phone walk.  
- Squishy Watchkeeper: `public/squishy/squishy-studio-guide-v1.png` only; CSS rings only; never on security incidents.  
- Additive command route: `/file-room/incident-command`. Do not reopen the Owner Console decision desk.  
- No merge.
