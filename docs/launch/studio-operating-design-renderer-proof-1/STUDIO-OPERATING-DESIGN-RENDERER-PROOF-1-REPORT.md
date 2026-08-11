# STUDIO-OPERATING-DESIGN-RENDERER-PROOF-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-RENDERER-PROOF-1  
**Branch:** `operating/design-renderer-proof-1`  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## 1. Starting control point

`f9a19c530d5be5dd2f6dfc7cc30692f8557bbaf7` (Dispatch seal tip)

Accepted upstream findings:

- `STUDIO-OPERATING-DESIGN-EXECUTOR-OWNER-INDEPENDENCE-1` → **REPLACE CANVA AS OPERATIONAL EXECUTOR**
- Canva account may remain; **not** on the launch fulfillment spine
- Make = **NOT REQUIRED NOW**

## 2. Proof SKU contract

| Field | Value |
|--------|--------|
| SKU | `v2-rtu-flyer` (Make Me a Flyer) |
| Promise preserved | One single-sided flyer, one size — print + digital |
| Formats required | **PNG + PDF** (contract: “One flyer — PDF + digital”) |
| Proof plate | **1024×1536** (CERT-DESIGN / design-quality plate; ±40) |
| Inputs | Harbor & Oak CERTIFICATION FIXTURE (safe demo) |
| Mechanism replaced | Canva GUI → design spec + HTML/CSS + Playwright |
| SKU weakened? | **No** |

## 3. Files changed

**New (this package):**

- `src/lib/studio-design-renderer/` — types, contracts, fixtures, validate-spec, reason, render-html, capture, bind, pipeline, tests, index
- `scripts/run-design-renderer-proof.ts`
- `docs/launch/studio-operating-design-renderer-proof-1/` — this report + artifacts

**Also present on branch (prior inspections; not recommitted):**

- `docs/launch/studio-operating-tool-coordination-1/`
- `docs/launch/studio-operating-canva-account-confirmation-1/`
- `docs/launch/studio-operating-design-executor-owner-independence-1/`
- `src/lib/studio-tool-coordination/`

**Not changed:** Kitchen certification rewrite, active menu, Review Room, remaining 12 design SKUs, Make, Canva integration.

## 4. Design specification model

`FlyerDesignSpec` (`flyer-design-spec-1.0.0`):

- Canvas dimensions, background, brand colors
- Layer types: `shape` · `text` (typed roles) · `image` (material-bound)
- Materials with path + SHA-256 + optional approved identity id
- `outputFormats: ["png","pdf"]`
- Reasoning mode recorded on the spec

HTML is a **render product**, not the creative source of truth. Spec JSON is persisted beside each render version.

## 5. AI reasoning path

| Mode | Status |
|------|--------|
| `deterministic_constrained` | **Used for proof artifact** — maps project truth → bounded spec (hierarchy, roles, layout) without Owner GUI |
| `anthropic_text_model` | **Implemented** (same Messages API pattern as `decision-learner/anthropic.ts`); validates against the same schema; **not exercised live** — `ANTHROPIC_API_KEY` absent in this environment |

Proof run set `DESIGN_RENDERER_PREFER_ANTHROPIC=0` for reproducibility. Creative reasoning and rendering remain separable. Tagia did not lay out the flyer.

## 6. Renderer implementation

1. Validate spec (fail-closed)
2. Render fixed-size HTML/CSS from spec + embedded material data-URIs
3. Playwright Chromium: viewport **1024×1536**, PNG clip screenshot, PDF at same page size
4. Persist versioned lineage under `renders/vN/`
5. Run design-quality gate + overflow check on the **actual PNG**

Not a Canva clone — flyer-only capability for this proof.

## 7. Artifact output

**Authoritative proof render:** `renders/v5/` (post-test clean proof script run)

| Artifact | Path |
|----------|------|
| PNG | `docs/launch/studio-operating-design-renderer-proof-1/artifacts/v2-rtu-flyer/renders/v5/flyer.png` |
| PDF | `…/renders/v5/flyer.pdf` |
| HTML | `…/renders/v5/flyer.html` |
| Spec | `…/renders/v5/design-spec.json` |
| Identity | `…/renders/v5/artifact-identity.json` |
| Design QA | `…/renders/v5/flyer.design-qa.json` |
| Logo material | `…/materials/harbor-oak-anchor-oak-oval-v1.svg` |

| Property | Value |
|----------|--------|
| Dimensions | **1024 × 1536** |
| Formats | PNG (~94 KB) + PDF (~112 KB) |
| Fixture label | CERTIFICATION FIXTURE / INTERNAL TEST |

Prior `v1`–`v4` folders retained on purpose (lineage / fail-closed QA exercise from tests).

## 8. Artifact identity / hash

From `current-identity.json` / `renders/v5/artifact-identity.json`:

| Field | Value |
|-------|--------|
| campaignId | `camp-design-renderer-proof-harbor-oak` |
| jobId | `camp-design-renderer-proof-harbor-oak::v2-rtu-flyer` |
| dispatchId | `dd:camp-design-renderer-proof-harbor-oak::v2-rtu-flyer` |
| skuId | `v2-rtu-flyer` |
| renderVersion | 5 |
| designSpecFingerprint | `3aea0f0f3c17541f97e4b785b9bbdd6dbbd0077ac3c7299dd909b00940a647e8` |
| materialFingerprint | `2a5490ae9ea5aa0336a33e4fbfacd8d905f1567bd226bd6755ae1d46bfb22b34` |
| rendererVersion | `design-renderer-proof-1.0.0` |
| **pngContentSha256** | `ea0aa2714d4f90f0618974edc3cb6efed925e0a19ac60f15f36a93dd239060ce` |
| **pdfContentSha256** | `0dca1e480b7335c076036f8b0f6e4528067cb17da08de4083e0cb690d708d104` |

`dd:{jobId}` shape is proven as identity binding for this proof only — **menu not globally repointed**.

## 9. Actual visual inspection

Scout inspected `renders/v5/flyer.png` (not tests alone).

Observed:

- Portrait plate fills frame; navy header/footer bars
- Centered oval mark (anchor + oak geometric stand-in for `harbor-oak-anchor-oak-oval-v1`)
- Wordmark **Harbor & Oak** · descriptor **Home Services**
- Headline → offer → **$189 (was $249)** → **March 10 – April 15, 2026**
- Body readable; CTA plate **Book online or call**
- Contact: phone `(804) 555-0142` · web `harborandoak.example/book-tuneup`
- Fixture disclaimer present; restrained trades palette; no hype claims
- No obvious clipping/overflow at 1024×1536

Owner may review the file; Owner did **not** create or edit it.

## 10. Design QA result

`gateDesignQualityForQaPass` on the bound PNG:

- Deterministic checks: **PASS** (0 findings)
- Overflow: **PASS** (`scroll=1024x1536 canvas=1024x1536`)
- Judgment attestations: applied with notes citing **sha256** + bound path
- Forced QA-fail test: **blocks readiness** (`QA_FAILURE`)

## 11. Failure handling

Explicit fail-closed codes proven in tests:

| Failure | Code |
|---------|------|
| Invalid design spec | `INVALID_DESIGN_SPEC` |
| Missing / broken material | `MISSING_REQUIRED_MATERIAL` / `BROKEN_ASSET_REFERENCE` |
| Export/Playwright failure | `EXPORT_FAILURE` |
| QA failure | `QA_FAILURE` |
| Wrong SKU | `SKU_NOT_SUPPORTED` |

No silent artifact release when gates fail.

## 12. Reproducibility / versioning

- Same truth + same deterministic reasoner → stable `designSpecFingerprint`
- Each pipeline run allocates **`renders/v{N+1}`** — prior versions retained
- `current-identity.json` is a pointer only; does not delete lineage
- Approved artifact bytes are not overwritten in place

## 13. Owner-independence

Routine Owner production for this proof path: **NONE**

Tagia did not: open Canva, move text, position images, export, rename, or copy into the Machine.

## 14. Canva status

**Not required. Not called. Not on critical path.**  
Account may remain for optional/manual internal work later — **not** the operational executor for this SKU proof.

## 15. Make status

**NOT REQUIRED NOW.** Not introduced.

## 16. Test result

```
src/lib/studio-design-renderer/design-renderer-proof.test.ts — 10/10 PASS
src/lib/studio-dispatch/dispatch.test.ts — 8/8 PASS
src/lib/studio-routing-handoff/routing-handoff.test.ts — 9/9 PASS
src/lib/studio-post-pay-activation/activate.test.ts — 10/10 PASS
src/lib/studio-payment/payment-truth.test.ts — 15/15 PASS
```

Proof script: `verdict: DESIGN_RENDERER_PROOF_PASS` → `proof-run-summary.json`

## 17. Proof verdict

### DESIGN RENDERER PROOF PASS

All required criteria met for **one SKU** (`v2-rtu-flyer`):

- Bounded design spec produced by machine creative reasoning (deterministic constrained; Anthropic path ready)
- Renderer consumed spec without Owner GUI
- Real PNG + PDF artifacts generated
- Contract plate + formats honored
- Artifact identity/hash recorded
- Design QA passed on the bound PNG
- Failures fail-closed
- Routine Owner production = NONE
- Canva = not required · Make = not required

## 18. Remaining design-SKU impact

**None migrated.** The other 12 Canva-primary design SKUs stay on the prior executor mapping until Owner authorizes expansion after this seed.

## 19. Backtrack impact

If rejected: delete/ignore `src/lib/studio-design-renderer/` + proof docs/artifacts; return to dispatch tip `f9a19c5…`. No menu/Kitchen rewrite to undo.

## 20. Git state

| Item | Value |
|------|--------|
| Branch | `operating/design-renderer-proof-1` |
| Tip / base | `f9a19c530d5be5dd2f6dfc7cc30692f8557bbaf7` |
| Commit | **None** (Owner/Manager review first) |
| Push / merge | **None** |

## 21. Exactly one recommended next step

**Owner visually accepts `renders/v5/flyer.png` (and PDF), then authorize a thin dispatch hook so `dd:{jobId}` for `v2-rtu-flyer` only may invoke this renderer contract — still without migrating the other 12 design SKUs.**

Optional follow-on (not the next step): exercise live Anthropic reasoning once an API key is present, still schema-constrained.

---

**Scout PARKED.**
