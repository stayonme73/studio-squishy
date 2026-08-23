# Provider-independent automation contract (opening)

Automation (timers, webhooks, retries, wake-ups) must satisfy this contract **before** any vendor is called “connected.”

The Machine remains the system of record. The automation provider is a wake mechanism.

## Required capabilities

1. Fire a check at a stated time without a human.  
2. POST to a Machine endpoint with a shared secret (no secret in query strings).  
3. Retry with a bounded backoff when the Machine is unreachable.  
4. Record success/failure back into a Machine incident or check log.  
5. Distinguish “check ran and found healthy” from “check never ran.”  
6. Carry incident id, campaign id, and severity when waking an alert path.  
7. Fail closed: a dead scheduler must itself become an incident.

## Build-A-Bot

Candidate only. Connect only if a live proof shows the list above.

## Make.com

Do not add Make unless Build-A-Bot is proven insufficient **and** the Owner separately authorizes Make.
