# Build-A-Bot capability and connector plan (opening)

**Status:** Not in this repository. Not connected. Not proven. Durable Pass 3 does **not** connect Build-A-Bot.

An external scheduler cannot repair missing leases or incidents. Persistence and restart recovery come first. After Durable Pass 3 restart proof is accepted, Build-A-Bot may be evaluated as the independent scheduler against `PROVIDER-INDEPENDENT-AUTOMATION-CONTRACT.md`. Do not connect it before that evaluation.

## Work to do later (not this commit)

1. Inventory actual Build-A-Bot scheduling, webhook, retry, and alert features against `PROVIDER-INDEPENDENT-AUTOMATION-CONTRACT.md`.  
2. If it meets the contract, design a thin connector: Machine defines checks; Build-A-Bot only wakes them.  
3. If it fails the contract, record the gaps. Do not stretch the product. Do not add Make without a separate Owner decision.  
4. Never store Build-A-Bot as the incident record.

No connector code ships in opening.
