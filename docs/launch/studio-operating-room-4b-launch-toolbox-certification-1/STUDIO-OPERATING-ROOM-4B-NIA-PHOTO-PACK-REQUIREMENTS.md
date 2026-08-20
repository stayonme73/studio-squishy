# Nia photo pack — exact requirements for live certification

**Package gate:** `READY FOR NIA PHOTO LIVE CERTIFICATION`  
**Build tip:** `791e302` · note `5ed295e`  
**Mode:** Requirements only — **no implementation in this park**  
**4B:** OPEN · No merge · No Room 5 · No vendor trial

This is what Manager/Owner must supply (or create as a controlled fictional set) before Scout runs the real photo-led live certification.

---

## 1. How many files

**7 files total**

| # | Asset ID | Role | Subject (from fixture) |
|---|----------|------|------------------------|
| 1 | `nia-logo` | Logo | Rooted & Ready wordmark |
| 2 | `nia-photo-good-1` | Hero (default primary) | **Nia by the studio window** — revision target |
| 3 | `nia-photo-good-2` | Good alternate / standing | Standing portrait or group stretch (calm, 30s–50s) |
| 4 | `nia-photo-good-3` | Support lifestyle | Tea/journal flat-lay or similar wellness still |
| 5 | `nia-photo-good-4` | Support environment | Studio exterior / entrance, soft morning light |
| 6 | `nia-photo-mediocre-1` | Deliberately weak | Dim hallway selfie — must **not** win as primary |
| 7 | `nia-photo-mediocre-2` | Deliberately weak | Cluttered desk — support-only failure case |

Controlled fictional photography is **preferred** (reproducible; no real customer PII in permanent cert records).

Direction lock (unchanged): calm, grown-up wellness; **no neon**; **no before/after body imagery**.

---

## 2. Accepted formats

| Asset | Accepted | Preferred |
|-------|----------|-----------|
| Photos (`nia-photo-*`) | `.jpg` / `.jpeg`, `.png`, `.webp` | **`.jpg`** |
| Logo (`nia-logo`) | `.svg`, `.png` | **`.svg`** (transparent) or **`.png` with alpha** |

Not accepted for this gate: HEIC, TIFF, PSD, PDF-as-photo, CapCut exports as stills.

---

## 3. Minimum dimensions (hard)

Visual Prep rejects images whose **shortest edge is below 800px** (`below_min_edge`).

| Asset | Minimum | Recommended |
|-------|---------|-------------|
| All four “good” photos | **≥ 800px on shortest edge** | **≥ 1600px** shortest edge; **≥ 2000px** longest preferred |
| Mediocre photos | May be smaller/weaker on purpose, but still **≥ 800px** shortest if you want them to pass *ingest* and fail *creative* selection — or supply ≥800px but poor composition so Machine can refuse them as hero |
| Logo | SVG viewBox or PNG **≥ 256×256** | SVG wordmark ~512–1024 wide |

Target render canvases the photos must survive crop into:

| Format | Canvas |
|--------|--------|
| Square social | **1080 × 1080** |
| Vertical social | **1080 × 1920** |
| Print handout | **1024 × 1536** |

---

## 4. Preferred aspect ratios

| Asset ID | Preferred orientation | Why |
|----------|----------------------|-----|
| `nia-photo-good-1` (window) | **Portrait** (~3:4 or 2:3) | Default hero; full-bleed family favors portrait |
| `nia-photo-good-2` (standing / group) | **Portrait** | Alternate hero for revision swap |
| `nia-photo-good-3` (flat-lay) | Landscape or square OK | Support; may push `image_panel` if used as primary |
| `nia-photo-good-4` (exterior) | Landscape OK | Environment support |
| Mediocre | Any | Intentionally bad crop/light/composition |

Leave **headroom** around faces/subjects — prep uses a center-biased focal box; subjects hard against the frame edge may crop poorly.

---

## 5. Logo specifics

- **Preferred:** SVG wordmark, transparent background, botanical/calm mark matching “Rooted & Ready Wellness Studio.”
- **Also OK:** PNG with transparency (`RGBA`).
- **Avoid:** Logo baked onto a busy photo; neon; low-contrast gray-on-gray.
- Placed with `object-fit: contain` inside a white logo plate — transparent SVG/PNG reads cleanest.

---

## 6. Exact placement / binding in the repo

Create this folder (new; not present until you drop files):

```
docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/nia-photo-pack/
```

**Exact filenames (must match):**

```
nia-photo-pack/
  nia-logo.svg                          # or nia-logo.png
  nia-photo-good-1.jpg                  # window portrait
  nia-photo-good-2.jpg                  # standing / group
  nia-photo-good-3.jpg                  # lifestyle
  nia-photo-good-4.jpg                  # environment
  nia-photo-mediocre-1.jpg
  nia-photo-mediocre-2.jpg
  MANIFEST.md                           # optional: one-line note per file origin (fictional pack OK)
```

If logo is PNG instead of SVG, use `nia-logo.png` (same asset ID `nia-logo`).

**Do not** rename asset IDs. Pipeline binds:

| Asset ID | Expected relative path |
|----------|------------------------|
| `nia-logo` | `…/nia-photo-pack/nia-logo.svg` (or `.png`) |
| `nia-photo-good-1` | `…/nia-photo-pack/nia-photo-good-1.jpg` |
| `nia-photo-good-2` | `…/nia-photo-pack/nia-photo-good-2.jpg` |
| `nia-photo-good-3` | `…/nia-photo-pack/nia-photo-good-3.jpg` |
| `nia-photo-good-4` | `…/nia-photo-pack/nia-photo-good-4.jpg` |
| `nia-photo-mediocre-1` | `…/nia-photo-pack/nia-photo-mediocre-1.jpg` |
| `nia-photo-mediocre-2` | `…/nia-photo-pack/nia-photo-mediocre-2.jpg` |

Full repo-relative prefix:

`docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/nia-photo-pack/`

---

## 7. Live-certification run plan (after pack lands)

Scout runs **one coherent live-cert package** (not more architecture). Planned beats:

1. **Bind** the seven files to the asset IDs above.  
2. **Primary run** — hero = `nia-photo-good-1` (window):  
   - Visual Prep crop/derivatives  
   - Recipe + hero selection  
   - Render **square** · **vertical** · **print**  
   - Collision / leak / overflow QA  
3. **Revision run** — “Use the window photo…” is already default; for swap proof: start from `nia-photo-good-2`, revise **to** `nia-photo-good-1`, keep CampaignVisualSystem / style.  
4. **Failure sample** (optional beat): attempt mediocre as primary → expect unusable or creative rejection path, not silent sell.  
5. **Emit inspectable artifacts** under something like:

```
docs/launch/.../nia-photo-live-cert/
  v1/
    social_square.png
    social_vertical.png
    print_handout.png
    print_handout.pdf
  v2-revision-window/
    social_square.png
    social_vertical.png
    print_handout.png
    …
  design-spec.json / artifact-identity.json
```

6. **Stop for creative-director inspection** — real PNGs/PDF, not a dashboard.  
   Question: *Would The Studio confidently charge Nia for this exact campaign?*

---

## 8. What Scout will **not** do until the pack exists

- No more coding for this gate  
- No fake live-cert with synthetic gradients  
- No Canva / Adobe / Placid  
- No merge · No Room 5  

---

## PARK

**Waiting on Owner/Manager:** drop the 7 files into `nia-photo-pack/` with the names above.

Then authorize: **Nia photo-led live certification run** → Scout produces the real art for yay/nay.
