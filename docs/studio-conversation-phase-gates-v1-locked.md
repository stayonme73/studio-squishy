# Conversation Phase Gates — LOCKED

| Field | Value |
|---|---|
| Status | **LOCKED — advancement rules between rhythm stages** |
| Owner | Tagia |
| Date | 2026-07-18 |
| Agent entry | `AGENTS.md` → **Conversation Phase Gates** |
| Config | `src/config/studio-conversation-phase-gates-v1.ts` |
| Types | `src/lib/studio-conversation-phase-gates/types.ts` |
| Rhythm | `docs/studio-conversation-flow-rhythm-v1-locked.md` |
| Working draft | `docs/studio-working-draft-persistence-v1-locked.md` |

**Machine rule:** The rhythm defines the hallway order. This file defines **which doors are unlocked**. Chat is not authority.

---

## Important lock

> **Voice may move backward freely before payment, but it may not skip a required gate merely to make the conversation feel faster.**

Speed comes from avoiding pointless questions (purposeful question rule), not from skipping necessary understanding.

---

## Core gates

### Welcome → Discovery

Advance when:

- the customer is ready to begin  
- input mode is available  
- the working draft is created or restored  

### Discovery → Route Recommendation

Advance only when Voice knows enough to determine:

- the customer’s goal  
- whether the need is new, existing, promotional, urgent, or already specified  
- the requested date or deadline  
- whether The Studio appears to offer relevant work  
- whether more clarification is required  

Voice does **not** need every production detail yet.

### Route Recommendation → Service Building

Advance when:

- Voice has recommended a route  
- the customer has accepted it or deliberately chosen another  
- the selected route is not obviously incompatible with the stated need  

### Service Building → Project Review

Advance when:

- relevant services have been added, declined, or deferred  
- required service questions are answered  
- important inclusions and exclusions have been surfaced  
- pricing can be determined  
- deadline feasibility has been checked where required  
- no unconfirmed Voice recommendation is treated as selected  

### Project Review → Payment

Advance only when the customer confirms:

- selected services  
- removed or declined services  
- scope  
- price  
- deadline information  
- important exclusions  
- required materials or responsibilities  

This is the **last fully editable checkpoint**.

### Payment → Production Intake

Advance when:

- payment succeeds  
- the accepted working draft is frozen as the purchased snapshot  
- attribution and consent records are preserved  

### Production Intake → Studio Board

Advance when:

- required production information is complete  
- missing items are explicitly marked  
- the project record is created  
- the accepted service information is available on the Studio Board  

---

## When information is missing

Voice may:

- **clarify** — ask the purposeful missing piece  
- **stop** — do not advance the gate  
- **escalate** — when fit, feasibility, or policy requires human / Studio judgment  

Voice must **not** invent answers to unlock a gate.

Blocked reasons are machine-stable codes for Presentation Display / Voice (see config).

---

## Backward movement

Before payment: Voice may move backward freely. Working draft state is preserved (`docs/studio-working-draft-persistence-v1-locked.md`).

After payment: purchased scope is frozen; backward into editable Service Building / Project Review must not silently unfreeze the purchase. Post-payment change process is separate.

---

## Next package

**Discovery Decision Contract** — exactly what Voice needs to learn in Discovery, without dialogue scripts yet.

---

## Out of scope here

- Dialogue / Voice personality  
- LLM wiring  
- Full Recommendation Engine scoring  
- Payment processor integration  
