# Studio Lobby (Room 1) — LOCKED

| Field | Value |
|---|---|
| Room | Studio Lobby |
| Status | **LOCKED — Environment production plate (2026-07-18)** |
| Owner | Tagia |
| Date | 2026-07-18 — Podium-final environment approved for implementation |
| Prior | 2026-07-17 Host-baked plate (superseded for environment) |

**OWNER LOCK (2026-07-18):** This image is the locked Studio Lobby **environment** for implementation. No further visual redesigns unless a genuine production issue is discovered. Wire it into the Studio; do not continue redesign.

**This is a production preparation / wiring package, not a design exercise.** The visual direction has already been approved.

---

## Approved visual baseline (environment)

**Production assets (same pixels):**

- `public/welcome-hall/studio-lobby-scene.png` (`?v=12`)
- `public/welcome-hall/studio-lobby-environment.png` (clean environment plate — Host not baked in)
- Reference copy: `docs/illustration/references/studio-lobby-baseline-image-1.png`

**Native size / aspect:** `1920 × 1080` (16:9) · `welcomeHallScene` in `src/config/welcome-hall-scene.ts` · cache `?v=12`

**Host floor:** Open polished floor between podium and desk is reserved for the separate Host Layer — do not fill that space with baked figures.

**Framing:** Desktop **cover** (full bleed) — no side bars. Minor top/bottom crop only if the browser window is not exactly 16:9. Podium stays prioritized with a slight vertical bias.

**Do not redesign or reinterpret.** Preserve:

- Overall room layout and architecture
- Windows and skyline
- Lighting and atmosphere
- Mural, couch, rug, coffee table, plants
- Business Discovery Studio room (as seen from Lobby)
- Shelving and décor, neon sign
- Colors and overall atmosphere
- **Podium** exactly as shown (see below)

**Customer experience (must remain):**

1. Enter the Studio.
2. Notice the Host (**Host Layer** — separate artwork; not baked into this plate).
3. Naturally notice the podium.
4. Interact with the podium to begin.

**Success criteria:** A first-time visitor should immediately understand:  
*"I'm in a professional business Studio, and my journey begins at the podium."*

---

## Podium (final — locked)

Implement the podium exactly as shown.

**Keep:** blue textured body; polished metal screen surround; dark display; warm edge lighting; steel sweep; shape/proportions; screen readability.

**Screen text (verbatim):**

```
Welcome!

Your creative journey
begins here.

LET'S GET STARTED
```

Keep **LET'S GET STARTED** large and highly readable.

**Do not add:** company logo, placeholder logo, arrow, extra graphics, additional branding.

**Runtime (V1):** Transparent hit zone over the full baked podium (desktop + mobile). Optional hesitation voice guidance after ~8s on a first visit only — see `docs/studio-guidance-doctrine-v1-locked.md`. Temporary system/AI voice is functional proof only; final Studio voice is **Deferred** (not a Lobby foundation blocker). No arrows, hosts, mascots, or painted cues on the plate.

---

## Locked elements (do not redesign)

- Studio environment architecture
- Mural
- Podium proportions, placement, and screen copy
- Business Discovery Studio entrance (Lobby view)
- Meeting / consultation room as seen through glass (Lobby view only — dedicated room plate is separate)
- Table and workspace (foreground desk)
- Skyline
- Overall room composition
- Premium lighting

**Large presentation screen asset:** Dedicated consultation room only — **not** cut from this Lobby plate.

**Studio Host:** Identity locked in [`studio-host-character-standard-v1-locked.md`](studio-host-character-standard-v1-locked.md). Runtime presence via Host Layer (environment separation contract) — not painted into this plate.

**HTML greeting balloon:** Off (`squishyGreetingOverlayEnabled: false`). Podium screen carries the welcome. Mobile dock copy aligns with podium lines.

---

## Responsive implementation

**Do not attempt pixel-perfect recreation.**

- Preserve the experience and hierarchy
- Adapt for desktop contain + soft bleed; mobile cover crop
- **Desktop and Samsung certify together**

**Blurred side panels:** Not used as dominant framing. 16:9 plate + contain keeps the real Studio full-bleed on standard desktops.

---

## Related contracts

- Environment separation: [`studio-lobby-environment-separation-inspection-v1.md`](studio-lobby-environment-separation-inspection-v1.md)
- Asset generation: [`studio-lobby-environment-host-asset-generation-v1.md`](studio-lobby-environment-host-asset-generation-v1.md)
- Host behavior / layered master: [`studio-host-behavior-asset-architecture-review-v1.md`](studio-host-behavior-asset-architecture-review-v1.md)

---

## Next (after this environment lock)

1. ~~Production Host assets~~ — Pose v1.0 base + eyes open/closed in `public/welcome-hall/`
2. **Host Layer placement** — feet pin provisional `(820, 1010)` on 1920×1080; review desktop + Samsung (`/?debug=1`)
3. Blink + breathe (after placement earns lock)
4. Dual-pass certification

No commit/push implied by this lock unless Tagia requests it.
