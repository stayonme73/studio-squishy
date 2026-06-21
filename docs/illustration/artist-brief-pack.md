# Studio Squishy — Visual Design Brief (Artist Brief Pack)

**Version:** 1.0 (Founder Approved — master reference locked)  
**Date:** June 2026  
**Production model:** Refinement on locked master plate — no new room exploration  
**Character in scope:** Squishy composite at host position (`squishy-new-*` only); Step 3 engineering paused

---

## 1. Project summary

Studio Squishy is a separate web-first workspace experience. The `/studio` route will show a **semi-realistic warm industrial innovation studio** — a place visitors should want to work in.

**Emotional target:**

> If someone walked in for the first time, would they think: *"I can't believe I get to be here"?*

**Visual formula:**

- **Environment** — semi-realistic 2.5D illustrated interior (architectural-magazine realism)
- **Squishy** — approved stylized character (`squishy-new-*`); host positioning locked; engineering compositing Step 3 paused

### Approved visual direction (Founder Approved — June 2026)

**Master reference:** **Concept #4 — Full Room Candidate** — **officially locked.**

**Mode:** Refining the approved direction. **Not exploring new room concepts.**

**Refinement rule:** **5% targeted refinements only** — not 50% reinventions. See [master-reference.md](./master-reference.md).

> *We are protecting the vision now, not searching for it.*

**Studio should feel:** Optimistic · Creative · Intelligent · Warm · Modern · Playful without childish · Professional without corporate.

**Lighting:** **Cozy bright** always. Rainy days → *"I want to stay here and build something amazing"* — never dark or gloomy.

**Overall:** Ideas become real · creativity encouraged · people welcome · progress happens · Squishy naturally belongs. *Stay curious. Build fearlessly. Enjoy the process.*

See [master-reference.md](./master-reference.md) for the locked master plate and refinement policy.

---

## 2. Emotional goals

### Visitors should feel

- Belonging — *"I could actually work here"*
- Calm confidence — productive without pressure
- Warmth — human, lived-in, inviting
- Clarity — thinking made visible
- Quiet ambition — innovative without hype

### Visitors should think

- *"This is beautiful."*
- *"I want to come back."*
- *"Someone real works here."*

### Visitors should NOT think

- *"This is a cute app."*
- *"This is a corporate lobby."*
- *"This is where my files are stored forever."*

---

## 3. Design philosophy

### Workspace philosophy

**Thinking made visible. Work made human.**

| Zone / feature | Philosophy |
| -------------- | ---------- |
| **Weather Portal** | Life beyond work — time, seasons, and nature in the creative process |
| Whiteboard wall | Ideas, not performance |
| Strategy room | Conversation, not hierarchy |
| Builder workspace | Deep work, not grind culture |
| Executive desk | Leader **alongside** the team — not on a pedestal |
| Steel storage | Visual organization only — not a vault |

### Host, not receptionist

The Studio is a **host space**. Visitors experience the room first. Squishy greets later (Step 3 — paused).

---

## 4. Overall aesthetic

**Warm industrial innovation studio**

Blend of:

- Exposed structure (honest, intentional)
- Warm residential touches (walnut, cream, soft light)
- Modern professional tools (glass, steel, polished surfaces)
- Creative studio energy (whiteboard, notebooks, open work)

### Reference tone

- Architectural Digest / design publication interior
- Thoughtful product or innovation studio
- Favorite coffee shop that also ships great work

### Avoid

- Corporate sterility (grey cubicles, flat fluorescent)
- Sticker / flat clip-art offices
- Hyper-futuristic gimmicks (neon grids, holograms)
- Hyper-realistic 3D render that would clash with future stylized Squishy
- Showroom perfection with no signs of life
- Vault / safe / security visual language

---

## 5. Full room layout (reference for final plate)

Portrait orientation. Stage ratio **1024 : 1536** (2:3).

```
┌─────────────────────────────────────────┐
│  Exposed ceiling · teal pipes           │
├──────────┬─────────────┬────────────────┤
│ Weather  │ Whiteboard  │ Strategy Room  │
│ Portal   │ wall        │ (glass)        │
│ (left)   │ ~46% width  │ ~54% width     │
├──────────┤             │ ~38% height    │
│          │             │                │
├──────────┼─────────────┼────────────────┤
│ Executive│             │ Builder        │
│ Desk     │             │ Workspace      │
│ ~48% w   │             │ ~52% width     │
│          │             │ Steel Storage  │
├──────────┴─────────────┴────────────────┤
│  Polished concrete floor (~22%)         │
└─────────────────────────────────────────┘
```

Normalized zone map (matches `src/config/studio-zones.ts`):

| Zone | x | y | width | height |
| ---- | --- | --- | ----- | ------ |
| whiteboardWall | 0 | 0.10 | 0.46 | 0.46 |
| strategyRoom | 0.46 | 0.10 | 0.54 | 0.38 |
| executiveDesk | 0 | 0.56 | 0.48 | 0.44 |
| builderWorkspace | 0.48 | 0.48 | 0.52 | 0.36 |
| fileCabinet | 0.48 | 0.84 | 0.52 | 0.16 |

**Style frame (Phase 0.2):** Only upper-right **strategy room** + lower-left **executive desk** — see [style-frame-scope.md](./style-frame-scope.md). Weather Portal is **not** in the style frame crop; see [weather-portal.md](./weather-portal.md).

---

## 5.1 Weather Portal (signature feature)

**Status:** Approved — **Tall Vertical Portal** — not implemented. Full spec: [weather-portal.md](./weather-portal.md).

The Weather Portal is the Studio's **emotional connection to the outside world** — not a traditional office window. It is an intentional architectural element with its own frame and opening, integrated into the Studio from the start.

**Approved type:** **Tall Vertical Portal** — narrow, generous height; storytelling aperture, not a maximized view.

**Emotional target:** *"Something beautiful is happening outside."*

**Purpose:** Create moments of **pause, wonder, and perspective** — magical and architectural, preserving Squishy's connection to weather, seasons, and the living world beyond work.

### Placement (approved — illustration reference)

**Proportions update (Vision Lock):** Portal is **larger** than initial concepts — still tall vertical (not panoramic), with expanded frame presence on left wall.

| Element | x | y | width | height |
| ------- | --- | --- | ----- | ------ |
| Portal opening | 0.02 | 0.10 | 0.18 | 0.48 | Larger storytelling aperture |
| Frame (outer) | 0.01 | 0.08 | 0.22 | 0.52 | Brushed steel; architectural presence |

**Wall:** Left plane, within `whiteboardWall` zone; whiteboard shifts right. Visible from executive desk sightline. Distinct from strategy room interior glass (upper-right).

### Design

- **Tall Vertical Portal** — narrow aperture, tall proportion; vertical outdoor framing (sky, weather, nature)
- **Brushed steel framing** preferred; optional walnut ledge/shelf
- Modern, warm, distinctive — a memorable Studio feature
- Cutout/layering approach (like Squishy storytelling window) — not flat exterior paste
- **Not** wide glazing or corporate floor-to-ceiling windows

### Future environmental behaviors (not this art pass)

Daylight, rain, storms, sunsets, night, seasons, nature movement, fireflies — documented in [weather-portal.md](./weather-portal.md); runtime layers in a future phase.

### Constraints

- Must not resemble a television screen or gimmick
- Must not be generic office glazing with exterior photo behind

---

## 6. Color palette

Use these as primary anchors. Minor tonal variation for realism is welcome.

| Name | Hex | Use |
| ---- | --- | --- |
| Denim blue | `#2C3E50` | Structural walls, columns, chair upholstery |
| Teal green | `#008080` | Pipes, plant accents |
| Pipe teal | `#007A7A` | Ceiling pipes (slightly darker) |
| Walnut | `#6B4423` | Desks, tables, mullions, shelves |
| Cream | `#F5F0E8` | Primary wall tone |
| Matte black | `#1A1A1A` | Steel bases, frames, cabinet faces |
| Brushed steel | `#7A7B7F` | Weather Portal frame (highlights `#A8A9AD`) |
| Burnt orange | `#CC5500` | Desk lamp shade (sparing) |
| Golden yellow | `#DAA520` | Pendant / ambient warm light |
| Coral | `#FF7F50` | Rare accent only — do not dominate |
| Warm gray floor | `#9A9590` | Polished concrete base |
| Warm gray light | `#B5B0AA` | Floor highlights / gloss |
| Ceiling | `#3D3835` | Exposed ceiling tone |

---

## 7. Materials direction

### Flooring

- Satin-gloss **polished concrete**, warm gray
- Soft light pools and subtle reflections under furniture
- Optional expansion joint or polish variation for credibility

### Ceiling

- Exposed industrial ceiling — beams or structure visible
- **Pipes painted teal green** — cylindrical volume, not flat lines
- Intentional, designed — not neglected utility

### Walls

- Warm **cream** plaster with subtle texture
- **Denim blue** accent column or wainscot (optional — not on Weather Portal wall)
- Thin **matte black steel** baseboard at wall–floor junction

### Weather Portal (full plate — see [weather-portal.md](./weather-portal.md))

- **Brushed steel frame** — warm metallic, soft directional highlights; distinct from matte black steel elsewhere
- Defined opening set into wall thickness — built-in, not applied
- Optional **walnut ledge or shelf** beneath opening
- Clear glazing with edge depth — not flat grey rectangle
- Left wall placement; whiteboard shifts right within zone

### Glass (strategy room)

- Real transparency with edge highlights
- Walnut or black steel mullions
- Interior back wall slightly warmer/darker — proves depth

### Steel

- Matte black powder-coat — desks, frames, built-in storage
- Visible hardware where appropriate (handles, trim)

### Walnut

- Executive desk top, strategy table, select mullions
- Visible edge grain, lighter top / darker edge

---

## 8. Zone-specific direction

### Executive desk (Squishy’s future workspace)

- **Floating walnut desktop** with **brushed steel trim** — locked from Concept #4
- **Hidden/invisible supports** — no visible legs
- **Larger dual monitors** with soft screen glow
- **Mug text (required):** `Let's Figure It Out.`
- **Iconic yellow chair** — elevated brushed-steel hardware, premium illuminated wheel elements; do not replace color or silhouette

### Squishy (locked positioning)

- **Established Squishy design only** — `squishy-new-*` assets; never AI-generated character variants
- **Faces the team** — back never turned to team, visitors, or studio
- Host and collaborator at executive desk zone; sightlines to portal + strategy room
- Step 3 engineering compositing paused until final art approved

### Strategy room (glass-walled)

- Glass enclosure upper-right — open, inviting; **steel or clear minimal hardware**
- Walnut conference table with slender legs
- **3+ modern wheeled chairs** — teal, coral, denim accents; memorable silhouettes; one slightly pulled out
- Warm **pendant light** — sculptural/modern; golden pool on table
- **Graffiti-inspired optimistic art** on interior wall optional
- One notebook or glass on table — meeting paused

### Built-in storage (full plate)

- **Built-in modern storage** matching desk aesthetic — walnut + brushed steel
- Flush or credenza-style; **not** old-fashioned filing cabinets
- Linear pulls; small label cards optional
- Visual organization only — no vault aesthetic

### Whiteboard wall / think board (full plate — not in style frame)

- **Large modern think board** — easy to read; optimistic typography; may explore **frosted glass** variant
- Positioned **right of Weather Portal** within zone
- Abstract or inspirational phrases — illegible micro-copy OK; no dated product promises
- Marker tray with teal, denim, orange markers + eraser (if dry-erase variant)
- **Graffiti-inspired optimistic artwork** nearby — environmental storytelling

### Weather Portal (full plate — not in style frame)

- Signature left-wall feature — see §5.1 and [weather-portal.md](./weather-portal.md)
- Static frame in illustration; outdoor scene and weather effects are **runtime layers** (future)
- Must not read as TV, gimmick, or generic office window

### Builder workspace (full plate — not in style frame)

- Workbench distinct from executive desk — utilitarian
- Dual monitors, keyboard, sticky note on bezel
- Task chair — simpler than executive chair

### Built-in steel storage (full plate — not in style frame)

- See **Built-in storage** above — walnut + brushed steel preferred over matte black-only cabinets

---

## 9. Lighting direction

**Warm, layered, sourced — cozy bright, not flat fill.**

Rainy and stormy portal states remain **warm interior** — *"I want to stay here and build something amazing."* Avoid dark, gloomy environments.

| Source | Role | Color |
| ------ | ---- | ----- |
| **Weather Portal** | Left-wall exterior connection; primary ambient wash | Golden / cream (time-of-day varies at runtime) |
| Strategy pendant | Hero fixture over table | Golden yellow |
| Executive desk lamp | Tight pool on desk, mug | Burnt orange interior |
| Monitor glow | Cool accent on screen faces | Blue-grey |
| Ceiling | Structure catches highlights | Neutral |

**Light hierarchy (approximate):** ambient 60% · pendant 25% · desk lamp 15% · monitor glow accent

**Avoid:** cold office white, uniform flat fill, neon, noir drama

---

## 10. Lived-in details (credibility pass)

Include sparingly — occupied but not messy:

- Mug on desk (required text)
- Open notebook, pen
- Markers in whiteboard tray (full plate)
- Faint whiteboard marks (full plate)
- Sticky note on builder monitor (full plate)
- Soft monitor glow
- One coffee ring or coaster optional

---

## 11. Explicit exclusions (this art pass)

- **Room redesign** — Concept #4 composition is locked; no layout reinvention
- **New Squishy character designs, interpretations, or mascots** — use approved `squishy-new-*` assets only
- **Squishy back turned to team**
- **Large-scale redesigns disguised as refinements**
- Relocating portal, desk, or strategy room without founder review
- Wide windows replacing tall Weather Portal
- Major palette shift toward corporate brown
- No zone labels or wireframe overlays
- No vault / safe / security imagery
- No product promise text in art
- No readable whiteboard copy that will date
- No logo watermark
- No entrance lobby (separate future pass)

---

## 12. AI-assisted production notes

For AI-assisted concept exploration with founder review:

1. **Anchor to [master-reference.md](./master-reference.md)** — Concept #4 locked; 5% refinements only
2. **Do not generate new Squishy designs** — composite approved assets
3. **Founder approves targeted refinements** before Phase 1 full-room extension
4. **Iterate in layers** — Path B layer stack; portal runtime exception
5. **Human polish pass recommended** before calling any output "final"
6. **Document prompts** in `docs/illustration/production-log.md`

---

## 13. Approval checklist (founder)

Before Phase 1 begins, confirm:

- [ ] Emotional goals and avoid list understood
- [ ] Palette accepted
- [ ] Weather Portal addition accepted ([weather-portal.md](./weather-portal.md))
- [ ] Half-room style frame scope accepted ([style-frame-scope.md](./style-frame-scope.md))
- [ ] Asset specifications accepted ([asset-specifications.md](./asset-specifications.md))
- [ ] No Squishy in art until Step 3 reopened
- [ ] Entrance illustration deferred until Studio interior approved

**Founder signature / approval:** _________________ **Date:** ___________

---

## 14. Related documents

- [master-reference.md](./master-reference.md) — **Concept #4 master lock; 5% refinement rule**
- [weather-portal.md](./weather-portal.md) — Weather Portal architecture
- [style-frame-scope.md](./style-frame-scope.md) — Phase 0.2
- [asset-specifications.md](./asset-specifications.md) — Phase 0.3
- Design review (conversation archive) — emotional limits of CSS scaffold
- `src/config/studio-palette.ts` — engineering color tokens
- `src/config/studio-zones.ts` — zone coordinates for future integration
