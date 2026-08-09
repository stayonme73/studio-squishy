# KITCHEN-PRODUCTION-CERT-DESIGN-1 — Consolidated Visual QA Correction

**Status:** Pre-seal correction completed and sealed with the design cert commit.  
**Sealed:** `664af4c` — Customer Ready With Limits for tested design SKUs only (KITCHEN-PRODUCTION-CERT-DESIGN-1).

## Corrected PNG evidence (do not overwrite priors)

### Harbor & Oak

| File | Role |
|------|------|
| `artifacts/fixture-a/business-card-v2-corrected.png` | Corrected |
| `artifacts/fixture-a/social-1-v2-corrected.png` | Corrected |
| `artifacts/fixture-a/social-2-v2-corrected.png` | Corrected |
| `artifacts/fixture-a/social-3-v2-corrected.png` | Corrected |
| `artifacts/fixture-a/social-4-v2-corrected.png` | Corrected |

Priors retained: `business-card-final.png`, `social-*-final.png`, flyer fail/final, service sheet.

### Salt & Cedar

| File | Role |
|------|------|
| `artifacts/fixture-b/promotion-pack-1-v2-corrected.png` | Corrected |
| `artifacts/fixture-b/promotion-pack-3-v2-corrected.png` | Corrected |
| `artifacts/fixture-b/promotion-pack-4-v2-corrected.png` | Corrected |

Priors retained: `promotion-pack-*-final.png` (including pack-2 PASS).

## Identity locks

- `src/lib/studio-kitchen-production/cert-design/identity-locks.ts`
- Runtime: `design-quality` brandIdentity + campaignTruth + contact semantics + multi-asset consistency + imagery themes
