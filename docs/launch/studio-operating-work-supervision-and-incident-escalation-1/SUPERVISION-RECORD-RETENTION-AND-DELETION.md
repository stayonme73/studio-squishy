# Supervision record retention and deletion

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**Pass:** 3B

This policy is separate from normal incident updates. Append-only incident events, heartbeats, and sweep evaluations cannot be rewritten as part of ordinary supervision.

## Normal operations

- Open, update, escalate, recover, and resolve through new events.  
- Derived incident state is reconstructed from history.  
- `replaceIncidentEvents` and SQL `UPDATE`/`DELETE` on event tables are forbidden.

## Retention / deletion (Owner-authorized only)

Deletion, redaction, or archive of supervision records is a distinct Owner retention action. It is not a sweep, heartbeat, or incident-state change.

Until an Owner retention pass is authorized:

- Do not add silent purge jobs.  
- Do not treat resolve as physical delete.  
- Do not log secrets, service-role keys, or real customer content in evidence files.

Fictional Maple & Pine / Harbor Lantern labels used in proofs are fixtures, not customer records.

## Production store

When live Supabase Postgres is certified, retention SQL must run as an explicit Owner migration or function, with its own audit record, not as an UPDATE of `supervision_incident_events`.
