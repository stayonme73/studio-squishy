# Supervision and heartbeat contract (opening)

## Owner of truth

The **Machine** owns heartbeat and status truth. Scout does not. Claude does not. Build-A-Bot does not.

## Detect at least

- Silent agents  
- Dead processes / services  
- Failed providers  
- Missed deadlines  
- Stalled customer work  
- Missing handoffs  

## Distinctions required

- **Finite active work** (a job with an expected end) vs **awake long-running service** (HTTPS, watchdogs). A quiet finite job is not automatically a dead service. A missing heartbeat on a service that should stay up **is** an incident.

## Independence

- No agent may certify its own supervision.  
- Claude may later verify incidents; Claude must not be the only heartbeat.  
- Build-A-Bot may later fire checks; results become Machine records, not Build-A-Bot records.

## Recovery

- Routine: Machine recovers; Tagia is not interrupted.  
- Escalate only after recovery fails or Owner judgment is required.

This contract is not implemented in the opening commit.
