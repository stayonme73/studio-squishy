# Conversation Room — Studio Guide sequence

| Field | Value |
|---|---|
| Status | **Active — Studio Guide on one tablet** |
| Route | `/studio-conversation-room` |
| Config | `src/config/conversation-room-guide-v1.ts` + `studio-guide-conversation-v1.ts` |
| Persistence | `studio-guide:capture-draft:v1` (proven Guide draft) |

## Sequence

1. Hi, welcome to The Studio. What are you working on today?
2. What is the name of your business? You can skip this for now.
3. Do you have a requested deadline? You can skip this for now.
4. Do you already have any files or materials we should know about? You can skip this for now.
5. Here’s what I understood. Is this correct?
6. Saved for now

## Interaction

Every ask screen: **bubbles · Continue** (Skip on optional).  

**Locked — permanent communication dock:** Mic + type stay on the tablet on **every** screen (questions, review, saved). The customer may always ask or speak — not only answer Studio questions. Do not remove this dock.

Deadline honesty: relative bubbles and dates are **requested timing** — Studio availability still must be confirmed.
