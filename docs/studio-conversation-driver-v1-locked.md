# Conversation Driver V1 — LOCKED

| Field | Value |
|---|---|
| Status | **LOCKED — single active driver** |
| Owner | Tagia |
| Date | 2026-07-18 |
| Agent entry | `AGENTS.md` → **Conversation Driver** |
| Config | `src/config/studio-conversation-driver-v1.ts` |
| Room | Studio Conversation Room |

**Machine rule:** There are not two operators on the same interface at once. Chat is not the archive.

---

## Locked principle

> **Only one participant actively drives the conversation at a time.**

The other may interrupt naturally (“Wait…”, “Go back…”, “Change that…”, “Actually…”), but both are not operating the interface simultaneously.

Fits Studio philosophy:

> **The Studio does the work unless the customer chooses to do part of it themselves.**

---

## The baton

| Default | Studio Voice has the baton |
| Customer may | Take the baton (“I’ll answer myself” / Take Control) |
| Customer may | Hand the baton back (“Resume Voice”) |

Think of a car: one active driver. Not two steering wheels at once.

---

## Mode 1 (Default): Studio Voice Driving

Customer sees (Presentation):

- Voice asking the question  
- Voice activity waveform  
- The question  
- Previous answers  
- Progress  

No answer controls all over the place. No temptation to interrupt the UI.

Tablet (Studio Workspace):

- Voice reads the next question  
- Voice captures the answer  
- Voice updates the working draft  

**The tablet is not interactive for the customer.** It is the Studio’s workspace. The customer watches the Studio work.

---

## Mode 2: Customer Driving

Customer taps **I’ll answer myself** / **Take Control**.

- The question becomes interactive on the Presentation Display  
- Customer can tap, type, choose, scroll, continue  
- Studio Tablet still updates, but **follows** the customer  

---

## Resume Voice

Customer taps **Resume Voice**.

- Voice takes control again  
- Presentation returns to non-interactive Presentation Mode  
- Studio resumes asking questions  

---

## Current Driver (customer-facing)

Prefer clear driver language — not “Voice entered / Customer answered”:

```
Current Driver
● Studio Voice
[ I'll Answer Myself ]
```

or

```
Current Driver
● Customer
[ Resume Voice ]
```

Attribution in the working draft still records who drove the material edit (`voice` vs `customer`) — derived from the active driver, not a dual toggle on the tablet.

---

## Studio Voice mode — assist controls (not answer entry)

While Studio Voice drives, answer choices stay inactive. Customer may still:

| Control | Role |
|---------|------|
| Pause | Pause Studio speech (live Voice later) |
| Repeat | Repeat the question (live Voice later) |
| Slow down | Slow Studio speech (live Voice later) |
| Go back | Return to prior question |
| Answer Myself / Take over | Customer takes the baton |
| Ask a question | Interrupt with a question (live Voice later) |

Wired now: **Go back**, **Answer Myself**. Others are honest scaffolds until Voice Host.

---

## Certification order (do not skip)

1. Visually review Presence demo routes (`?presence=…`)  
2. Fix visibility / layout  
3. Confirm Studio Voice / Customer driver scaffold  
4. Connect one Discovery question end to end  
5. Test speaking, takeover, correction, Back, refresh, resume  
6. Only then certify the first migrated page — **not before**  

---

## Related

- Presence System — *how* the room feels awake (`certificationScope: scaffold` until live mic/speech)  
- Working draft — *what* is saved  
- Discovery Migration — *which* questions  
