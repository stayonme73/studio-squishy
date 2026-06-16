# Welcome Hall V3 — Experience + Art Brief

**Version:** 3.0 — Founder direction  
**Date:** June 2026  
**Status:** Founder approved — engineering in progress (interim art)  
**Supersedes:** v2 static renovation for interactive zones (v2 remains live until v3 ships)

**Code reference (planned):** `src/config/welcome-hall-v3-direction.ts`

---

## Mission

Rework the Welcome Hall into an **interactive showroom** — not a real office, coworking space, or static lobby.

Visitors **browse what Team Studio offers** before entering the Draft Room.

**Journey:** Browse → Understand → Choose → Confirm → Proceed

**Visitor thoughts:** *Okay, I see what they do.* · *I think this is what I need.* · *If they can build this, they can help me with my marketing.*

**Tone:** Modern · sleek · creative · professional · premium — **not** Willy Wonka.

---

## Locked elements (do not change)

Ceiling structure · ceiling ducts · industrial lighting design · floor material · polished floor · modern hallway feel · View Ahead city concept · teal/blue technology accents

**Lighting:** Lean teal where possible. Warm accents only if tasteful for tower/scene balance. No yellow/beige/flat room.

---

## Core layout change

**Office doors are not earning their space.** Reduce or eliminate unused doors, especially right side. Use recovered space for the **interactive showroom system**.

The hall should **not** feel like a hallway full of unused offices.

### Proposed layout changes (Scout)

| Area | v2 (current) | v3 (proposed) |
| ---- | ------------ | ------------- |
| **Tower** | Center-left, static, visual-only | **Left side, closer & larger**, selector dial — controls right wall |
| **Right wall** | Static outcomes copy on container wall | **Expanded showroom display** — category panels, angled/readable, replaces door real estate |
| **Right-side offices** | Full glass doors along corridor | **Reduced or removed** — space given to showroom wall |
| **Hallway depth** | Long perspective to city | **Slightly shortened** — city clearer, tower reachable, wall readable |
| **Large planter** | Blocks tower zone | **Removed** or thin low planter — must not block tower or wall |
| **Left wall** | Inspirational copy | **Unchanged role** — atmosphere only, not decision area |
| **Kiosk** | Whole-panel invisible hotspot | **Blue screen only** — precise touch target, no green debug box |
| **View Ahead** | Transition after Start Drafting from menu | **Transition after category CTA** — city responds when visitor is ready |

---

## Zone specs

### Left wall

- **Copy:** *Every project starts with an idea.*
- **Feel:** Inspiring · creative · human — subtle art/atmosphere OK
- **Not:** Dashboard · workspace counts · pricing · coworking · events

### Tower (interactive selector)

- **4 faces:** Marketing · Content Creation · Business Planning · Systems & Automation
- **Design:** Bold category text + strong visual art per face — showroom dial, not menu board
- **Behavior:** Rotate/tap → right wall updates
- **Tower explains nothing long-form** — it selects; the right wall explains

### Right wall (showroom)

- **Default:** *Ideas Into Action* · Dream it. · Shape it. · Build it.
- **On tower select:** Category title · What we help with · What you may receive · **HOW CAN WE HELP?**
- **Design:** Premium digital wall / studio reveal panel — built into environment, not flat website paste
- **CTA on wall** — not on tower; prevents jumping to Draft Room before understanding

### Kiosk / Studio Guide

- Front panel may still say **HOW CAN WE HELP?**
- **Touch target:** blue screen only (black trim in art — no green outline in UI)
- Screen copy option: *Tap to Open the Studio Guide* + hand icon
- **Early tap:** Guide opens with redirect — *Explore the showroom wall first…*
- **After category viewed + wall CTA:** Guide opens with **category pre-selected**

### View Ahead

- Calm · aspirational · no weather portal · no baked portal effects
- **Not a button** — responds after visitor confirms via category panel

---

## Interaction flow

1. Enter Welcome Hall  
2. Left wall: *Every project starts with an idea.*  
3. Notice larger left-side tower  
4. Rotate/tap tower → explore categories  
5. Right wall updates  
6. Read category details  
7. Tap **HOW CAN WE HELP?** on category panel  
8. Studio Guide opens (category pre-selected)  
9. View Ahead transition → Draft Room  
10. Draft Room: confirmation · intake · pricing · timeline · delivery  

**Draft Room is not where visitors first learn offerings** — Welcome Hall handles browse/education.

---

## Scout report: static vs interactive

| Element | Static (art plate) | Interactive (code + layers) |
| ------- | ------------------ | ----------------------------- |
| Ceiling, ducts, floor, hall structure | ✅ Baked in background plate | — |
| Left wall atmosphere + headline | ✅ Baked (or layer if copy rotates later) | — |
| Shortened hall / removed doors / composition | ✅ New background plate | — |
| View Ahead city (idle) | ✅ Baked in plate | Transition animation in code |
| **Tower** | Face artwork per category | **Rotate/tap**, face index, sync to wall |
| **Right wall** | Frame/bezel built into plate | **Panel content** swaps by tower state |
| **Kiosk** | Hardware + blue screen bezel in plate | **Blue-screen hit target** + conditional Guide behavior |
| Category copy (4 sets) | — | ✅ Code / config (`welcome-hall-v3-direction.ts`) |
| Studio Guide dialog | — | ✅ Code — pre-fill category, early-tap redirect |
| View Ahead → Draft Room | — | ✅ Code — triggered after wall CTA |

---

## Asset list (required before integration)

Scout **cannot** extract interactive showroom behavior from a single flat PNG.

### Required

| # | Asset | Purpose |
| - | ----- | ------- |
| 1 | **Background hall plate** | Full hall **without** tower, **without** right-wall panel content (empty display zone), shortened depth, reduced doors, no blocking planter |
| 2 | **Tower layer** | Isolated tower, transparent PNG (or 3D/WebGL if artist provides) |
| 3 | **Tower face art × 4** | Marketing · Content Creation · Business Planning · Systems & Automation — text + visual per face |
| 4 | **Right wall display frame** | Bezel/container baked in plate **or** separate frame layer |
| 5 | **Right wall panel states** | Default + 4 category layouts (art mock or code-rendered text on display zone — founder choice) |
| 6 | **Kiosk hardware plate** | Body in scene; **blue screen region** bounds documented (normalized x/y/w/h) |
| 7 | **Flat composite preview** | Full v3 scene for founder approval before engineering |

### Optional (future polish)

- Tower spin: background plate without tower + isolated tower (same as #1–2)
- Parallax / subtle hall atmosphere
- Animated panel slide between categories

### Deliverable specs

| Spec | Value |
| ---- | ----- |
| Aspect ratio | **3:2** (match current frame) |
| Minimum | 1024 × 682 px (@1x) |
| Preferred | 2048 × 1364 px (@2x) |
| Format | PNG layers + sRGB; source PSD/Figma |
| Touch bounds | Normalized coordinates per kiosk blue screen + right wall CTA |

---

## What cannot be done without new layered artwork

- Tower rotation with readable face changes  
- Right wall syncing to tower selection (without a defined display zone)  
- Repositioned / enlarged tower closer to viewer  
- Shortened hallway + removed right-side doors + expanded showroom wall  
- Blue-screen-only kiosk touch (needs art-defined screen bounds)  
- Removing planter without repainting floor/shadows  

**Do not attempt CSS spin or crop from a flat baked tower** (v1/v2 lesson).

---

## Success test

Guided showroom, not a lobby.

*"Wow, this is different." → "I can see what they offer." → "I know what I need." → "Now I'm ready for details." → "I trust them."*

---

## Stopping rule

**Do not continue into Draft Room development** until this Welcome Hall V3 experience structure is **founder-approved**.

After approval: art production → integration pass → QA interaction flow → then Draft Room intake work.

---

## Current live state (v2)

- `public/welcome-hall/welcome-hall-scene-v2.png` — static renovation, live on `/`
- Studio Guide kiosk + menu + View Ahead transition (legacy flow)
- **Unchanged until v3 assets + approval**
