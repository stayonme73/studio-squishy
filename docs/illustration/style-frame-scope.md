# Studio Squishy — Style Frame Scope (Phase 0.2)

**Purpose:** Define the first illustration deliverable for founder approval before Phase 1 full-room production.

**Production model:** AI-assisted concept exploration with founder review  
**Do not treat style frame output as final production art.**

---

## Recommendation: half-room first

### Why half-room (not full room)

| Reason | Explanation |
| ------ | ----------- |
| **Fastest path to style approval** | Material, light, and furniture language proven before full investment |
| **Highest emotional stakes** | Executive desk + strategy room carry the brief’s core personality |
| **Glass + wood + steel in one frame** | Tests the three material stories that define the Studio |
| **Lighting hierarchy visible** | Pendant (golden) + desk lamp (burnt orange) + ambient wash in one composition |
| **Lower revision cost** | Founder can reject or redirect style without repainting whiteboard/builder/storage |

### Why executive desk + strategy room (not other pairs)

| Zone pair | Verdict |
| --------- | ------- |
| **Executive desk + strategy room** | **Recommended** — leadership + collaboration; glass + walnut + steel; warm light story |
| Whiteboard + strategy room | Strong, but misses desk/mug/lived-in executive story |
| Builder + storage | Useful for utilitarian tone check, weaker emotional wow |
| Full room | Too much for first style gate |

---

## Style frame composition

### Crop region (within full 1024×1536 stage)

Include approximately:

```
┌─────────────────────────────────────────┐
│  [Ceiling + pipes — top ~12%]           │
├──────────────┬──────────────────────────┤
│              │                          │
│  (edge of    │  STRATEGY ROOM           │
│  whiteboard  │  Glass enclosure         │
│  optional)   │  Table + chairs          │
│              │  Pendant light           │
│              │                          │
├──────────────┤                          │
│  EXECUTIVE   │                          │
│  DESK        │  (builder zone edge      │
│  Monitors    │   optional fade)         │
│  Mug, plant  │                          │
│  Chair       │                          │
├──────────────┴──────────────────────────┤
│  [Concrete floor — bottom ~22%]         │
└─────────────────────────────────────────┘
```

**Horizontal coverage:** ~full width (both zones)  
**Vertical coverage:** ~55%–100% of stage (from mid-whiteboard zone down through floor)  
**Optional:** sliver of whiteboard left edge for wall context — not required for approval

### Approximate normalized bounds (reference)

| Element | x | y | width | height |
| ------- | --- | --- | ----- | ------ |
| Strategy room (from zone map) | 0.46 | 0.10 | 0.54 | 0.38 |
| Executive desk (from zone map) | 0 | 0.56 | 0.48 | 0.44 |
| **Style frame crop (recommended)** | 0 | 0.08 | 1.0 | 0.92 |

---

## Must show in style frame

### Architecture

- [ ] Cream wall with subtle texture
- [ ] Exposed ceiling with **teal pipes** (cylindrical, not lines)
- [ ] Polished warm-gray **concrete floor** with gloss/reflection
- [ ] Glass strategy enclosure with mullions and interior depth

### Strategy room

- [ ] Walnut conference table with visible legs
- [ ] 2–3 denim chairs (one pulled out)
- [ ] Visible **pendant fixture** with golden light pool on table
- [ ] One small table prop (notebook or glass)

### Executive desk

- [ ] **Floating walnut top** with **matte black steel trim**
- [ ] Minimal steel leg / support with **shadow under desk**
- [ ] Dual monitors with stands and soft glow
- [ ] Mug with readable text: **`Let's Figure It Out.`**
- [ ] Small plant + open notebook
- [ ] **Burnt orange desk lamp** with pool on desk surface
- [ ] Executive chair pulled back — **empty, no character**

### Lighting

- [ ] Ambient golden wash (off-frame left)
- [ ] Pendant pool on strategy table
- [ ] Desk lamp pool on executive desk
- [ ] Monitor glow accent (cool vs warm balance)

---

## Must NOT show in style frame

- Squishy or any character
- Whiteboard content as focal point (edge sliver only if needed)
- Builder workspace detail (soft fade OK at right lower edge)
- Built-in storage cabinets
- Zone labels, UI overlays, dev placeholders
- Vault / safe imagery
- **Weather Portal** (deferred to Phase 1 full room — see [weather-portal.md](./weather-portal.md))

**Note:** Style frame concepts may show ambient light from the left; that is not Weather Portal approval. Portal design is gated in Phase 1.

---

## Deliverables for style frame review

| # | Deliverable | Format | Count |
| - | ----------- | ------ | ----- |
| 1 | Greybox / block-in (optional) | PNG | 1 |
| 2 | Color concept variations | PNG or WebP | **3–5** |
| 3 | Founder selected direction | Annotated reference | 1 |
| 4 | Written prompt log | Markdown | 1 (when generated) |

**Export size for style frame:** minimum **1536 × 2304 px** (1.5× stage) or **2048 × 3072 px** (2×) — maintain 2:3 ratio.

---

## Approval gate

**Phase 1 does NOT begin until founder approves ONE style frame direction.**

Founder review criteria:

1. **Material credibility** — Do wood, glass, steel, and concrete read as real?
2. **Warmth** — Does it feel inviting, not corporate or cold?
3. **Light** — Are fixtures believable? Is the room warmly lit?
4. **Lived-in** — Does the desk feel occupied-in-spirit without clutter?
5. **Brief alignment** — Architectural magazine meets product studio?
6. **Squishy-ready** — Is executive desk zone clearly ready for character compositing later (empty chair, clear floor space)?

**Decision options:**

- [ ] **Approved** — proceed to Phase 1 full-room illustration
- [ ] **Revise** — specify material, light, or composition changes (another style frame round)
- [ ] **Reject** — revisit brief or production model

**Founder approval:** _________________ **Date:** ___________

---

## After style frame approval (Phase 1 preview — not started)

1. Extend approved style to **full portrait plate** (all five zones + **Weather Portal** on left wall)
2. Add whiteboard wall, builder workspace, built-in storage in same visual language
3. Lived-in pass and lighting polish
4. Layered source archive + flat WebP export
5. Founder final art approval before engineering integration
