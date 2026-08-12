# STUDIO-OPERATING-DESIGN-SERVICE-SHEET-PROOF-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SERVICE-SHEET-PROOF-1  
**Mode:** Proof only — no primaryTool remap · no dispatch hook · no Canva · no Make · no sealed-lane edits  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## Verdict

### SERVICE-SHEET RENDERER PROOF PASS

**Owner/Manager visual verdict:** **PASS WITH LIMITS** (see `OWNER-DECISION.md`). Seal artifact pinned to `renders/v1/`.

`v2-rtu-service-sheet` renders on the sealed design-renderer spine with **SKU-gated optional pricing**. All three modes are truthful:

| Mode | Behavior proven |
|------|-----------------|
| `listed` | Exact customer price text |
| `contact_for_pricing` | Exact customer-authorized line only (fixture truth supplies wording — reasoner does not invent it) |
| `omitted` | **No** price cell · **no** filler |

Proof package historically left `primaryTool` on Canva; SERVICE-SHEET-DISPATCH-HOOK-1 / AUTO-PRODUCTION-1 remaps this SKU only to `studio_design_renderer`.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `a92947a156fee54a25916da5803c9224ba1ed350` |
| Accepted delta | SERVICE-SHEET DELTA B — SMALL EXTENSION |
| Sealed lanes protected | flyer · business-card · menu |

---

## 2. Service-sheet contract (authoritative)

| Topic | Truth |
|-------|--------|
| Max services | **10** |
| Page | Single portrait page |
| Canvas | **1024×1536** CERT |
| Outputs | Print-ready PDF + digital PNG (JPG allowed by contract; PNG produced) |
| Prices | Optional starting prices **or** customer “contact for pricing” line |
| Executor today | **Canva** (unchanged) |

---

## 3. Files changed (uncommitted)

| Path | Role |
|------|------|
| `service-sheet-types.ts` | Truth model + price modes |
| `service-sheet-contracts.ts` | Contract constants |
| `service-sheet-map-price.ts` | Customer-truth → mode mapping (no inference) |
| `service-sheet-fixtures.ts` | Harbor max fixture (10 rows, mixed modes) |
| `service-sheet-reason.ts` | Single-column comfortable packer |
| `service-sheet-validate.ts` | Spec validation |
| `service-sheet-render-html.ts` | HTML (same capture contract as menu) |
| `service-sheet-completeness.ts` | Completeness + pricing-mode QA |
| `service-sheet-bind.ts` | Identity / hashes / versions |
| `service-sheet-pipeline.ts` | End-to-end proof pipeline |
| `service-sheet-proof.test.ts` | Proof + fail-closed + regressions |
| `index.ts` | Exports |
| This report + artifacts under `docs/launch/.../service-sheet-proof-1/` | Evidence |

**Reuse:** `captureMenuExports` (Playwright overflow gate) · `MENU_CANVAS` / floor constants · CERT brief/QA gate.  
**Not reused as-is:** menu reasoner (requires a price on every row). Service-sheet packer is SKU-gated additive.

---

## 4. Service-sheet truth model

Per row:

- `serviceId`, `name` (required)
- `description?` (optional; never invent)
- `priceMode`: `listed` \| `contact_for_pricing` \| `omitted`
- `priceDisplay?`: exact customer text when listed/contact; **must be empty** when omitted

Sheet-level: `listHeading`, `contactDetails`, `legalDisclaimer`, logo materials.

**No general pricing engine.**

---

## 5. Pricing-mode implementation

| Rule | Enforcement |
|------|-------------|
| listed without text | Fail-closed |
| contact_for_pricing without text | Fail-closed |
| omitted with priceDisplay present | Fail-closed |
| Machine filler (TBD, $—, Call for price, …) | Fail-closed |
| contact language without authorized truth | Completeness fail |
| omitted → no `service_price` layer | Proven |

---

## 6. Customer-truth mapping

`mapServicePriceDisplayMode`:

| Customer input | Mode |
|----------------|------|
| starting price only | `listed` |
| contact-for-pricing wording only | `contact_for_pricing` |
| neither | `omitted` |
| both | **fail-closed** (ambiguous — no inference) |

Blank price never becomes “Contact for pricing.”

---

## 7. List-renderer reuse

| Capability | Approach |
|------------|----------|
| Portrait plate | Shared `SERVICE_SHEET_CANVAS` = menu/flyer CERT |
| Repeated rows / names / descriptions | SKU-gated packer (list spine ideas) |
| Overflow / font-floor capture | **`captureMenuExports`** reused |
| Design QA gate | Shared `gateDesignQualityForQaPass` |
| Menu required-price reasoner | **Not called** (would violate optional pricing) |

---

## 8. Maximum fixture

| Field | Value |
|-------|--------|
| Services | **10** |
| Listed | **7** |
| contact_for_pricing | **1** — wording in fixture truth: `Contact for pricing` |
| Omitted | **2** |
| Typography | **comfortable** (not menu max-density) |
| Layout | **single_column** |

---

## 9. Mixed-pricing behavior

Proven on one sheet:

- Numeric prices right-aligned and exact (`$189`, …)
- Authorized contact line right-aligned, muted, associated with Whole-Home Plumbing Assessment
- Omitted rows (Custom Remodel Coordination, Maintenance Membership Review) leave **empty** price column — no `$—` / TBD / invented contact

---

## 10. Artifact outputs / hashes

| Field | Value |
|-------|--------|
| PNG | `docs/launch/studio-operating-design-service-sheet-proof-1/artifacts/v2-rtu-service-sheet/renders/v1/service-sheet.png` |
| PDF | `.../renders/v1/service-sheet.pdf` |
| HTML | `.../renders/v1/service-sheet.html` |
| Dims | **1024×1536** |
| pngContentSha256 | `13849e85db7b79e3ae1f56fe6f4eec8fbb9be722dabfe11fea405062c5f6ff8d` |
| pdfContentSha256 | `8c79eb6e937948617c5ff268f2a5f465828521469d5eb0670f4926aa4f1fe12a` |
| designSpecFingerprint | `750098605e5d8954c4e59d836488530b2a95c15ccd639df85e09cf5f5accfd39` |
| materialFingerprint | `2a5490ae9ea5aa0336a33e4fbfacd8d905f1567bd226bd6755ae1d46bfb22b34` |
| overflow | `issues=none` |
| QA | PASS (`service-sheet.design-qa.json`) |

JPG: contract allows PNG **or** JPG; proof delivers PNG (+ PDF).

---

## 11. Visual evidence (Owner/Manager gate)

**Review file:** `renders/v1/service-sheet.png`

Observed in proof render:

- Clear service hierarchy; comfortable row spacing (upper body, intentional open lower field — not menu min-density)
- Mixed pricing readable; omitted rows look intentional (blank, not broken)
- Contact + disclaimer footer present
- Reads as a service sheet, not a recycled dense menu

**Owner visual acceptance is required before dispatch-hook authorization.**

---

## 12. Failure handling (proven)

| Case | Result |
|------|--------|
| >10 services | Fail-closed |
| Missing service name | Fail-closed |
| listed without text | Fail-closed |
| contact_for_pricing without text | Fail-closed |
| Invented contact language in layers | Completeness fail |
| Fixture leakage in customer mode | Fail-closed |
| Forced QA failure | Blocks PASS |
| Clipping/overflow | Capture gate (none on max fixture) |

---

## 13. Owner-independence / Canva / Make

| Item | Status |
|------|--------|
| Owner routine production | **NONE** |
| Canva used to produce proof | **false** |
| `primaryTool` for SKU | **still `canva`** |
| Make | **NOT REQUIRED NOW** / unused |

---

## 14. Flyer / card / menu protection

Regression tests in this package:

- flyer proof pipeline PASS  
- business-card proof pipeline PASS  
- menu proof pipeline PASS  

No sealed-lane spec/hook/observer/QA edits.

---

## 15. Tests / result

```
service-sheet-proof.test.ts — 15/15 PASS
```

---

## 16. Proof verdict

# SERVICE-SHEET RENDERER PROOF PASS

Technical + fail-closed + mixed-pricing honesty criteria met.  
**Dispatch / primaryTool remap: not authorized until Owner visual accept.**

---

## 17. Git state

| Field | Value |
|-------|--------|
| HEAD | `a92947a156fee54a25916da5803c9224ba1ed350` (control tip; worktree dirty with proof files) |
| Commit / push / merge | **None** |

---

## 18. Exactly one recommended next step

**Owner/Manager visual review of `renders/v1/service-sheet.png`.**  
If accepted (or accepted with limits), authorize **`STUDIO-OPERATING-DESIGN-SERVICE-SHEET-DISPATCH-HOOK-1`** for `v2-rtu-service-sheet` only — still no bulk migration.

---

**Scout PARKED**
