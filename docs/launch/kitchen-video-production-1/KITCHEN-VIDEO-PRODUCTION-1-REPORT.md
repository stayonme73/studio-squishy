# KITCHEN-VIDEO-PRODUCTION-1 REPORT

**Status:** READY FOR OWNER REVIEW  
**Package:** Short-video production path truth audit — **not certification**  
**Branch:** `kitchen/video-production-1`  
**Base seal:** KITCHEN-PRODUCTION-CERT-VOICE-1 `5348ba7`  
**Scout state:** PARKED  
**Commit/push:** none (this package)

---

## 1. Starting Control Point

| Package | Tip |
|---------|-----|
| KITCHEN-FOUNDATION-1 | `c640e8c` |
| KITCHEN-COMMS-1 | `d926a23` |
| KITCHEN-PRODUCTION-CAPABILITY-1 | `9083bf4` |
| KITCHEN-PRODUCTION-CERT-COPY-1 | `cfff55d` |
| KITCHEN-PRODUCTION-CERT-DESIGN-1 | `664af4c` |
| KITCHEN-VOICE-PRODUCTION-1 | `48d61c4` |
| KITCHEN-VOICE-INTEGRATION-1 | `eb96045` |
| KITCHEN-PRODUCTION-CERT-VOICE-1 | `5348ba7` |

Scout began **PARKED**. Original dirty WIP left untouched. No merge.

---

## 2. Short-Video Contract Truth

**SKU:** `v2-rtu-short-video` · **Name:** Make Me a Short Video · **$149**

| Field | Authority |
|-------|-----------|
| Promised deliverable | One basic short-form video, 15–30 seconds; one campaign/offer/event/promotion focus |
| Number of videos | **1** |
| Aspect ratio | **One only** — vertical, square, or landscape |
| Resolution | **Unspecified** in catalog (must be recorded at export; not invented as a promise) |
| Frame rate | **Unspecified** |
| File format | **MP4** with basic edit, on-screen captions, and CTA treatment |
| Voice-over | **Optional** — may reuse sealed certified voice MP3 by hash; not reimplemented here |
| Music | Exclusion: *music licensing outside approved tools* — approved source **not established** |
| Stock / Studio visuals | Named in catalog/intake — **authorized source unresolved** |
| Revisions | **1** round |
| Publishing | **Excluded** — client posts/distributes |
| Filming | **Excluded** — no on-site/drone/talent |

**Intake discrepancy (explicit):** `rtu-short-video` lead still says “up to 45 seconds.” Catalog/contract authority is **15–30 seconds** with exclusion longer than 30 seconds. Do not expand the offer to 45s.

**Producer role:** `creative_production` · **Primary tool:** CapCut · **Readiness:** `CONTRACT READY — INTEGRATION REQUIRED` · **Not CUSTOMER READY**

---

## 3. Existing Video Capability Inventory

| Mechanism | Classification |
|-----------|----------------|
| CapCut named tool | **INTEGRATION REQUIRED** |
| CapCut manual-operational Kitchen path | **INTEGRATION REQUIRED** (not proven) |
| Studio-side MP4 render/export | **UNSUPPORTED** |
| File Room MP4 storage | **PRESENT BUT NOT EXPORTABLE** |
| Certified voice MP3 reuse | **PRESENT AND USABLE** (as input only) |
| Copy capability | **PRESENT AND USABLE** |
| Static design capability | **PRESENT AND USABLE** (stills/end cards — not motion) |
| Stock/Studio/AI visual source | **UNRESOLVED** |
| Music / CapCut music rights | **UNRESOLVED** |
| Studio Voice UI | **PRESENT BUT NOT EXPORTABLE** — untouched |

**Truth:** The Studio cannot currently create a real customer-ready MP4 without a human producing it outside Studio runtime. CapCut is named; it is not integrated; a manual path is hypothesized but not Kitchen-proven.

---

## 4. CapCut Finding

**integration required**

- Not automated/integrated
- Not proven manual-operational (unlike Canva’s documented manual path)
- Not unsupported as a named tool — but **unsupported as Studio export**
- No CapCut API/SDK/webhook in the stack
- No browser UI automation built or approved
- No new video vendor introduced

---

## 5. Actual Production Chain

```
customer brief/assets
→ script/copy lock                    (copy)
→ storyboard/shot sequence            (creative_production)
→ asset preparation                   (creative_production)
→ optional certified voice MP3        (creative_production — hash ref only)
→ video assembly                      (CapCut — INTEGRATION REQUIRED)
→ captions/text/timing                (CapCut — INTEGRATION REQUIRED)
→ audio/music handling                (voice reuse OK; music UNRESOLVED)
→ render/export                       (CapCut outside Studio — INTEGRATION REQUIRED)
→ artifact persistence                (system — path/hash bind)
→ video QA                            (qa)
→ correction                          (creative_production ↔ qa)
→ review/delivery                     (producer_dispatcher — client distributes)
```

Kitchen labels represented: assets ready · script ready · storyboard ready · production started · render pending · render failed · video artifact produced · QA ready · QA correction required · QA pass · review ready.

No second workflow. No second event store.

---

## 6. Inputs / Asset Requirements

| Customer provides | Outcome |
|-------------------|---------|
| Usable footage | Allowed to proceed when CapCut path exists |
| Photos only | Allowed in principle (still needs assembly path) |
| Logo + copy only | **Fails** until authorized Studio/stock/AI source exists |
| No usable media | **Fails honestly** |
| Insufficient resolution | **Fails** — do not stretch |
| Footage Studio does not possess | **Fails** — filming excluded; do not fabricate |

---

## 7. Voice Integration Reuse

Sealed MP3 path (`5348ba7`) may be referenced by exact path/hash as a video input.

- Do **not** reimplement ElevenLabs in this package
- Voice certification does **not** certify video
- Missing required voice hash fails when voice-over is required for the job

---

## 8. Music / Licensing Truth

**MUSIC CAPABILITY = UNRESOLVED**

- CapCut-provided music commercial rights for customer deliverables are **not** established in-repo
- License conditions unknown; do not assume
- Approved Studio music source: **none**
- Recommendation: **omit music** until rights are certain
- Do not rely on music for readiness

---

## 9. Export Capability

| Fact | Truth |
|------|-------|
| Studio can export MP4 autonomously | **No** |
| Promised format | **MP4** |
| Duration | **15–30 seconds** |
| Dimensions | **Unspecified** numerically; one aspect only |
| CapCut export | Human CapCut export outside Studio runtime (unproven operator packet) |

Binding fixture (not a deliverable):  
`docs/launch/kitchen-video-production-1/artifacts/binding-fixture-not-a-deliverable.bin.mp4`

---

## 10. Video QA Model

**Deterministic / machine-checkable:** campaign/job/SKU · file exists · MP4 · path/hash · duration · declared dimensions/aspect · audio stream when required · non-zero bytes · scriptVersionId · voice hash when used · render completed · stock/music honesty gates.

**Human visual/listening judgment required for QA PASS:** pacing · hierarchy · legibility · caption accuracy · timing · transitions · composition · branding · quality · audio balance · voice intelligibility · music appropriateness · awkward cuts · black frames · stretched assets · mobile text · misleading content · commercial usability — bound to the exact artifact.

Metadata alone cannot pass.

---

## 11. Artifact Binding

Contract binds: exact path · SHA-256 · byte size · SKU · campaign/job · scriptVersionId · source asset refs · optional voice hash · production method (capcut) · declared dimensions/duration · QA evidence.

The video reviewed must be the video certified (future cert package only).

---

## 12. Kitchen / Comms Integration

Reuses existing campaign-tasks phases, QA fail/pass, Kitchen Comms ledger, File Room storage patterns, production contracts.

Routine corrections: **owner_not_required** (Creative Production → QA → Creative Production → QA).

---

## 13. Owner Independence

| Question | Answer |
|----------|--------|
| Can this run without Tagia routinely editing customer videos? | **Unproven** |
| Is Tagia named as CapCut editor? | **No** |
| Is Creative Production the intended CapCut operator? | **Yes (target)** |
| Is that operational packet Kitchen-proven? | **No** |

If CapCut work defaults to Tagia on every job → **NOT SCALABLE / NOT OWNER-INDEPENDENT**. This package does **not** claim that failure mode is current practice — it records that independence is unproven until a Creative Production packet exists.

---

## 14. Missing Capability (before real certification)

1. CapCut operational path **or** approved API/automation (no brittle UI automation; no new vendor in this package)
2. Creative Production work packet: inputs → CapCut → MP4 return → hash bind → QA
3. Authorized stock/Studio/AI visual source + license truth
4. Music rights decision (omit vs approved source)
5. Resolve intake “45 seconds” vs catalog 15–30s copy discrepancy
6. Record export dimensions/fps practice without inventing catalog promises
7. At least one real production-quality MP4 through the proven path (cert package)

---

## 15. Readiness Verdict

**INTEGRATION REQUIRED**

- Not PRODUCTION PATH READY FOR CERTIFICATION
- Not MANUAL-OPERATIONAL — READY FOR CERTIFICATION WITH LIMITS (packet unproven)
- Not NOT SCALABLE (Tagia-as-editor not proven; also not disproven)
- Not BLOCKED solely by music/stock — those are material gaps inside the integration/operational work
- **Not CUSTOMER READY** — no certification in this package

---

## 16. Backtrack Impact

None to sealed packages. Voice MP3 seal remains. Studio Voice untouched. Catalog not silently rewritten (intake discrepancy documented only). No unrelated SKU certified.

---

## 17. Exact Recommended Next Package

**Do not run `KITCHEN-PRODUCTION-CERT-VIDEO-1` yet.**

Recommend:

### `KITCHEN-VIDEO-OPERATIONAL-1`

Prove a Creative Production CapCut manual-operational path (or approve a legitimate CapCut/API path if one becomes available) including:

- operator ≠ Tagia for routine jobs
- work packet + brand/caption/CTA rules
- MP4 return + SHA-256 binding
- stock-source decision
- music omit-or-approve decision
- intake duration discrepancy fix (copy only; no offer expansion)

Only after that path is truthful and operational should Owner authorize **`KITCHEN-PRODUCTION-CERT-VIDEO-1`**.

---

## 18. Tests

`src/lib/studio-kitchen-production/video-production/video-production.test.ts`

Proves: contract resolve · CapCut integration_required · missing assets fail · phantom MP4 blocked · path/hash/script/campaign/SKU binding · failed render blocked · metadata ≠ QA PASS · voice hash reuse · stock/music honesty · kitchen labels invent nothing · owner_not_required · no customer-ready grant · Studio Voice untouched · no unrelated SKU certified.

---

## 19. Git State

| Item | Value |
|------|-------|
| Branch | `kitchen/video-production-1` |
| Base | `5348ba7` |
| Commit | **none** |
| Push | **none** |
| WIP | protected / untouched |

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
