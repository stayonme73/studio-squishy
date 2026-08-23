# Controlled incident scenario plan

Opening listed these. Foundation Pass 1 proved S5–S8 with fixtures. Runtime Pass 2 proves S1, S2, S4, S9, S10 plus mismatch, waiting-for-owner, unconnected coverage, and duplicate ingest. S3 remains limited: unconnected providers are named only as NOT CONNECTED, not as a live provider-failure connector.

| Id | Scenario | Must prove | Pass |
|----|----------|------------|------|
| S1 | Agent heartbeat lost | Detection, incident, no self-certify | Runtime 2 |
| S2 | Server/service down | Detection vs finite-job quiet | Runtime 2 |
| S3 | Provider failure | Provider named only with evidence | Unconnected ports only |
| S4 | Customer project stalled | Customer/project on the record | Runtime 2 |
| S5 | Deadline at risk | `DEADLINE_CRITICAL` path | Foundation 1 |
| S6 | Financial/payment incident | `FINANCIAL_RISK` path | Foundation 1 |
| S7 | Rights/compliance hold | `RIGHTS_OR_COMPLIANCE_RISK` path | Foundation 1 |
| S8 | Suspected security breach | Immediate serious UI, no Squishy, containment | Foundation 1 |
| S9 | Recovery succeeds without Owner | Tagia is not interrupted | Runtime 2 |
| S10 | Recovery fails | Complete actionable incident to Tagia | Runtime 2 |

No real customer data. No security theater. Not certified.
