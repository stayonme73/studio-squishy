# STUDIO-OPERATING-ROOM-4B-MACHINE-NATIVE-PHOTO-LED-CAMPAIGN-PRODUCTION-BUILD-1 REPORT

**Package:** `STUDIO-OPERATING-ROOM-4B-MACHINE-NATIVE-PHOTO-LED-CAMPAIGN-PRODUCTION-BUILD-1`  
**Manager decision:** **A. BUILD MACHINE-NATIVE — ACCEPTED**  
**Prior design tip:** `c4deabb` · note `020dbe9`  
**This tip:** `791e302` (pushed; synced with `origin/operating/design-renderer-proof-1`)  
**4B:** REMAINS OPEN  
**Stop state:** **READY FOR NIA PHOTO LIVE CERTIFICATION**  
**Owner input:** **NIA PHOTO PACK** (required before live visual cert)  
**No purchase · No vendor trial · No merge · No Room 5**

---

## Verdict

Machine-native photo-led production layer is **implemented and automated-tested** with synthetic proof assets.

It is **not** live-certified against Nia’s real photo pack.

**PARK:** `OWNER INPUT REQUIRED — NIA PHOTO PACK`  
Then: live visual gate — “Would we confidently charge Nia for this exact campaign?”

---

## Implemented architecture

```
CreativeBrief (Nia facts)
  → CampaignVisualSystem (rooted-ready-wellness-v1)
  → AssetAssessment + Visual Prep (sharp)
  → pickRecipeFamily + resolveHero
  → LayoutRecipe (full_bleed | split | image_panel) × 3 formats
  → CampaignCreativeSetSpec (hero-capable DesignSpec-like)
  → HTML render
  → Playwright capture (reuse captureFlyerExports)
  → Automated QA (collision, hero area, leak, format coherence)
  → versioned bind (renders/vN)
  → applyHeroPhotoRevision
```

**Module:** `src/lib/studio-campaign-creative/`  
**Sealed lanes untouched:** promo/social/flyer reasoners (logo-only / CERT) remain sealed.

---

## CampaignVisualSystem

`rooted-ready-wellness-v1` — machine-readable config (palette, typography roles, hero/image rules, logo rules, spacing, CTA, hierarchy, approved families).

Not CSS-only. Multiple formats consume the same system.

**Owner creative yay/nay** waits for real Nia art — not abstract approval.

---

## Visual Prep

`visual-prep.ts` (sharp — promoted to runtime `dependencies`):

- metadata / dimensions / orientation  
- usability gates  
- default focal region (provider socket reserved; not wired to vendors)  
- cover-crop around focal  
- format-sized JPEG derivatives  
- light contrast treatment  

**Not in this build:** background removal, generative expansion, object removal.

---

## Hero selection

- `FlyerImageRole` pattern mirrored as `CampaignImageRole: logo | hero | support`  
- Reasoner **always emits a dominant hero** (≥28% canvas area QA)  
- Hero chosen from `CreativeBrief.selectedAssetIds.primaryPhotoId`  
- Not a CERT thumbnail with a tiny photo sticker  

---

## Layout recipes

| Family | Intent |
|--------|--------|
| `full_bleed_hero` | Strong photo + overlay + headline/offer/CTA |
| `split_hero` | Photo region + structured content panel |
| `image_panel` | Large photo + side content panel |

Each × `social_square` / `social_vertical` / `print_handout`.

Deterministic family pick: portrait → full-bleed; landscape → image_panel; else split.

---

## Multi-format

One family across three formats (coordinates adapt; system/palette/CTA/hierarchy shared). QA requires exactly one shared `familyId`.

---

## Customer-copy isolation

`customer-safe.ts` reuses leak/chrome gates. Voice brief / Machine chrome fail closed. Automated coverage in set QA + reasoner emit.

---

## Collision / text safety

Reuses `evaluateTextLayerCollisions`. Min font floor. OOB checks. Overflow fail via Playwright metrics. Fail closed — no silent garbage.

---

## Reasoner behavior

`reasoningMode: "deterministic_constrained"` — chooses among approved recipes only. No LLM CSS/DOM freelancing.

---

## Revision preservation

`applyHeroPhotoRevision`: swap primary photo → keep system → re-prep → re-render → bump `vN` → material fingerprint must change.

Proven with synthetic portrait → alternate portrait (automated).

Nia’s live line remains: *“Use the photo where I’m standing by the window…”* → `nia-photo-good-1`.

---

## Automated totals

| Suite | Result |
|-------|--------|
| `campaign-creative.proof.test.ts` | **5/5 PASS** |
| Visual system load | PASS |
| Recipes 3×3 bounds | PASS |
| Visual prep assess/crop | PASS |
| Hero reasoner + leak reject | PASS |
| Pipeline 3-format render + revision | PASS (~5s Playwright) |

---

## Rendered implementation evidence

Synthetic proof assets only (gradients + logo SVG) — **not** Nia live cert.

Pipeline writes under test temp then cleans up. Pattern proven: 3 PNG (+ PDF path for print) + `design-spec.json` + `artifact-identity.json` per version.

---

## Owner dependence

| Activity | Required? |
|----------|-----------|
| Tagia in Canva/Photoshop per job | **No** |
| Routine crop/layout/export | **No — Machine** |
| Supply Nia photo pack (or controlled fictional pack) | **Yes — gate** |
| One-time yay/nay on first serious Nia campaign art | **Yes — after photos** |

---

## Real Nia binaries still required?

**YES.**

Fixture IDs still need binaries:

- `nia-logo`  
- `nia-photo-good-1` (window)  
- `nia-photo-good-2` (standing)  
- `nia-photo-good-3` (activity)  
- `nia-photo-good-4` (environment)  
- `nia-photo-mediocre-1`  
- `nia-photo-mediocre-2`  

Controlled fictional pack is acceptable and preferred for reproducible cert. Do not claim live cert on synthetic gradients.

---

## Remaining blockers

1. **OWNER INPUT — NIA PHOTO PACK**  
2. Live creative inspection (“would we charge?”)  
3. Optional later: local SubjectDetectionProvider if center/focal heuristic crops faces poorly  

Recommendation A is **not** disproven.

---

## PARK FOR MANAGER

**READY FOR NIA PHOTO LIVE CERTIFICATION**

No next package. No Room 5. No merge. No purchase. No vendor trial. Carousel stays off Launch Now.
