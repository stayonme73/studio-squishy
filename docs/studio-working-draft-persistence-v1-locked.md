# Pre-Payment Project Persistence and Editing Contract — LOCKED

| Field | Value |
|---|---|
| Status | **LOCKED — hard engineering requirement** |
| Owner | Tagia |
| Date | 2026-07-18 |
| Agent entry | `AGENTS.md` → **Pre-Payment Working Draft** block |
| Config | `src/config/studio-working-draft-v1.ts` |
| Origin | Shelly failure mode — Back erased completed customer work |

**Machine rule:** This file is authority. Chat summaries are not. Scout/Voice must implement against this contract.

---

## Core requirement

> **Before payment, the customer can move backward, leave a panel, return to the Lobby, review details, and change the project without losing previously captured information.**

The project remains **editable until payment**.

Navigation must **never** erase valid customer work.

Customers may:

- add / remove / replace a service  
- change an answer  
- change the route  
- change a deadline  
- reopen Learn More  
- return to previous questions  
- go back to the Lobby  
- return to the Conversation Room  

Unrelated information must remain intact.

---

## Payment is the commitment boundary

| When | Status | Editability |
|------|--------|-------------|
| Before payment | `working_draft` | `editable: true` |
| After confirmed payment | `purchased` | `editable_scope: false` |

**Before payment:** The project is a working draft.

**After payment:** The purchased scope becomes the confirmed project record. Post-payment changes must **not** quietly rewrite what was purchased. They follow approved revision / scope-change / change-order process (future policy) — separate records, not silent mutation of the original transaction.

At final review before payment, Voice must present the complete project summary and ask for confirmation.

---

## State that must persist (minimum)

- discovery answers  
- route recommendation  
- customer-selected route  
- selected services  
- declined services  
- reopened services  
- service-detail snapshots  
- customer questions  
- Voice answers  
- deadline information  
- customer-provided materials status  
- pricing selections  
- project summary  
- confirmation status  
- action-attribution history  
- current conversation location  

---

## Navigation that must preserve state

State must survive:

- Back  
- browser Back  
- in-app Back  
- Return to Lobby  
- return from Lobby  
- opening and closing Help Center  
- opening and closing Learn More  
- moving between route choices  
- moving between services  
- refreshing the page  
- temporary connection interruption  
- reopening the active session where technically supported  

**No automatic reset when navigating backward.**

---

## Editing rules before payment

Edits must not erase unrelated project information.

Example: Removing Business Card must **not** erase campaign graphic selection, deadline, discovery answers, route choice, or previously answered questions.

Customers may also:

- reconsider declined services  
- reopen prior steps  
- ask Voice to make a change  
- make a direct click or tap change  

---

## Change history (attribution)

Every material edit must create a new audit event. Do **not** silently overwrite the prior record.

Examples:

- Customer added Business Card  
- Customer removed Business Card  
- Voice changed requested deadline at customer instruction  
- Customer switched from Promote Something Now to Update What I Already Have  

Current project state = what is active now.  
Activity history = how it changed.

---

## Save behavior

Do **not** rely on one fragile component’s local React state.

Required:

1. A durable working-project state  
2. Automatic saving after meaningful changes  
3. State restoration when returning to the Conversation Room  
4. Protection against stale state overwriting newer changes  
5. A clear **Reset Project** action that requires deliberate customer confirmation  

---

## Relationship to existing stores (inspection note)

Today persistence is **fragmented** (Campaign Record, discovery answers key, Guide capture draft, Conversation Room `studioConversationSession` phase/step only).  

This contract requires a **unified durable working-draft** for pre-payment work. Conversation Room lobby-session (`journeyPhase` + `flowStep`) is **not** sufficient for project answers/services. Do not overload it for commerce. Implementation may consolidate into or sit beside Campaign Record — but the product contract above is mandatory either way.

---

## Required tests (definition of proof)

Not complete from one happy-path click-through. Complete when Scout proves the customer can move backward, leave, reconsider, change selections, and return without starting over:

1. Complete several answers, press Back — answers remain  
2. Add two services, remove one — the other remains  
3. Return to Lobby and re-enter Conversation Room — progress remains  
4. Open/close Help — no loss  
5. Open Learn More, scroll, close — same service position  
6. Refresh — working project restores  
7. Change route — reusable discovery answers not erased  
8. Voice edits one answer — unrelated fields preserved  
9. Each change produces correct attribution record  
10. Payment freezes accepted purchase snapshot (`purchased`)  
11. Post-payment edits cannot silently modify original purchase  
12. Reset Project requires explicit confirmation  

---

## Experience intent (verbatim)

> **Nothing is final before payment, but nothing is accidentally lost either.**
