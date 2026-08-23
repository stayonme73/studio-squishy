# Claude verifier connection and certification plan (opening)

**Status:** **NOT CONNECTED.**

Existing code talks to Anthropic Messages for decision-learner and optional design reasoning. That is not Machine assignment of supervision work. `ANTHROPIC_API_KEY` is absent in this environment.

## Verifier contract (later)

Claude may verify an incident the Machine already holds. Claude must not be the sole heartbeat.

Live certification must prove:

1. Machine assigns a verification job with incident id and evidence pointers.  
2. Claude (or the Anthropic path) returns a result the Machine stores.  
3. Status is visible while waiting.  
4. Timeout becomes a Machine incident (not silence).  
5. Failure/refusal is recorded without fake “healthy.”  

Until that pass exists, say **NOT CONNECTED**. Do not fake it.
