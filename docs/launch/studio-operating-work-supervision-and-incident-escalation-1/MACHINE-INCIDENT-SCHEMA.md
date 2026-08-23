# Machine incident schema (opening)

The Machine is the system of record. This schema is the contract. Durable Pass 3 persists the derived incident and append-only event history in `data/supervision/` (`studio-data-json`). It does not change the field contract.

Every incident must include:

| Field | Meaning |
|-------|---------|
| `incidentId` | Stable Machine id |
| `customerId` / `customerLabel` | Affected customer |
| `projectId` / `campaignId` | Affected project |
| `severity` | See severity matrix |
| `category` | Agent, process, provider, customer-work, deadline, money, rights, security, other |
| `responsibleComponent` | Agent, tool, provider, or workflow |
| `failedOrStalledStep` | Exact step |
| `startedAt` | When it started |
| `lastHealthyAt` | Last known healthy time |
| `lastHeartbeatAt` | Last heartbeat |
| `customerImpact` | What the customer feels |
| `deadlineImpact` | Deadline effect |
| `financialImpact` | Money effect |
| `rightsOrComplianceImpact` | Rights/compliance effect |
| `securityOrBreachImpact` | Suspected or confirmed security effect |
| `containmentPerformed` | What was contained |
| `recoveryAttempts` | Attempts and results |
| `currentResponsibleParty` | Who owns it now |
| `whoMustBeContacted` | Who to contact |
| `ownerDecisionRequired` | Exact Owner action, or none |
| `nextAutomaticAction` | What the Machine does next |
| `nextCheckAt` | Next check time |
| `evidence` | Pointers and facts |
| `history` | Append-only events |
| `state` | `OPEN` / `RECOVERING` / `WAITING` / `ESCALATED` / `RESOLVED` |

Rules:

- History is append-only.  
- An agent must not certify its own supervision.  
- Routine recovery must not page Tagia.  
- Security suspected/confirmed must not use Squishy or playful layout.
