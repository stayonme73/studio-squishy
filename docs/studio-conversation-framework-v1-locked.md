# Studio Conversation Room — Framework V1 (LOCKED)

| Field | Value |
|---|---|
| Package | **3 — Conversation Room Framework** |
| Status | **FRAMEWORK — pending Tagia visual certification + commit** |
| Owner | Tagia |
| Date | 2026-07-18 |
| Depends on | Package 2 hardware (`docs/studio-conversation-room-foundation-v1-locked.md`) |
| Next | Package 4 — Conversation Engine / Voice Host (not until Tagia authorizes) |
| Agent entry | `AGENTS.md` → **Conversation Room — machine contract** (always loaded via `CLAUDE.md` → `@AGENTS.md`) |

**Goal:** Make the Conversation Room capable of hosting every future conversation.

**Machine rule:** This file + `AGENTS.md` Conversation Room block are the source of truth for Scout/Voice/agents. Do not treat chat summaries as authority.

**Not in this package:** AI, Claude, GPT, intake forms, payment processing, business rules, recommendation scoring.

---

## Customer spine (protected)

```
Lobby → Conversation Room → Payment → Intake → Studio Board
```

Think in **states**, not pages. No wizard maze. No room-hopping for the conversation itself. Navigation phases change inside the Conversation Room without redesigning the customer experience each time.

Everything else supports this spine — it does not compete with it.

---

## Roadmap (reference)

| Package | Focus | Status |
|---------|--------|--------|
| 1 | Lobby / foundation direction | ✅ |
| 2 | Hardware (Workspace, Presentation, Light) | ✅ |
| **3** | **Conversation Framework** | **This package** |
| 4 | Conversation Engine | Later |
| 5 | Payment Integration | Later |
| 6 | Intake Runtime | Later |
| 7 | Studio Board Handoff | Later |

---

## Runtime architecture

```
Conversation Room
├── Studio Workspace          (hardware — Package 2)
├── Presentation Display      (hardware — Package 2)
├── Communication Light       (hardware — Package 2)
├── Conversation Controller   (exists; stub output "Hello.")
├── Presentation Manager      (controls Presentation Display content)
├── Help Center Panel         (shell; closed by default)
├── Voice Controller          (maps to Communication Light only)
├── State Manager             (journey + flow state)
└── Navigation Controller     (Conversation → Payment → Intake → Board)
```

None of the controllers require business logic yet. Their job is to **exist** with clear boundaries.

---

## Controllers (roles)

### Conversation Controller

Later: Claude / GPT / voice / typing / memory.  
**Now:** Stub that can emit `Hello.` — proves the channel exists.

### Presentation Manager

Controls what appears on the Presentation Display.  
Today: empty or stub message. Tomorrow: question cards, pricing, summaries, confirmation, help, timeline — **everything** customer-facing.

### Navigation Controller

Manages journey phases without changing rooms:

Conversation → Payment → Intake → Studio Board

Also exposes **`return-to-lobby`** / `navigateReturnToLobby` — external Lobby exit (not an internal phase).

### State Manager

Tracks journey and conversation-flow state, including:

`conversation` · `payment` · `intake` · `studio-board` · `completed` · `cancelled`

Plus independent temporary modes (not journey phases):

- `helpOpen` — Help Center overlay
- `review` — `{ open, targetId, targetKind }` temporary review context

Actions include: `set-journey` · `set-flow-step` · `open-help` · `close-help` · `open-review` · `close-review` · `request-back` · `return-to-lobby` · `mark-completed` · `mark-cancelled`

### Lobby round-trip contract

Lobby is an **external room**, never a Conversation Room journey phase.

- `return-to-lobby` preserves the active journey phase and flow step (does **not** mark cancelled or completed).
- Snapshot persisted in browser `sessionStorage` (`studioConversationSession`) — no account/backend.
- Returning to Conversation Room boots via `bootConversationRoomState` / `restoreSessionFromLobby` and restores prior phase + step.
- Destination route: `/studio-lobby`.

**Related hard requirement:** Pre-payment **project** answers/services must also survive Lobby / Back / refresh — see `docs/studio-working-draft-persistence-v1-locked.md`. The Conversation Room session snapshot alone is **not** the working draft.

### Voice Controller

Later: microphone, speech, voice output.  
**Now:** Connects intent to the Communication Light only (`idle` / `listening` / `speaking` / `thinking` / `unavailable`).

### Help Center Panel

**Overlay / support surface only** — not a journey phase. Controlled solely through `helpOpen`, `open-help`, and `close-help`. Opening Help preserves the active journey phase and flow step; closing reveals the same phase and step. Closed by default in the framework cert.

### Review mode

**Temporary mode / presentation state — not a journey phase.** Review can occur inside Conversation, Payment, or Intake (answers, price/terms, intake details). Controlled through `review`, `open-review`, and `close-review`.

Preserves:

- current journey phase
- current flow step
- item / answer / section being reviewed (`targetId`, `targetKind`)
- exact phase + step when review closes

Future Package 4 may open review by voice or click/tap. Package 3 establishes the state contract only — no review UI, forms, or editing.

---

## Conversation flow steps (structure only)

Inside the Conversation journey phase, the continuous conversation may move through:

```
Greeting → Understanding → Service Match → Deadline Check →
Project Scope → Summary → Confirmation → Payment → Intake → Project Created
```

No page reloads. No wizard. One continuous conversation.  
**Package 3 defines the step list and state machine shape — not the dialogue.**

**Customer-facing rhythm (when Voice acts):** See `docs/studio-conversation-flow-rhythm-v1-locked.md` — Welcome → Discovery → Route Recommendation → Service Building → Project Review → Payment → Production Intake → Studio Board. Purposeful question rule applies.

---

## Locked principles

1. **States, not pages** — the Conversation Room hosts phases; it does not spawn a new page per step.
2. **The hardware is timeless. The software communicates.** — from Package 2.
3. **Controllers have jobs, not brains** — no AI or catalog rules until Package 4+.
4. **Presentation Manager is the customer surface gate** — nothing customer-facing bypasses it.
5. **Protect the spine** — Lobby → Conversation → Payment → Intake → Studio Board.
6. **Lobby is external** — exit/return via session contract; never an internal journey phase.
7. **Help is overlay** — never a journey phase.
8. **Review is a temporary mode** — never a journey phase; preserves underlying phase/step + review target context.
9. **Customer mobile is Presentation-first** — private Studio Workspace must not dominate the phone.

---

## Customer mobile layout (Package 3)

| Surface | Customer mobile | Desktop | Hardware inspect (`?inspect=1`) |
|---------|-----------------|---------|----------------------------------|
| Presentation Display | **Primary** | Primary (right) | Visible |
| Communication Light | Beneath Presentation | Beneath Presentation | Visible |
| Studio Workspace | **Hidden** (private) | Visible (left) | Visible (inspection stack) |

Rules:

- No horizontal scrolling, clipping, or unreadably small hardware on customer mobile.
- Voice, typing, Help, Lobby return, and answer review remain reachable through the Presentation/framework surface — not by putting the private Workspace in front of the customer.
- The old Workspace → Presentation → Light mobile stack is **inspection only**, not the approved customer experience.

---

## Implementation map

| Piece | Path |
|-------|------|
| Config | `src/config/studio-conversation-framework-v1.ts` |
| Controllers | `src/lib/studio-conversation-framework/` |
| Lobby session | `src/lib/studio-conversation-framework/lobby-session.ts` |
| Runtime wire | `src/components/studio-conversation-room/ConversationRoomRuntime.tsx` |
| Help shell | `src/components/studio-conversation-room/HelpCenterPanel.tsx` |
| Cert page | `src/app/studio-conversation-room/page.tsx` |

---

## Out of scope

- Conversation Engine / LLM wiring
- Real payment, intake, or board handoff
- Forms, floating cards, dashboard UI
- Tuning voice personality

---

## Certification checklist

- Controllers compile and export with clear APIs
- State Manager can hold journey + flow step
- Navigation Controller can move along the spine without route changes
- Lobby round-trip restores prior phase + step (session-level only)
- Help is overlay-only — not in journey-phase enum; preserves phase/step
- Review is temporary-mode-only — not in journey-phase enum; preserves phase/step + target context
- Help and Review do not corrupt each other’s return state
- Presentation Manager can show empty or stub “Hello.”
- Voice Controller drives Communication Light only
- Help Center Panel exists as a closed shell
- No business logic; unit tests cover structure + Lobby/Help/Review contracts
- No commit/push until Tagia certifies
