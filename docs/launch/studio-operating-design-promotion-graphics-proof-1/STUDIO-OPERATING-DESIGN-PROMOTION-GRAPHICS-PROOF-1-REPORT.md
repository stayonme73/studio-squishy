# STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-PROOF-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-PROOF-1  
**Mode:** Proof only — no primaryTool remap · no dispatch hook · no Canva · no Make · no sealed-lane edits  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## Verdict

### PROMOTION-GRAPHICS RENDERER PROOF PASS

Technical proof earned for:

1. **First square plate** — `cert-square-1024` at **1024×1024** (this proof only; not a universal square license)  
2. **First coordinated two-asset campaign set** — square social + portrait print under one shared campaign identity, whole-set versioning, set-level fail-closed QA  

**Operating caveat (not papered over):** live intake still lacks authoritative structured purpose/use for Asset A and Asset B. This proof uses **explicit fixture per-asset purpose truth**. Renderer may be proven while the live operating lane remains blocked on that upstream gap — **do not authorize DISPATCH-HOOK until intake truth exists** (and Owner visual gate passes).

**Owner/Manager visual gate:** required on the pair below before any migration. Technical PASS ≠ dispatch authorization.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `fce3c289dae50e5ff64ded8eb25a3cc4662c1961` |
| Accepted delta | PROMOTION-GRAPHICS DELTA B — SMALL EXTENSION |
| Candidate SKU | `v2-rtu-promotion-graphics` |
| Executor during proof | **Canva** (unchanged) |

---

## 2. Authoritative contract (preserved)

| Topic | Truth |
|-------|--------|
| Graphics | Exactly **2**, both required |
| Campaign | One campaign / theme |
| Format/use | One agreed format/use **per graphic** |
| Captions | None |
| Outputs | PNG + PDF per asset |
| Dimensions | No invented platform sizes; CERT evidence square+portrait used as proof plates |
| primaryTool | Remains Canva |

---

## 3. Files changed (uncommitted)

| Path | Role |
|------|------|
| `promo-types.ts` | Campaign-set + per-asset truth/spec/identity |
| `promo-contracts.ts` | Exact-2 contract; square/portrait plate ids; intake gap flag |
| `promo-fixtures.ts` | Harbor fixture with **explicit** Asset A/B purposes + live-gap string |
| `promo-reason.ts` | Deterministic square vs portrait layouts (related, not cloned) |
| `promo-validate.ts` | Spec/plate/purpose validation |
| `promo-render-html.ts` | Per-asset HTML |
| `promo-bind.ts` | Whole-set `vN` identity + nested asset hashes |
| `promo-set-qa.ts` | Set consistency (offer/price/purpose/layout distinctness) |
| `promo-pipeline.ts` | Dual capture → per-asset + set QA → durable identity |
| `promotion-graphics-proof.test.ts` | Proof + fail-closed + sealed-lane regressions |
| `index.ts` | Additive exports only |
| This report + `artifacts/.../renders/v3/` | Visual evidence |

**Not changed:** flyer/card/menu/service-sheet production lanes · `sku-overrides` primaryTool · dispatch/observer · Canva/Make wiring · live intake schemas.

---

## 4. Campaign-set model

```
campaignSet vN
├── sharedCampaign (offer, price, dates, CTA, brand, materials)
├── asset A: spring-tuneup-social-square
│   ├── purpose: Social feed placement (square)   ← fixture-authorized
│   ├── plate: cert-square-1024 (1024×1024)
│   └── layoutVariant: compact_square
└── asset B: spring-tuneup-print-portrait
    ├── purpose: Print / in-store poster (portrait) ← fixture-authorized
    ├── plate: cert-portrait-1024x1536 (1024×1536)
    └── layoutVariant: tall_portrait
```

Exactly two assets. No N-asset pack engine.

---

## 5. Shared vs per-asset truth

| Set-level | Asset-level |
|-----------|-------------|
| Business / wordmark / offer / price / dates / phone / web / CTA | `assetId` |
| Brand colors + logo materials | `authorizedPurpose` |
| Shared campaign fingerprint | Agreed plate + canvas |
| Set QA / multi-asset consistency | Layout variant + layers |
| Whole-set render version | Per-asset PNG/PDF/HTML + hashes + individual QA |

---

## 6. Square-plate proof

| Field | Value |
|-------|--------|
| plateId | `cert-square-1024` |
| Dimensions | **1024 × 1024** |
| Asset | `spring-tuneup-social-square` |
| Scope | **Only this plate** is proven — not all square sizes |

---

## 7. Portrait reuse

| Field | Value |
|-------|--------|
| plateId | `cert-portrait-1024x1536` |
| Dimensions | **1024 × 1536** |
| Asset | `spring-tuneup-print-portrait` |
| Sealed lanes | Flyer/menu/service-sheet portrait behavior **unchanged** |

---

## 8. Per-asset purpose binding

| Asset ID | Authorized purpose (fixture) | Plate |
|----------|------------------------------|-------|
| `spring-tuneup-social-square` | Social feed placement (square) | 1024×1024 |
| `spring-tuneup-print-portrait` | Print / in-store poster (portrait) | 1024×1536 |

Purposes are **explicit on project truth** — not guessed from a single job-level `intendedUse`. Purpose text is rendered on each asset for auditability.

---

## 9. Multi-asset rendering

Both assets rendered via Playwright (`captureFlyerExports` with per-asset W×H). Overflow none. Distinct layout fingerprints (left-band square vs centered portrait with left accent bar).

---

## 10. Artifact identities / hashes (visual control = **v3**)

| Field | Value |
|-------|--------|
| campaignSetRenderVersion | **3** |
| sharedSpecFingerprint | `006d3e7f89b6cf628b7e8e767926335beeea106be6833e4d89548eaa4f57eeb3` |
| materialFingerprint | `2a5490ae9ea5aa0336a33e4fbfacd8d905f1567bd226bd6755ae1d46bfb22b34` |
| Asset A PNG sha256 | `4f63af83ece3f9470773be60afa1ee0e5bb64246ac9fc0b45c26e23a7f8d3bfc` |
| Asset B PNG sha256 | `3c1b1d8b89a51668e9949a92d3b5631623e4e68997bb33ebed54421d6de51d65` |

Paths:

- `docs/launch/studio-operating-design-promotion-graphics-proof-1/artifacts/v2-rtu-promotion-graphics/renders/v3/spring-tuneup-social-square.png`
- `docs/launch/studio-operating-design-promotion-graphics-proof-1/artifacts/v2-rtu-promotion-graphics/renders/v3/spring-tuneup-print-portrait.png`
- Matching PDFs alongside; `current-identity.json` → v3

---

## 11. Whole-set versioning

Proven: both assets share the same `campaignSetRenderVersion`; re-run creates immutable `vN+1` with both assets; prior pair retained. No independent single-asset mutation inside a completed set version.

---

## 12. Individual QA + set-level QA

| Gate | Result |
|------|--------|
| Design-quality (2 artifacts, multi-asset consistency, campaign truth) | PASS |
| Per-asset overflow | PASS |
| Set consistency (offer/price/purpose/distinct layouts) | PASS |
| File existence alone | Insufficient — gated |

---

## 13. Partial-failure behavior

| Case | Result |
|------|--------|
| forceQaFail | `QA_FAILURE` · set not production-ready |
| Asset B export forced fail after A | `PARTIAL_SET_FAILURE` |
| Set consistency forced fail | `SET_CONSISTENCY_FAILURE` |
| Missing A/B purpose | `MISSING_REQUIRED_TRUTH` |
| Invalid plate dims | `INVALID_PLATE` |
| Missing logo | `MISSING_REQUIRED_MATERIAL` |

---

## 14. Actual visual evidence

Owner/Manager should inspect **both** PNGs together (v3):

| Asset | Role | Layout adaptation |
|-------|------|-------------------|
| Square | Social | Top navy purpose band; left logo+wordmark; left-stacked offer/price/CTA |
| Portrait | Print | Left accent bar; centered logo; flyer-like vertical hierarchy + body |

Shared: Harbor & Oak mark, Spring Tune-Up + Drain Clear, $189, March 10 – April 15, 2026, phone, CTA — **related, not cloned**.

---

## 15. Live-intake gap (explicit)

**What live intake/data change is required?**

Current `rtu-promotion-graphics` intake provides:

- one job-level `intendedUse` (Print | Social | Email | In-store | Other)  
- optional `sizeNotes`

It does **not** capture authoritative structured:

- `authorizedPurpose` for graphic 1  
- `authorizedPurpose` for graphic 2  
- agreed plate/size for each graphic  

**Exact future change (not implemented here):** intake (or Campaign Record mapping) must record **per-graphic** `authorizedPurpose` + agreed plate/size for each of the two required graphics before Owner-independent auto-production can be honest.

Until then: **operating lane blocked** even though renderer proof PASSes.

---

## 16. Owner-independence

Routine production target: **Owner action = NONE** (layouts reasoned + rendered by Machine from truth).  
Tagia must not resize, duplicate/edit, group files, operate Canva, or hand-repair consistency for routine jobs.

---

## 17. Canva / Make status

| Item | Status |
|------|--------|
| Canva used to produce proof | **No** |
| `primaryTool` | **Still Canva** (unchanged) |
| Make | **NOT REQUIRED NOW** |
| Machine coordination | Dual bounded captures + set identity |

---

## 18. Sealed-lane protection

Regressions green in the same suite:

- flyer proof  
- business-card proof  
- menu proof  
- service-sheet proof  

Additive `promo-*` modules only.

---

## 19. Tests / result

```
promotion-graphics-proof.test.ts — 16 PASS
  (incl. square+portrait full proof, whole-set versioning,
   partial/QA/set fail-closed, Canva primaryTool retained,
   live-intake gap documented, four sealed-lane regressions)
```

---

## 20. Proof verdict

### PROMOTION-GRAPHICS RENDERER PROOF PASS

With mandatory sequencing:

1. Owner/Manager **visual** review of the v3 pair  
2. Close **live per-asset purpose intake truth** before any DISPATCH-HOOK  
3. Only then consider executor remapping  

---

## 21. Git state

| Field | Value |
|-------|--------|
| HEAD | `fce3c289dae50e5ff64ded8eb25a3cc4662c1961` |
| Branch | `operating/design-renderer-proof-1` |
| This package | Uncommitted proof stack under `src/lib/studio-design-renderer/promo-*` + docs artifacts |
| Commit | **None** |
| Push | **None** |
| Merge | **None** |

---

## 22. Exactly one recommended next step

**Owner/Manager visual review of the v3 campaign-set pair** (square + portrait together).

If visual is accepted: next Scout package must be **`STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-INTAKE-TRUTH-1`** (authoritative per-asset purpose + plate for live path) — **not** DISPATCH-HOOK — until that gap is closed.

---

## Scout

**PARKED.**
