# Artifact ↔ QA Binding Ledger

CERTIFICATION FIXTURE / INTERNAL TEST  
Package: `KITCHEN-PRODUCTION-CERT-DESIGN-1`  
Identity lock Harbor: `harbor-oak-anchor-oak-oval-v1`  
Campaign truth Harbor: Spring Tune-Up + Drain Clear · $189 · March 10–April 15, 2026  

## Root cause (evidence)

**Primary: C** — Runtime QA previously accepted `declaredLogoVariantId` / `presentedAs: web` metadata without binding those claims to rendered file bytes or requiring visual attestation that the PNG matches the declared identity source.

**Contributing A risk:** Prior `business-card-final.png` (lighthouse + envelope) remained on disk beside `business-card-v2-corrected.png`. Without path+hash handoff, Owner/Manager review can open the wrong file. Prior bytes SHA-256:

`3411c22cdaa0666a6b619019a2efc1e74ea2637056af15e93dd11b9ec988f10f`

## Binding method

1. Producer declares `approvedIdentitySourceId` + `contentSha256` on each artifact.
2. Deterministic gate verifies hash matches file bytes on disk.
3. QA attestation `renderedIdentityMatchesDeclaredSource` + notes referencing sha256 / bound file.
4. Contact semantics: `renderedContactSemanticsMatchDeclared` when contactSemantics present.

No computer vision. Metadata alone cannot pass.

## Final Harbor artifacts for Owner/Manager review

| Artifact | Path | Bytes | SHA-256 | Identity | SKU |
|----------|------|------:|---------|----------|-----|
| Business card V3 | `artifacts/fixture-a/business-card-v3-corrected.png` | 1266957 | `2b2ae31b05ea2acc1cc5d49a0e9b7689e5ba5c3811b578ecefbb102aad3fd4bb` | harbor-oak-anchor-oak-oval-v1 | v2-rtu-business-card |
| Social #1 V3 | `artifacts/fixture-a/social-1-v3-corrected.png` | 1349025 | `4b1d5b8bd2e631767a4f286abb75a3aef65cff14e669336c5736336420df0dc9` | harbor-oak-anchor-oak-oval-v1 | v2-rtu-social-posts |
| Social #2 V2 (preserved) | `artifacts/fixture-a/social-2-v2-corrected.png` | 1290748 | `47838f7ef0509087fb71f8a0a2717476135913ae63af098d2c8df0e1a4cf4539` | harbor-oak-anchor-oak-oval-v1 | v2-rtu-social-posts |
| Social #3 V2 (preserved) | `artifacts/fixture-a/social-3-v2-corrected.png` | 1438325 | `b1a8f9ebbf0aa062b1a6a00f43e9c37f7b999af7d6a4fae5e12c991a29313ca3` | harbor-oak-anchor-oak-oval-v1 | v2-rtu-social-posts |
| Social #4 V3 | `artifacts/fixture-a/social-4-v3-corrected.png` | 1268666 | `3d7ca4e70bd70d2696fce9b4c1535487417fb1b4eeef64112e6d8804c6fdd29d` | harbor-oak-anchor-oak-oval-v1 | v2-rtu-social-posts |

Fixture ID: `cert-design-1-fixture-a-harbor-oak`  
QA path: runtime `designQuality` on creative/qa (`gateDesignQualityForQaPass`)

## Saturday availability authority

Fixture A has **no** authority for Saturday morning slots, limited availability, or book-early urgency.  
These are prohibited campaign aliases in `harborOakIdentityLock.campaign.prohibitedOfferAliases`.

- Social #3 V2: retained (no unauthorized availability claims).
- Social #2 V3: **corrected** — `social-2-v3-corrected.png` (prior V2 retained for audit only).

## Final four Harbor review PNGs

| File | SHA-256 | Identity | QA |
|------|---------|----------|-----|
| `business-card-v3-corrected.png` | `2b2ae31b05ea2acc1cc5d49a0e9b7689e5ba5c3811b578ecefbb102aad3fd4bb` | harbor-oak-anchor-oak-oval-v1 | `gateDesignQualityForQaPass` / v2-rtu-business-card |
| `social-1-v3-corrected.png` | `4b1d5b8bd2e631767a4f286abb75a3aef65cff14e669336c5736336420df0dc9` | harbor-oak-anchor-oak-oval-v1 | social set |
| `social-2-v3-corrected.png` | `4f4c31aea1cfb242ef2e7da59f6926de88013afb7a056a861f752c75ca3bac5a` | harbor-oak-anchor-oak-oval-v1 | social set |
| `social-4-v3-corrected.png` | `3d7ca4e70bd70d2696fce9b4c1535487417fb1b4eeef64112e6d8804c6fdd29d` | harbor-oak-anchor-oak-oval-v1 | social set |

Root: `docs/launch/kitchen-production-cert-design-1/artifacts/fixture-a/`

## Harbor flyer + service sheet identity cleanup

| File | SHA-256 | Identity | QA |
|------|---------|----------|-----|
| `flyer-v4-corrected.png` | `fb683221b8c0e82af1ecb79b4eea964108e2247623f5dda246b114dced6c2e72` | harbor-oak-anchor-oak-oval-v1 | v2-rtu-flyer |
| `service-sheet-v3-corrected.png` | `ff2146d57863a0e2f0b1a78a000793ef0c22be3d20a4b0175b149e7b716cc324` | harbor-oak-anchor-oak-oval-v1 | v2-rtu-service-sheet |

Priors retained: `flyer-v2-final.png`, `flyer-v3-corrected.png` (reversed contact icons — audit), `service-sheet-final.png`.
