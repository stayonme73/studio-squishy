# External agent registration and heartbeat contract

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**Pass:** Runtime Pass 2  
**Status:** Contract implemented. Providers below are **not** connected because this contract exists.

The Machine owns registration, heartbeat truth, and health. Scout, Claude, Cody, Build-A-Bot, and production workers may use this contract later. Registration is not a connection claim.

## Authentication

- Header: `x-studio-operating-secret`
- Secret: `STUDIO_OPERATING_SWEEP_SECRET` when configured
- Local development only, if the env secret is absent: `studio-supervision-dev-proof-only`
- Production with no env secret: fail closed (`503`)
- Never put the secret in query strings
- Responses never echo the secret

This follows the existing operating sweep header used by lifecycle watchdog and paid-activation recovery.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/operating/supervision/register` | Machine creates a finite-work or long-running-service lease |
| `POST` | `/api/operating/supervision/heartbeat` | Worker reports evidence. Machine computes health |
| `POST` | `/api/operating/supervision/sweep` | Machine evaluates leases, recovery, and overdue checks |

Idempotency: `Idempotency-Key` header or `idempotencyKey` in the heartbeat body.

## Worker may report

`working` · `service_awake` · `waiting_for_owner` · `blocked` · `complete`

Plus evidence, branch, commit, customer/project ids, and an exact blocker.

## Worker may not

- Send `health`, `healthy`, `selfCertified`, `certifiedHealth`, or `certifiedStatus`
- Declare the lease `ACTIVE`, `HEALTHY`, or `COMPLETE`
- Certify Claude, Build-A-Bot, Make, or Resend as connected
- Write another customer or project's lease

The Machine computes `ACTIVE`, `SERVICE_AWAKE`, `WAITING`, `BLOCKED`, `STALLED`, `COMPLETE`, and `COVERAGE_NOT_CONNECTED`.

## Isolation

If `customerId` or `projectId` is present on a heartbeat and does not match the lease, the Machine rejects the write (`403`) and does not mutate the other customer's record.

## Unconnected providers

Registering `claude`, `build_a_bot`, `make`, or `resend` forces `coverageConnected: false` and health `COVERAGE_NOT_CONNECTED`. That is not a live connector.
