# Welcome Hall V3 — Implementation Plan

**Status:** Founder approved — engineering in progress  
**Date:** June 2026  
**Visual reference (founder):** `public/welcome-hall/welcome-hall-v3-concept-reference.png`

**Layout model:** **WALL + PORTAL** — not WALL + CORNER + PORTAL. Reclaim dead hallway corner for expanded showroom wall. Art (horn, etc.) stays; typography gets space to breathe.

---

## V3.1 founder revision (positioning)

**Issue:** Showroom wall felt too distant — readability problem, not content problem.

**Engineering adjustments (CSS, interim art):**

| Element | V3 | V3.1 |
| ------- | -- | ---- |
| Showroom wall | `right: 4.5%`, flat `-4deg` | `left: 50%`, **`-12deg`** toward tower, `translateZ` forward |
| Wall size | 30% × 54% | **36% × 58%** |
| Tower | `left: 19%`, 13% wide | **`left: 16%`**, **15% wide**, taller |
| Success test | — | Founder can read wall without squinting |

**Art still required:** shortened hall plate, reclaimed door space, wall baked into environment at this angle.

### Showroom wall — behavior vs visual language (founder locked)

| | Benchmark | What we build |
| --- | --- | --- |
| **Behavior** | Interactive showroom | Tower selects → **wall updates** → CTA → Studio Guide |
| **Visual language** | Static *Ideas Into Action* image | Large title · 3 scan lines · short receive · big button |

**Not the same thing.** The original static wall was **inspiration for readability only**. The new wall is **interactive** and swaps content per category (Marketing, Content Creation, Consulting, Systems & Automation).

**Founder rule:** If Founder Tagia has to squint, the customer will too. Readability over realism — digital showroom at a computer screen.

**Combine the two:** interactive behavior + scannable presentation. Same information, not less — not dashboards.

---

## 1. Updated visual concept

Renovation of the hallway into a **guided showroom** — Apple Store × museum exhibit × creative agency.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [ industrial ceiling · teal LED strips · ducts — LOCKED ]              │
├──────────────┬──────────────────────────────┬───────────────────────────┤
│ LEFT WALL    │         VIEW AHEAD             │  RIGHT SHOWROOM WALL      │
│ (static art) │    city · aspirational         │  (interactive panel)      │
│              │    shortened depth ~15–20%       │  expands into reclaimed   │
│ "Every       │                                │  door space               │
│  project…"   │                                │                           │
│ sketches /   │                                │  Default → Ideas Into     │
│ blueprints   │                                │  Action                   │
│              │                                │  Category → help + CTA    │
├──────────────┤                                │                           │
│ [KIOSK]      │   ┌──────────┐                 │                           │
│ blue screen  │   │  TOWER   │ ← closer/larger │                           │
│ touch only   │   │ selector │   on LEFT       │                           │
│              │   │   dial   │                 │                           │
└──────────────┴───┴──────────┴─────────────────┴───────────────────────────┘
```

**Interim (engineering pass):** v2 hall plate used as background with overlay masks on baked tower/wall zones. Interactive tower + showroom wall are **real components** positioned over those zones until `welcome-hall-v3-plate.png` arrives.

**Final (art pass):** Background plate with empty tower cutout + empty display zone; component layers align to art-defined bounds.

---

## 2. Static vs interactive component map

| Layer | Component | Static / Interactive | Source |
| ----- | --------- | -------------------- | ------ |
| L0 | Hall background plate | Static (art) | `welcome-hall-v3-plate.png` *(pending)* |
| L1 | Left wall atmosphere | Static (art) | Baked in plate |
| L2 | Ceiling / floor / hall structure | Static (art) | Baked in plate |
| L3 | View Ahead city (idle) | Static (art) | Baked in plate |
| L4 | **ShowroomTower** | **Interactive** | `ShowroomTower.tsx` — rotate/tap, 4 faces |
| L5 | **ShowroomWall** | **Interactive** | `ShowroomWall.tsx` — syncs to tower |
| L6 | **StudioGuideKiosk** | **Interactive** | `StudioGuideKiosk.tsx` — blue screen hit target |
| L7 | **StudioGuideDialog** | **Interactive** | Category pre-selected, early-tap redirect |
| L8 | View Ahead transition | **Interactive** | CSS animation → Draft Room |

**State flow (code):**

```
towerFaceIndex → showroomWallContent
hasExploredShowroom → kiosk activation gate
wallCtaClick(category) → guideOpen + selectedCategory
guideStartDrafting → viewAheadTransition → /draft-room
```

---

## 3. Required layered assets (artist)

| Priority | Asset | Notes |
| -------- | ----- | ----- |
| P0 | **Hall background plate** | Shortened depth, reduced doors, no tower, empty right display zone, no blocking planter |
| P0 | **Tower layer + 4 face artworks** | Marketing · Content · Business Planning · Systems & Automation |
| P0 | **Showroom wall frame** | Architectural bezel — not giant TV |
| P1 | **Kiosk hardware** | Blue screen bounds documented (normalized %) |
| P1 | **Left wall v3 art** | Creative-process inspiration — sketches, blueprints |
| P2 | **Flat composite preview** | Full scene for founder sign-off |

**Specs:** 3:2 · 2048×1364 preferred · sRGB PNG + source file

---

## 4. Requires separate artwork before engineering can finish

| Item | Why code alone cannot complete it |
| ---- | --------------------------------- |
| Shortened hallway + removed doors | Composition change in plate |
| Tower closer/larger in perspective | Art placement, shadows, floor reflection |
| Left wall creative-process art | New mural — not overlay text |
| Right wall architectural expansion | Reclaimed space from doors |
| Planter removal | Floor repaint + shadow |
| Tower face artwork | Bold category art per face |
| Kiosk blue-screen-only bounds | Art defines exact touch region |

**Engineering can ship now:** interactive tower, wall, kiosk logic, guide flow, View Ahead transition — on interim background until art delivers.

---

## 5. Success test

*"Wow." → "I understand what they do." → "I know what I need." → "I trust them." → "Let's get started."*

---

## 6. Stopping rule

Draft Room scope/pricing/intake work remains **paused** until Welcome Hall V3 interaction QA passes on interim or final art.
