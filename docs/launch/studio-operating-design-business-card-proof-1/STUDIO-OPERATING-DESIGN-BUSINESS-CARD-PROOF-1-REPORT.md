# STUDIO-OPERATING-DESIGN-BUSINESS-CARD-PROOF-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-BUSINESS-CARD-PROOF-1  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## Proof verdict

# BUSINESS CARD RENDERER PROOF PASS

Double-sided Owner-independent production proven on the sealed flyer renderer architecture with bounded DELTA B extensions only. Dispatch `primaryTool` for `v2-rtu-business-card` remains **`canva`** (not retargeted).

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `4a48c9893174b05db65083ccad630852c2d0713f` |
| Accepted delta | **DELTA B — SMALL EXTENSION** |
| Sealed flyer control | V2-RTU-FLYER OWNER-INDEPENDENT AUTO-PRODUCTION READY |
| Candidate SKU | `v2-rtu-business-card` |

---

## 2. Business-card contract

Preserved from catalog / intake / kitchen authority:

| Promise | Honored |
|---------|---------|
| Double-sided design | **Yes — front + back both rendered, hashed, QA-bound** |
| One agreed size | CERT plate **1536×1024** landscape (see §5) |
| Print-ready PDF | Flattened multi-page PDF (front then back) |
| Digital PNG preview | Front PNG + back PNG (JPG not required; PNG satisfies “PNG or JPG”) |
| Design only / customer prints | Explicit print-promise note on identity |
| Required intake fields | businessName, personName, phone, email, logo — fail closed |
| Optional fields | title, web, address, backDescriptor — omitted when absent; **no fake placeholders** |
| No bleed / trim / CMYK / DPI prepress | **Not added** |

---

## 3. Files changed (uncommitted)

**Additive only** under `src/lib/studio-design-renderer/`:

| File | Role |
|------|------|
| `card-types.ts` | Bounded card spec + dual-side identity types |
| `card-contracts.ts` | Contract surface + print-promise honesty |
| `card-fixtures.ts` | Harbor CERT fixture truth (double-sided) |
| `card-reason.ts` | Deterministic front/back reasoner |
| `card-validate.ts` | Fail-closed dual-side validation |
| `card-render-html.ts` | Per-side HTML + two-page print HTML |
| `card-capture.ts` | Playwright front/back PNG + multi-page PDF |
| `card-bind.ts` | Dual-side hashes + immutable vN persist |
| `card-pipeline.ts` | End-to-end proof/job pipeline |
| `business-card-proof.test.ts` | Proof + flyer protection tests |
| `index.ts` | Additive exports only |

**Artifacts:** `docs/launch/studio-operating-design-business-card-proof-1/` (report + renders)

**Not changed:** flyer pipeline/types/validate/reason/capture/hook/observer/idempotency; `sku-overrides` business-card `primaryTool` (still Canva).

---

## 4. Design-spec extension

`business-card-design-spec-1.0.0` with:

- Shared landscape canvas
- Distinct `front` / `back` side specs
- Card text roles: wordmark, person_name, title, phone, email, web, address, descriptor
- Shared materials + outputFormats `png` + `pdf`

Flyer `FlyerDesignSpec` / `flyer-design-spec-1.0.0` **unchanged**.

---

## 5. Landscape support

| Topic | Truth |
|-------|--------|
| Machine canvas | **1536 × 1024** landscape |
| Source | CERT-DESIGN plate (`CARD_LANDSCAPE`) |
| Physical-size semantics | Catalog = “one agreed size” without fixed inches. This proof locks the CERT **pixel plate** for preview/PDF — **not** a claim of physical trim inches, bleed, or press color. |

No additional card sizes invented.

---

## 6. Front/back rendering

| Side | Path (PASS v1) | Distinct |
|------|----------------|----------|
| Front | `.../renders/v1/front.png` | Contact identity layout |
| Back | `.../renders/v1/back.png` | Brand plate + wordmark + descriptor/URL |
| PDF | `.../renders/v1/business-card.pdf` | ≥2 `/Type /Page` objects (front then back) |

Each side has stable `side` id, exact dimensions, artifact path, SHA-256. Front hash ≠ back hash.

**Historical CERT one-face gap is corrected for this Machine proof.**

---

## 7. Content mapping

Harbor CERT fixture (not a live customer):

- Front: Harbor & Oak, Jordan Hale, Service Coordinator, phone, email, web, metro address  
- Back: logo, wordmark, approved backDescriptor, web  
- Customer mode: fixture-leak patterns rejected; missing required truth → `MISSING_REQUIRED_TRUTH`

---

## 8. Materials binding

Approved Harbor logo SVG under card materials path; content hash bound on both faces. Missing/broken material → fail closed.

---

## 9. Artifact outputs (Owner-inspectable PASS = v1)

| Artifact | Relative path |
|----------|----------------|
| Front preview | `docs/launch/studio-operating-design-business-card-proof-1/artifacts/v2-rtu-business-card/renders/v1/front.png` |
| Back preview | `docs/launch/studio-operating-design-business-card-proof-1/artifacts/v2-rtu-business-card/renders/v1/back.png` |
| PDF | `docs/launch/studio-operating-design-business-card-proof-1/artifacts/v2-rtu-business-card/renders/v1/business-card.pdf` |
| Design spec | `.../renders/v1/design-spec.json` |
| Identity | `.../renders/v1/artifact-identity.json` |
| QA | `.../renders/v1/card.design-qa.json` |

`renders/v2` retained as forced-QA-fail lineage (not PASS evidence).

---

## 10. Artifact identity / hashes (v1 PASS)

| Field | Value |
|-------|--------|
| Dimensions | 1536 × 1024 |
| Front SHA-256 | `9994798e4994843bf4edfd6fa9e4313232cd979338d0980847333a0a3b9ff199` |
| Back SHA-256 | `263f487aba0ae14d48a141e0eb07d88a39467e8da6295b8ad61f2f2ad824c10c` |
| PDF SHA-256 | `001de0c2e3c814239443d388bc353d37cfc255d6e8bdaaaba567fbe4ff5076c0` |
| Design-spec fingerprint | `04f2ef9ee15e57d9705c1bac77774304257c72b962655e0d79e2d9ab0e2fdd7f` |
| Material fingerprint | `2a5490ae9ea5aa0336a33e4fbfacd8d905f1567bd226bd6755ae1d46bfb22b34` |
| Renderer version | `design-renderer-business-card-proof-1.0.0` |

Bound: campaignId, jobId, skuId, fingerprints, renderVersion, both side hashes, PDF hash, QA result.

---

## 11. Card QA

Both sides submitted to design-quality gate (`minAssets: 2`, landscape dims, contact semantics, logo binding, overflow per side). Forced QA fail → `QA_FAILURE` blocks PASS. Files existing alone is insufficient.

---

## 12. Print-promise honesty

**Repository meaning of “print-ready PDF” for this SKU:** flattened multi-page PDF at CERT plate pixels for **customer-managed** print.

**Not claimed:** bleed, trim marks, CMYK, DPI certification, Studio print/ship.

Identity carries `printPromiseNote` stating this boundary. Menu wording not expanded in this package.

---

## 13. Versioning / idempotency

Same principles as flyer: immutable `renders/vN`; fingerprint stable for identical truth; changed truth → new version. Flyer idempotency model **not weakened**. Dispatch-level card idempotency deferred until post-acceptance hook migration.

---

## 14. Actual visual evidence

Owner/Manager can open **v1 front.png** and **v1 back.png** side-by-side. Front = contact identity; back = brand face. Owner did not create or edit either surface.

---

## 15. Owner-independence

Routine Owner production = **NONE**. Tagia did not design, position, export via Canva, or manually copy delivery files.

---

## 16. Canva status

**Not used** for this proof. Card dispatch `primaryTool` still `canva` until a future authorized migration.

---

## 17. Make status

**NOT REQUIRED NOW** — unused.

---

## 18. Flyer regression / protection

| Check | Result |
|-------|--------|
| Flyer proof test suite | **10/10 PASS** |
| Flyer canvas remains 1024×1536 | PASS |
| Flyer hook / observer / idempotency | **18/18 PASS** |
| Flyer schema behavior | Untouched |

---

## 19. Tests / result

```
business-card-proof.test.ts — 10 PASS
design-renderer-proof.test.ts — 10 PASS
design-renderer-hook.test.ts — 5 PASS
design-renderer-observer.test.ts — 5 PASS
hook-idempotency.test.ts — 8 PASS
```

**38/38 PASS** (scoped proof + flyer/dispatch protection)

---

## 20. Proof verdict

# BUSINESS CARD RENDERER PROOF PASS

---

## 21. Git state

| Check | Value |
|-------|--------|
| HEAD | `4a48c9893174b05db65083ccad630852c2d0713f` (unchanged control) |
| Commit / push / merge | **NONE** |
| Worktree | Uncommitted proof files present (expected) |

---

## 22. Exactly one recommended next step

**Owner/Manager visually inspect v1 front + back + PDF, then authorize a thin dispatch migration package that retargets only `v2-rtu-business-card.primaryTool` → `studio_design_renderer` and adds a card-only observer/hook path — without touching the sealed flyer lane or any other design SKU.**

Suggested name: `STUDIO-OPERATING-DESIGN-BUSINESS-CARD-DISPATCH-HOOK-1`

---

**Scout PARKED**
