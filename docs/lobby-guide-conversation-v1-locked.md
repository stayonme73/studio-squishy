# Lobby Guide conversation — locked behavior

**Status:** LOCKED 2026-07-17 (Tagia)  
**Room:** Studio Lobby  
**Config:** `src/config/studio-guide-conversation-v1.ts`

## Product intent

The Studio Guide is a **guided conversation**, not a disguised form.

The customer should feel they are answering the Guide one question at a time, using whichever input feels fastest in the moment — typing or speaking — without mode switching, ceremony, or a split experience.

## Required finished experience

1. The Guide asks **one natural question at a time**.
2. The customer can **type** the answer **or speak** it (microphone).
3. Spoken answers are **transcribed into the same visible answer field** as typed answers.
4. The customer can **review and correct** the transcription before continuing.
5. The Guide proceeds to the next question **without changing modes**.
6. At the end, the Guide **summarizes** what was captured — visually, and when voice is enabled, **reads the summary aloud**.
7. The customer can confirm by **voice or touch**, or request a correction (including editing one answer).
8. The system must **never silently assume** a transcription is accurate.

### Summary shape (customer-facing)

> Here’s what I heard. You’re starting a new business called ___, you’d like it by ___, and you already have ___. Is that right?

Then the customer may:

- say “Yes” / tap Confirm  
- say “Change the deadline” / tap Correct  
- or edit one answer  

## Voice is required for the finished Lobby experience

Voice input, spoken Guide output, and transcription confirmation are **required** for the complete Lobby conversation — not an optional enhancement.

## Current text-only slice (temporary)

The Phase 1A text-only flow is a **temporary technical skeleton**. It exists to prove:

- question order  
- persistence  
- confirmation  
- reset  

It must **not** be treated as page completion or as the finished client experience.

## Layer Completion Doctrine

A room is complete only when the approved customer experience for that room is **implemented, certified on supported devices, committed, pushed, and explicitly locked by the owner**.

Passing a technical slice, architecture review, desktop check, or mobile check alone does **not** complete a room. Only the entire approved experience closes the room.

**Layer workflow:** Lock vision → Design architecture → Approve architecture → Inspect implementation package → Approve implementation package → Build certifiable slice → Desktop → Samsung → Fix → Re-certify → Lock layer → Next layer.

Voice design artifacts: `docs/lobby-guide-voice-architecture-v1.md` (**APPROVED**) · `docs/lobby-guide-voice-package-1-implementation-plan-v1.md` (**APPROVED**). Package 1 = dictation into the same field behind `NEXT_PUBLIC_STUDIO_GUIDE_VOICE=1` (default off). No TTS / Lobby-complete claim until later packages.

## Build order (locked)

1. **Phone bug is the current gate** — Guide opens, Continue advances, Close works, persists reliably on real Samsung (and desktop checks as needed).  
2. **Do not add voice inside the Samsung / mobile launch bug-fix package.**  
3. **When Continue reliably advances on Samsung**, certify **only**:
   - **Mobile launch and navigation stability: PASS**
4. **Immediately begin the Lobby voice package** on the **same Lobby page** — voice is the next layer of this room, not a trip to the Parking Lot.

### Certification wording (mandatory)

Once Continue reliably advances on the Samsung, mark the **mobile stability package** certified.

Do **not**:

- declare the Lobby complete  
- move to another page  
- commit the Lobby as finished  

Begin the **Lobby voice package** next.

The Lobby page stays open until the **complete approved Lobby experience** works on both web and phone:

- type or speak into the same conversation  
- reliable speech transcription  
- visible review before acceptance  
- one-question-at-a-time progression  
- spoken and written summary  
- confirm or correct by touch, text, or voice  
- natural corrections without restarting  
- responsive keyboard and microphone behavior  
- accurate persistence and reset  
- full desktop and Samsung certification  

## Out of scope until voice package (after mobile stability PASS)

- Microphone control  
- Speech-to-text wiring  
- Spoken Guide output / TTS  
- “Select input mode” UI  
- Dual parallel type-vs-voice flows  

When voice ships, typing and speaking remain **one conversation** — same field, same continue path, same summary.
