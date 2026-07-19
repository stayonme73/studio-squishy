# Conversation Flow Rhythm — LOCKED

| Field | Value |
|---|---|
| Status | **LOCKED — when Voice acts (rhythm), not dialogue copy** |
| Owner | Tagia |
| Date | 2026-07-18 |
| Agent entry | `AGENTS.md` → **Conversation Flow Rhythm** |
| Config | `src/config/studio-conversation-flow-rhythm-v1.ts` |
| Related | Framework stages (`docs/studio-conversation-framework-v1-locked.md`) · Working draft (`docs/studio-working-draft-persistence-v1-locked.md`) |

**Machine rule:** This file defines the **predictable order** of the Conversation Room. Package 4 Voice Host must follow this rhythm. Chat is not authority.

---

## Purpose

We defined **what** Voice does. This lock defines **when**.

The Conversation Room has a predictable rhythm — guided, not interrogating.

---

## Locked rhythm (order)

### 1. Welcome

- Greet the customer.
- Explain that the Studio will guide them and do the work on their behalf.

### 2. Discovery

- Learn what they are trying to accomplish.
- Understand their deadline and situation.
- Determine whether The Studio is the right fit.

### 3. Route Recommendation

- Recommend the best route based on what was learned.
- Let the customer choose a different route if they prefer.

### 4. Service Building

- Recommend relevant services.
- Offer **Learn More** when appropriate.
- Add, remove, or change services as the customer decides.

### 5. Project Review

- Show everything that has been captured.
- Let the customer make changes.
- Confirm they understand what is included and excluded.

### 6. Payment

- Only after the customer confirms the project.

### 7. Production Intake

- Collect the detailed information needed to perform the work.

### 8. Studio Board

- Create the project.
- Preserve the conversation history, selected services, and service details.

---

## Purposeful question rule (locked)

> **Voice should never ask a question if the answer won't change what happens next.**

Every question must have a purpose. If an answer does not influence:

- route selection  
- service recommendations  
- pricing  
- feasibility  
- production  

…it probably does not belong in the conversation.

This keeps the experience fast while the customer still feels guided — not interrogated.

---

## Relationship to framework flow steps

Package 3 `CONVERSATION_FLOW_STEPS` remain structural engine steps. This rhythm is the **customer-facing conversation order** Voice must honor.

| Rhythm stage | Typical framework alignment (non-exclusive) |
|--------------|-----------------------------------------------|
| Welcome | `greeting` |
| Discovery | `understanding`, `deadline-check` |
| Route Recommendation | route choice within conversation / spine `conversation` |
| Service Building | `service-match`, `project-scope` |
| Project Review | `summary`, `confirmation` (+ Review temporary mode) |
| Payment | spine / step `payment` |
| Production Intake | spine / step `intake` |
| Studio Board | spine `studio-board` / `project-created` |

Do not invent extra interrogation stages. Do not skip Payment confirmation before charging. Do not collect full production intake before Payment unless Tagia explicitly revises this lock.

---

## Cross-contracts

- Pre-payment edits and Back must preserve working draft — `docs/studio-working-draft-persistence-v1-locked.md`
- Payment freezes purchased scope — same doc  
- Help / Review are modes, not rhythm stages — framework lock  
- **Phase gates** (what must be true to advance) — `docs/studio-conversation-phase-gates-v1-locked.md`

---

## Out of scope here

- Exact Voice scripts / personality  
- LLM wiring  
- Scoring / Recommendation Engine implementation  
- Full intake field lists  

Rhythm first. Dialogue and engines later (Package 4+).
