# Studio Tablet v1 — Direction (Invisible Employee)

**Status:** Superseded for room naming · **2026-07-18**  
**Room rename:** Permanent Host surface is **Studio Conversation Room** — see [`studio-conversation-room-foundation-v1-locked.md`](studio-conversation-room-foundation-v1-locked.md). Route `/studio-tablet` redirects to `/studio-conversation-room`.  
**Builds on:** [`studio-tablet-architecture-plan.md`](studio-tablet-architecture-plan.md) (shell measurements, Host/projection, T1–T4 packages)  
**Related:** [`studio-presence-visual-direction-v1.md`](studio-presence-visual-direction-v1.md)

---

## The pivot

The tablet is the product. The Presence is simply the Studio employee operating it.

We are **not** creating a tablet illustration or PNG screenshots of UI.  
We are creating an interactive **Studio Tablet** React component that behaves like a real workstation.

| Wrong question | Right answer |
|----------------|--------------|
| “What’s the mascot?” | — |
| “Who’s helping me?” | A Studio employee who’s actively working on my project. |

Glasses-and-eyes Presence answered the first.  
Invisible employee + Studio Tablet answers the second.

---

## Roles

| Piece | Role |
|-------|------|
| **Studio Tablet** | The employee’s workstation — the heart of The Studio |
| **Invisible Presence** | The person using it (shirt / jeans / Converse later; purpose + motion) |
| **Floating room panels** | Customer-facing mirrors of important tablet state |

The Presence works **with** the tablet. The Presence does **not** become the tablet.

| Presence state | Tablet behavior |
|----------------|-----------------|
| Idle | Quietly reviewing / working |
| Listening | Tablet waits |
| Thinking | Tablet updates |
| Speaking | Relevant sections animate |

Customers should not need to stare at the tablet. Important information is mirrored onto Studio panels in the room.

---

## Non-negotiables

1. **React screens only** — every field interactive; no flattened screenshots; no baked text in images.  
2. **Shell is constant** — only the screen content changes.  
3. **Transparent stage** — no scene / environment baked into the tablet component.  
4. **Assets allowed for chrome only** — bezel, dock, reflections, shadows. Everything else is React.  
5. **One tablet, many rooms** — Lobby, Intake, Review, Studio Board, Help Center, etc.  
6. **Journey business rules stay locked** — adapters panelize existing logic; they do not invent new rules.  
7. **Avoid haunted clothes** — purpose and motion (looking at tablet, turning, reading) create the person; idle costume alone does not.

---

## Composition (current)

**No dedicated room plate.** Presentation is:

1. **Studio Tablet** — Host workstation (React shell + screens)
2. **Studio Glass Screen** — customer-facing modern glass panel (React)

```tsx
<StudioTablet>
  <ProjectTypeScreen />
</StudioTablet>
<StudioGlassScreen>
  {/* customer mirror only */}
</StudioGlassScreen>
```

### Shell (constant)

- Premium black bezel · rounded corners · camera notch  
- Glass reflections · thin aluminum edge  
- Optional charging dock (separate component)  
- Transparent background around the device  

### Screen system (React components)

Conceptual customer-facing topics map onto Host journey stages from the architecture plan:

| Screen topic | Host stage id (`?stage=`) |
|--------------|---------------------------|
| Project Type | `route-map` |
| Business Information | (intake / discovery panels) |
| Services | `builder` |
| Design Direction | (builder / plan panels) |
| Content | (intake content panels) |
| Review | `studio-plan` · `review-confirm` |
| Confirmation | `review-confirm` · `board-handoff` |

Physical viewport, insets, type/touch floors: **architecture plan §10** — do not redesign.

---

## Build order

| Package | Delivers |
|---------|----------|
| **T1 — Shell** | Frame, glass, dock, chrome, scale, Host/projection boundaries, empty adapters |
| **T2+** | Real journey panels via adapters |
| **Presence** | Invisible employee operating the tablet (retire face-as-identity when Presence wardrobe lands) |

AI features, scheduling, approvals, notes, and production tracking should land **on this same tablet** over time — not as new unrelated interfaces.

---

## What this is not

- Not a mascot  
- Not a cartoon face  
- Not a PNG of a tablet UI  
- Not a shrunk browser page in a decorative frame  
- Not a replacement for locked Lobby / Host artwork without Tagia approval
