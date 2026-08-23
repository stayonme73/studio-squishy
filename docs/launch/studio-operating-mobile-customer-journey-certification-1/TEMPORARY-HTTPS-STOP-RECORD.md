# Temporary mobile HTTPS server — stop record

Recorded 2026-08-23 before the mobile package park. No customer data was changed.

## Identity (while running)

| Field | Value |
|-------|--------|
| Worktree | `C:\Users\tagia\studio-squishy-external-content-rights-1` |
| Branch | `operating/mobile-customer-journey-certification-1` |
| Readiness tip | `b35c8aa2c2fdc7b1f1f5161d38479fdded0e5361` |
| Command | `npm run dev:https` with existing cert files (self-signed) |
| Protocol | HTTPS |
| Bind | `0.0.0.0:3000` |
| Node listener PID | `7680` |
| Parent PID | `18408` |
| LAN health | `https://10.1.10.208:3000/?studioPaymentSandbox=1` → HTTP 200 |
| Loopback health | `https://127.0.0.1:3000/?studioPaymentSandbox=1` → HTTP 200 |

## Stop

Stopped listener `7680` and parent `18408`. After stop: **port 3000 free**.

This server was a local phone-access fixture only. It is not production. It is not a live customer system.
