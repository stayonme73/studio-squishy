# Welcome Hall — Artist Handoff (Final Renovation Pass)

**Version:** 1.0 — Founder Approved direction  
**Date:** June 2026  
**Status:** v2 integrated — founder approved June 2026  
**Code reference:** `src/config/welcome-hall-direction.ts`

---

## Mission

Create a **revised Welcome Hall image for Team Studio** using the current approved scene as the **blueprint**.

This is a **renovation, not a redesign.** Preserve what works. Align the environment with Team Studio’s purpose: **helping people turn ideas into action.**

**Visitors should think:** *I can do this.* · *I belong here.* · *They know how to help me.*

**Overall feel:** welcoming · inspiring · innovative · premium · organized · hopeful

---

## Blueprint (do not redesign)

| Reference | Path |
| --------- | ---- |
| **Primary blueprint** | `public/welcome-hall/welcome-hall-scene.png` |
| Historical reference | `public/welcome-hall/image-1-reference.png` |

### Locked — preserve exactly

Hallway proportions · overall composition · office placement · Art Tower placement · city at end of hall · left wall placement · right wall placement · Studio Guide box placement

---

## Zone renovation guide

| Zone | Purpose | Required copy / content | Remove |
| ---- | ------- | ----------------------- | ------ |
| **Left wall** | Emotional welcome | **Every project starts with an idea.** Warm, creative, encouraging, elegantly integrated | Weather widgets · workspace counts · dashboards · pricing · coworking language · event listings |
| **Studio Guide box** | First handshake — **must look tappable in the art** | **HOW CAN WE HELP?** Inviting · obvious · premium · approachable | Invisible/interaction-free kiosks · confusing labels · generic hardware |
| **Art Tower** | Environmental inspiration — museum-quality installation | Visual artwork only. Themes: imagination · creativity · transformation · possibility | Quotes · menus · operational info · duplicate branding |
| **Right wall** | Why Team Studio exists | **Ideas Into Action** · Dream it. · Shape it. · Build it. Warm · confident · human | Pricing · service lists · coworking language · generic slogans · duplicate Studio branding |
| **View Ahead (city)** | Possibility and the journey ahead — calm until code activates transition | Beautiful · aspirational · inviting cityscape | Portal effects · glow hacks · “click me” UI painted into art |

**Note:** The city is **not** a button. Visitors use the Studio Guide box; code handles transition into the Draft Room.

---

## Global removals

Studio Squishy branding · coffee branding/messaging · coworking remnants · duplicate Studio branding · unnecessary visual clutter

---

## Deliverables

### Required (this pass)

| File | Spec |
| ---- | ---- |
| **`welcome-hall-scene-v2.png`** | Full scene renovation on locked composition |

| Spec | Value |
| ---- | ----- |
| Aspect ratio | **3:2** (match blueprint) |
| Minimum size | **1024 × 576 px** (@1x) |
| Preferred | **2048 × 1152 px** (@2x) |
| Color | sRGB |
| Format | PNG (flat composite) |

Also deliver: unmarked proof for founder review → then final export + source file (PSD / Figma / AI).

### Optional (future-proof — same session if feasible)

| File | Purpose |
| ---- | ------- |
| Background plate (hall **without** Art Tower) | Future slow tower spin |
| Art Tower isolated PNG (transparent) | Future tower animation layer |

Not required to ship this pass. Flat v2 alone completes renovation.

---

## Final test

When someone enters the Welcome Hall, they should feel **inspired · guided · capable.**

Every element earns its place. Nothing exists because it always has. This is the **front door to Team Studio.**

---

## After delivery

1. Founder review against this handoff  
2. Approved file replaces `public/welcome-hall/welcome-hall-scene.png`  
3. Engineering: visual QA + Studio Guide hotspot alignment — **no layout redesign**

**Do not extend integration without founder approval.**

---

## Plate v5 — Final usability revision (LOCKED direction)

**Status:** Pending artist delivery  
**Replaces:** `public/welcome-hall/welcome-hall-scene-v3.2.png` (bump `?v=` in code after delivery)

### Remove

- Sticky notes near the tower — not readable on laptop; they do not tell the customer what to do next.

### Update

- Move the **Start Here** kiosk to the **left of the tower** (not the right). Tower → kiosk should read as one natural pair.
- Enlarge the kiosk by **~10–15%** using the space freed by removing sticky notes.
- **Wording locked exactly:**
  - **START HERE**
  - *Let's build something great together.*

### Preserve

- Everything else in the approved v4 plate (tower, walls, View Ahead, atmosphere).

**Readability rule:** If Founder Tagia has to squint, the customer will too.

@see docs/illustration/welcome-hall-locked.md
