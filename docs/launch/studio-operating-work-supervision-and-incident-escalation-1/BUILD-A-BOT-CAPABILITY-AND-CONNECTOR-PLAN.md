# Build-A-Bot capability and connector plan (opening)

**Status:** Not in this repository. Not connected. Not proven. Pass 3C does **not** connect Build-A-Bot.

An external scheduler cannot repair a store that forgets incidents after deploy. Local JSON restart proof is not launch-runtime durability. The live REST/RPC connector is ready in code, and live two-process proof has passed, but the package is **not closed**. Wake runtime is implemented and deployed. **C13 WAITING ON NETLIFY SUPPORT.** Authenticated wake **NOT RUN**. Do not evaluate or connect Build-A-Bot as a scheduler until C1–C20 pass (`MACHINE-ONLY-WAKE-RUNTIME-IMPLEMENTATION-CONTRACT.md`).

## Work to do later (not this commit)

1. Inventory actual Build-A-Bot scheduling, webhook, retry, and alert features against `PROVIDER-INDEPENDENT-AUTOMATION-CONTRACT.md`.  
2. If it meets the contract, design a thin connector: Machine defines checks; Build-A-Bot only wakes them.  
3. If it fails the contract, record the gaps. Do not stretch the product. Do not add Make without a separate Owner decision.  
4. Never store Build-A-Bot as the incident record.

No connector code ships in opening.
