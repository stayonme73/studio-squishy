# KITCHEN-PRODUCTION-CERT-DESIGN-1 — Evidence

**Status:** Internal certification evidence (not customer records)  
**Label:** CERTIFICATION FIXTURE / INTERNAL TEST  
**Base tip:** KITCHEN-PRODUCTION-CERT-COPY-1 (`cfff55d`)

---

## Fixtures

| ID | Business | Direction |
|----|----------|-----------|
| Fixture A | Harbor & Oak Home Services | Cool professional trades |
| Fixture B | Salt & Cedar Bakery | Warm consumer food / lifestyle |

---

## Tested SKUs (no inference)

`v2-rtu-flyer`, `v2-rtu-menu`, `v2-rtu-service-sheet`, `v2-rtu-social-posts`, `v2-rtu-promotion-graphics`, `v2-rtu-business-card`, `ma-001`

---

## Artifact paths

Root: `docs/launch/kitchen-production-cert-design-1/artifacts/`

Measured proof-plate sizes (orientation-correct; not Canva API export):

| Shape | Px |
|-------|-----|
| Portrait flyer / sheet / menu / tall promo | 1024×1536 |
| Square social / promo | 1024×1024 |
| Landscape business card | 1536×1024 |

**Limit:** Exact catalog print pixels (e.g. 1080×1350 flyer) are not proven by this evidence set. Production remains manual Canva export to contract formats. Canva is named/manual — not live API.

### Fixture A

| File | Role |
|------|------|
| `fixture-a/flyer-v1-fail.png` | Forced substantive fail |
| `fixture-a/flyer-v2-final.png` | Corrected final flyer |
| `fixture-a/service-sheet-final.png` | Final |
| `fixture-a/business-card-final.png` | Final |
| `fixture-a/social-1-final.png` … `social-4-final.png` | Final set |

### Fixture B

| File | Role |
|------|------|
| `fixture-b/menu-final.png` | Final menu |
| `fixture-b/promo-1-final.png`, `promo-2-final.png` | Campaign graphics |
| `fixture-b/promotion-pack-1-final.png` … `4` | Promotion Pack set |

---

## Forced failure (flyer v1)

Defects: hype/synergy energy, #1 / best-in-city claims, energy-bill half claim, same-day everywhere, buried/weak CTA, crowded generic template look, wrong brand fit for plainspoken trades.

Path: Producer → QA fail (`production_correction`) → correction → QA pass with `designQualityEvidence`.

---

## Runtime design QA gate

`src/lib/studio-kitchen-production/design-quality/`

For `marketing_assets` creative/qa (and RTU social visual SKUs):

checklist alone is **not** sufficient.

Requires: artifact evidence + deterministic checks + recorded visual judgment notes.

Tool honesty: Canva is named/manual-operational — not live API integration.
