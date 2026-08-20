# QA findings — Scenario 1

Machine checks from `scripts/execute-room-4c-scenario-1.mts` (runId `33ffa4b6-d3eb-47b5-9649-dfa1a13d51ed`):

| Check | Result |
|-------|--------|
| Copy quality (facts, CTA, no prohibited claims) | PASS |
| Campaign creative automated QA | PASS |
| Overflow / clip gate | PASS |
| Social 1080×1080 PNG | PASS |
| Social PNG opens | PASS |
| Handout PNG opens | PASS |
| Handout PDF opens (`%PDF`) | PASS |
| Caption has offer, dates, phone, URL | PASS |
| Video duration in band | PASS (26.4s) |
| Video 1080×1920 | PASS (declared) |
| Files open | PASS |

Owner visual / listening / print review is **not** machine-certified. See DEFECTS.md for contrast and phone-size notes.

**Copy attestation (Scout, not Tagia):** Brand voice is calm/practical; grammar/spelling reviewed against the canonical brief; no invented price or unsupported claims in caption.
