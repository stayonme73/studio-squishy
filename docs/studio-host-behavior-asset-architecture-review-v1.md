# Studio Host Behavior & Asset Architecture Review

| Field | Value |
|---|---|
| Status | **Accepted with correction — 2026-07-18** |
| Date | 2026-07-18 |
| Room | Studio Lobby / Studio Host (cross-scene identity) |
| Authority inputs | [`studio-lobby-environment-separation-inspection-v1.md`](studio-lobby-environment-separation-inspection-v1.md) (LOCKED) · [`studio-host-character-standard-v1-locked.md`](studio-host-character-standard-v1-locked.md) · [`studio-lobby-environment-host-asset-generation-v1.md`](studio-lobby-environment-host-asset-generation-v1.md) |
| Scope | Architecture planning only |
| Forbidden | Code changes · artwork generation · implementation |
| Correction | Layered editable Host master is mandatory; code reserved slots alone do not prevent Squishy-style rebuild |

---

## Important Product Principle

The Studio Host is the client-facing representative.

She performs her work through the **Studio Problem Solver**, which provides access to the Help Center, FAQs, Studio policies, project information, research tools, team coordination, and the Owner Console.

The client experiences **one professional Studio representative**. The underlying systems remain invisible.

Her on-screen behavior must therefore support *working* presence (researching, checking, thinking, coordinating) — not a static receptionist pose and not a performing mascot.

---

## Verdict (one paragraph)

Keep **Version 1** exactly as locked: **environment plate + Host base + eyes open + eyes closed**, feet-anchored `StudioLobbyHostLayer`, breathe + blink only. Do **not** ship arms, hands, tablet, or mouth as separate **runtime** files in V1. Code reserved slots alone are **not** enough — that is the Squishy trap. The artist must create and **retain a layered editable master** with separable head/face, mouth region, arms, hands, tablet, torso, and lower-body groups, then export only the four flattened V1 runtime assets. Future work behaviors attach from that master without rebuilding the Host from a fused flat.

---

## 1. What artwork should remain permanently fixed?

Treat these as **stable identity / body** assets across versions (replace only for wardrobe/pose packages Tagia approves):

| Fixed | Why |
|-------|-----|
| Face structure, hair, glasses, body proportions | Host Character Standard — same individual |
| Default standing silhouette for V1–V2 idle | Avoid redesigning proportions each behavior; master still keeps separable groups |
| Feet contact relationship to floor | Feet anchor is locked; ground plane must stay reliable |
| Default wardrobe silhouette (until Tagia-approved variant) | Identity continuity |
| Environment plate (no Host) | Separate layer; Host never baked back in |

**Permanently fixed does not mean “fused in the master.”** Identity stays; the layered master keeps groups recoverable. Do not cut micro-runtime layers until a concrete behavior requires them.

---

## 2. What should be separated **now** (or reserved now) for future growth?

### Separate in production artwork — Version 1 runtime (already locked)

| Asset | Role |
|-------|------|
| Host base (flattened export) | Full-body professional idle; tablet may be painted into this flat |
| Eyes open / eyes closed (flattened exports) | Blink without rebuilding face |

### Required art source — layered editable master (not V1 runtime)

The production Host must be created and **retained** as a layered editable master (PSD/AI/etc. per Tagia’s pipeline). Layers do not need animation artwork yet. They must not be permanently fused beyond recovery.

**Preserve editable groups for:**

- head and face  
- eyes  
- mouth area  
- torso  
- near arm and hand  
- far arm and hand  
- tablet  
- legs and feet  
- clothing elements where movement may matter  

**Tablet:** May appear painted into the flattened V1 Host Base. In the master, tablet remains a **separate editable object**, along with the hands touching it.

Flattened V1 exports are derived from this master. **Do not flatten or discard the editable master.**

### Separate in architecture / registration (supports drop-in later — insufficient alone)

Reserve named **slots** in `studio-lobby-host-layer-v1` (config + component props) so future PNGs drop in without redesigning `StudioLobbyHostLayer`. Slots without a recoverable layered master still force redraws — master is the primary safeguard; slots are the runtime hook.

---

## 3. Inexpensive if planned now; expensive if ignored

| Decision | If planned now | If ignored |
|----------|----------------|------------|
| **Layered editable Host master** (head, eyes, mouth region, arms, hands, tablet, torso, legs) | Future behaviors export from master | Squishy trap — cut apart or full redraw |
| Feet anchor + same canvas registration for all Host PNGs | Overlays snap on | Every behavior needs new full-body + remount |
| Eyes as layers (runtime) | Blink forever | Face rebuild for every expression |
| Neutral “work-ready” idle; tablet on flat V1 base, separate in master | Reads as professional worker | Looks like static greeter; later tablet work needs full redraw |
| Visual work-state enum (idle / thinking / …) with dormant values | Wire UI later | Ad-hoc flags, false listening, rebuild component |
| Z-order: env → Host → kiosk → conversation | Behaviors never steal taps | Hotspot / overlay fights |
| Dual-pass Desktop + Samsung rule | Crop-safe composition | Mobile-only emergency crops / second Host art |
| Runtime slot names for gaze / tablet / hands (unused) | Drop-in exports from master | Still expensive if master was flattened away |

---

## 4. What should intentionally wait

| Behavior | Wait until | Reason |
|----------|------------|--------|
| Looking at client / tablet (gaze swap) | First “research / Problem Solver” presence package | Needs art + state; not Lobby entry-critical |
| Typing / reading / hand gestures | After gaze + tablet overlay art exists | High alignment cost |
| Listening / speaking visual | Only if voice is approved | Voice stays disabled; avoid false speaking |
| Celebration | Post-purchase / Board moments | Wrong emotional beat for Lobby V1 |
| Multi-pose wardrobe packs | Tagia-approved scene needs | Identity lock first |
| Mouth / lipsync | Almost never for this Host model | She is not a talking mascot; UI + voice copy carry speech |

---

## 5. What Version 1 should include

**Behavior**

- Professional idle posture (base art)
- Subtle breathing
- Blinking
- `prefers-reduced-motion` → static
- Visual state machine with **idle-only active**; future states **dormant**

**Layers / components**

- Clean environment plate
- `StudioLobbyHostLayer` (feet-anchored)
- Conversation overlay unchanged
- Voice **off**

**Not in V1**

- Work animations, gaze, typing, speaking visuals, celebration, shadow layer, mouth

---

## 6. Artwork assets the artist should ultimately produce

### Required for Version 1 (runtime delivery to Scout)

| Asset | Notes |
|-------|--------|
| `studio-lobby-environment.png` @ 1448×1086 | No Host, no software greeting bubble |
| Optional 2× environment master | Chat workspace only |
| `studio-lobby-host-base.png` | Transparent flattened export; professional idle; tablet OK painted into flat; clear of kiosk tap zone when placed |
| `studio-lobby-host-eyes-open.png` | Same canvas size as base |
| `studio-lobby-host-eyes-closed.png` | Same registration |

### Required for production (retain — not V1 runtime)

| Asset | Notes |
|-------|--------|
| Layered editable Host master | Separable head/face, eyes, mouth region, arms, hands, tablet, torso, lower body, clothing-as-needed. Tablet + hands touching it remain editable objects. Do not discard after flattening V1 exports. |

### Recommended for future versions (export from master when scheduled)

| Asset pack | Enables |
|------------|---------|
| Gaze overlays (client / tablet) | Looking toward client; checking tablet / Problem Solver |
| Tablet prop overlay(s) | Reading, researching (systems stay invisible; Host “looks busy”) |
| Hands / typing overlay | Typing, light gestures |
| Optional “thinking” stillness cue | Can often be **software** (slower breathe + eye hold) before new art |
| Wardrobe / scene variants | Only with Tagia approval |

**Still not recommended as default runtime:** mouth sheets, celebration full-body, per-device Host plates.

---

## 7. Does current Host Layer architecture support growth?

**Yes, with one explicit pre-implementation addition to the contract (docs/config only, when implementation is planned):**

| Already good (locked) | Gap to close before code |
|-----------------------|---------------------------|
| Separate env vs Host | Document **slot map** (`body`, `eyes`, reserved `gaze` / `propTablet` / `hands` / `mouth`) |
| Feet anchor + plate scale | Specify **shared canvas size** for all Host PNGs (same W×H as base) |
| Z-layer + ownership maps | Keep Host under kiosk hits |
| Visual state ≠ voice state | Add dormant work states: e.g. `idle`, `thinking`, `researching`, `listening`, `speaking` — only `idle` used in V1 |
| Dual-pass cert rule | Artist brief already notes contain vs cover |

**Improvements before implementation begins (planning, not code now):**

1. Add `LobbyHostVisualState` including future work states tied to Product Principle (researching / thinking = Problem Solver work, not “AI chat face”).  
2. Require identical pixel dimensions for every Host layer file.  
3. Keep tablet on V1 base; schedule first **overlay** package when a real behavior needs it.  
4. Never let conversation or voice own Host drawing.

No need to invent a second character system or Spine/Live2D for V1–V2.

---

## 8. Responsive: desktop and Samsung/mobile

| Surface | Architecture fit |
|---------|------------------|
| Desktop contain | Feet anchor + Host inside plate canvas — **supported** |
| Samsung/mobile cover | Same native feet + cover mapping — **supported** if V1 art leaves safe margin and Tagia decides show vs crop vs hide |
| Dual-pass rule | **Mandatory** — neither complete until both pass |
| Risk | Tall mobile crop may clip feet/face — mitigate with composition + Tagia mobile visibility decision, not a second baked Host |

Host Layer does not need a separate mobile character architecture if registration and dual-pass certification hold.

---

## Recommendation summary

| Principle | Choice |
|-----------|--------|
| V1 runtime art | Environment + base + eyes only (unchanged) |
| V1 motion | Breathe + blink + reduced-motion |
| Future flexibility | **Layered editable master** (primary) + runtime slots + dormant work states |
| Expensive-if-late | Fusing master flat; missing eyes/feet/z-order/dual-pass |
| Wait (runtime) | Gaze, hands, typing, speaking visuals, celebration, mouth sheets |
| Product truth | Host = visible professional; Problem Solver / Help / Owner Console = invisible systems |

**Status:** Accepted with Tagia correction 2026-07-18 — code slots alone do not prevent rebuild; layered master is mandatory.

**Next:** Asset generation brief (updated) → create clean Lobby + Host artwork → feet pin → Scout implementation plan → code.

---

## Labels

| Conclusion | Label |
|------------|--------|
| V1 runtime stays base + eyes | Locked contract + this review |
| Layered editable Host master required | **Tagia correction — accepted** |
| Feet anchor, Host Layer name, dual-pass | Locked contract |
| Runtime slots without master are insufficient | **Tagia correction — accepted** |
| Tablet on flattened V1 base OK; separate in master | **Tagia correction — accepted** |
| Mouth / celebration wait (runtime) | Scout recommendation |
| Dormant work visual states | Scout recommendation |
| Mobile Host visibility | Tagia decision (existing) |
