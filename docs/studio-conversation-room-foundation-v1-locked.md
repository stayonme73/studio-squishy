# Studio Conversation Room — Foundation V1 (LOCKED)

| Field | Value |
|---|---|
| Room | Studio Conversation Room |
| Status | **FOUNDATION LOCKED — physical workspace only** |
| Owner | Tagia |
| Date | 2026-07-18 |
| Route | `/studio-conversation-room` |
| Former name | Studio Tablet (Host dual-surface cert) |

**This package establishes the permanent physical room and reusable hardware.**  
No intake logic. No project logic. No AI workflow. No business functionality.

Lock the architecture before building behavior.

**Machine entry:** Agents load this via `AGENTS.md` → **Conversation Room — machine contract** (`CLAUDE.md` → `@AGENTS.md`). Framework rules live in `docs/studio-conversation-framework-v1-locked.md`. Chat is not the archive.

---

## Why “Conversation Room” (not “Tablet”)

Hardware may change. The conversation will not.  
Architecture stays centered on the experience, not a device name.

Legacy Host route `/studio-tablet` redirects here. The portrait workstation component may still be reused as **Studio Workspace** hardware elsewhere (for example Route Map intake shell).

---

## Components (locked roles)

### 1. Studio Workspace (private)

- The Studio’s private workstation
- Premium industrial design · portrait · responsive · transparent display
- Empty runtime shell — no baked interface
- Hardware separated from content
- Reusable React component
- **The customer never directly uses this device**

### 2. Presentation Display (customer)

- The customer’s communication display
- Large premium glass · landscape · responsive · transparent display
- Empty runtime shell — no baked interface
- Hardware separated from content
- Reusable React component
- Presents **only** information intentionally shared with the customer

### 3. Studio Presence System (Communication Glow + Activity Bar)

Authority: `docs/studio-presence-system-v1-locked.md`

The light does **not** carry the whole burden of Studio state. Presence is coordinated:

- **Communication Light / Glow** — ambient environmental presence (brightens hardware, Presentation bottom edge, Workspace reflection). States: `idle` · `listening` · `speaking` · `thinking` · `unavailable`. **No** printed captions on the orb.
- **Voice Activity Bar** — precise turn-taking under the Presentation Display (Studio speaking / Listening / Captured). Runtime labels allowed here.
- **Presentation content** — conversation + captured information.

---

## Layout (locked)

```
+----------------+     +------------------------------------+
|                |     |     Presentation Display           |
|  Studio        |     |     Conversation / Captured        |
|  Workspace     |     +------------------------------------+
|                |     |     Voice Activity Bar             |
+----------------+     +------------------------------------+
                       |     Communication Glow             |
                       +------------------------------------+
```

Mobile: Presentation column (display + Presence rail). Private Workspace stays off-stage unless `?inspect=1`.

---

## Locked principles

### The hardware is timeless. The software communicates.

The Workspace and Presentation Display remain almost completely free of permanent labels, status text, or UI. Everything meaningful appears on the screen at runtime.

### Workspace Separation

The Studio Workspace performs work.  
The Presentation Display communicates with the customer.  
They are independent systems.

### No Baked Interfaces

No UI may be permanently painted into hardware.  
Everything displayed must be rendered at runtime.

### Conversation First

Customers complete conversations. They do not operate software.  
The Presentation Display supports the conversation. It never becomes a dashboard.

### Minimalism

The room should feel calm. Only essential hardware is visible.  
Avoid unnecessary buttons, icons, floating panels, or decorative technology.

---

## Out of scope (this package)

Do **not** build here:

- AI conversation
- Intake forms
- Floating cards
- Voice logic
- Project Board
- Customer workflow
- Animations beyond basic idle states on the Communication Light

---

## Implementation map

| Piece | Path |
|-------|------|
| Config | `src/config/studio-conversation-room-v1.ts` |
| Room | `src/components/studio-conversation-room/` |
| Cert page | `src/app/studio-conversation-room/page.tsx` |
| Legacy redirect | `/studio-tablet` → `/studio-conversation-room` |

---

## Hardware certification notes (2026-07-18)

- Gap between Workspace and Presentation: tightened ~12% so they read as one workstation
- Communication Light: ~20% larger, slightly brighter, still subtle — room signature
- No printed light captions on hardware

## Certification

- Desktop: Workspace left, Presentation right, Light centered under Presentation (no label)
- Mobile: readable stack; aspect ratios preserved
- Empty shells — no baked content or hardware labels
- Light state attribute visible for future wiring (`data-state`); `aria-label` for accessibility only
- No commit/push until Tagia certifies
