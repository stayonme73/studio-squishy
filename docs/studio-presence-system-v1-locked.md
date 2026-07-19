# Studio Presence System V1 — LOCKED

| Field | Value |
|---|---|
| Status | **LOCKED — presence architecture** |
| Owner | Tagia |
| Date | 2026-07-18 |
| Agent entry | `AGENTS.md` → **Studio Presence System** |
| Config | `src/config/studio-presence-system-v1.ts` |
| Room | Studio Conversation Room |

**Machine rule:** The Communication Light does not carry the whole burden of Studio state. Presence is a coordinated system. Chat is not the archive.

---

## Locked principles

> **The customer should never have to wonder whether the Studio is listening, speaking, thinking, or waiting. The system should communicate its state continuously through multiple coordinated cues, not a single indicator.**

> **Presence should communicate real work whenever possible. Decorative delays should never replace genuine system state.**

If filing an answer takes 200 ms, show busy for ~200 ms. If analysis later takes 2 seconds, stay busy for those 2 seconds. Do not invent a “thinking pause” to make the UI feel dramatic.

> **The halo is the conversational baton.** Whose turn it is should be felt in peripheral vision — not read as “Studio Voice” / “Customer” mode labels.

| Floor | Room lighting |
|-------|----------------|
| Studio speaking / working | Soft gold halo on **Studio Workspace**; subtle matching edge on Presentation; orb bright; waveform Studio |
| Customer's turn | Workspace dims; **Presentation** takes the halo; answer area is the brightest element |
| Captured | Presentation briefly pulses; then halo returns to Workspace while the Studio files the answer |
| Next question | Halo stays on Studio until Voice finishes asking |

```
Studio asks → 🟡 Workspace
Voice finishes → 🟢 Presentation
Customer answers → Presentation stays active
Captured → pulse → 🟡 Workspace processes
Next question → repeat
```

---

## Communication hierarchy

```
Presentation Display
────────────────────────
Conversation
Captured information
────────────────────────
Voice Activity Bar
────────────────────────
Communication Glow
```

| Layer | Communicates |
|-------|----------------|
| Conversation (Presentation) | What we are discussing |
| Captured information | What the Studio heard / recorded |
| Voice Activity Bar | Who is speaking right now; that audio is working |
| Communication Glow | Ambient Studio awake / overall state |

---

## 1. Communication Light → environmental glow

Keep the light, but make it **environmental** — not a tiny LED carrying all meaning.

When **Voice / Studio is speaking**:

- the light brightens  
- the bottom edge of the Presentation Display glows  
- the Studio Workspace gets a subtle reflected light  

When **the customer is speaking**:

- the glow shifts toward the customer side  
- the customer’s screen subtly illuminates  

It should feel like the Studio is **awake**.

States still map to the foundation light vocabulary: `idle` · `listening` · `speaking` · `thinking` · `unavailable`.  
The orb remains **without** printed captions; turn-taking words live on the Activity Bar.

---

## 2. Voice Activity Bar (required)

Under the Presentation Display, reserve a narrow strip.

Not decorative. It tells the customer:

- Voice is talking  
- The microphone is hearing them  
- The Studio is listening  
- Audio is actually working  

People instinctively understand moving audio bars.

---

## 3. Studio vs customer behavior

The waveform communicates **who** is active.

| Who | Behavior | Label |
|-----|----------|-------|
| Studio speaking | Left-to-right animation · Studio accent color | `Studio speaking...` |
| Customer speaking | Live microphone reaction | `Listening...` |

Answers: *Is it my turn, or is the Studio talking?*

---

## 4. Listening confidence

When the customer finishes, do **not** immediately jump ahead.

Show capture confirmation, for example:

```
Listening...

"I need a flyer for my grand opening."

✓ Captured
```

Then Voice confirms before continuing if necessary.  
Builds confidence that the Studio heard them correctly.

---

## Certification scope

**Scaffold certification** (current): state model, Activity Bar modes, glow hierarchy, demo routes, captured transcript UI.

**Not yet live Voice certification:** real microphone, live customer waveform, real Studio speech activity, interruption handling, full driver↔Presence production path.

Do **not** mark Discovery migration complete on scaffold Presence alone.

---

## Roles vs Discovery Migration

Presence is **how** the room feels alive.  
Discovery Migration is **what** answers are collected.  
Conversation Driver is **who** operates the question flow.  
Do not collapse them — Presentation still owns conversation content; Presence owns continuous state cues; Driver owns the baton.
