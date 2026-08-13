# STUDIO-OPERATING-DESIGN-SM-001-PROOF-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-PROOF-1  
**Mode:** Renderer proof only — no dispatch · no primaryTool remap · no monthly · no ma-001  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## Verdict

### SM-001 RENDERER PROOF PASS · VISUAL PASS WITH LIMITS

| Gate | Status |
|------|--------|
| Technical renderer proof | **PASS** (Owner accepted) |
| Owner/Manager visual (N=6 set) | **PASS WITH LIMITS** (Owner accepted 2026-08-13) |
| 4–6 cardinality model | **ACCEPTED** |
| Posts 5–6 | **ACCEPTED** |
| Six-member campaign coherence | **ACCEPTED** |
| Proof package | **ACCEPTED** |
| Dispatch | **NOT AUTHORIZED** |
| primaryTool | **Canva** (unchanged) |
| Make | **NOT REQUIRED** |
| Six sealed lanes | **Green** |

**Owner visual arc (accepted):** 1 offer → 2 action → 3 timing → 4 trust → 5 proof → 6 soft close.

**Polish limits (not blockers):** set remains conservative/formal for social; Post 6 bottom descriptive line quiet/crowded against CTA — polish only.

**Visual gate note:** Technical + visual gates closed. Next package must close the **live-path / intake-structure seam** before any dispatch hook.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `fa3cddc3871ede9d75ad27b8e765edc565a10f7c` |
| Classification | **SM-001 DELTA B** (Owner accepted) |
| Product truth | CONTRACT-TRUTH-1 accepted with clarification + date-governance lock |
| Branch | `operating/design-renderer-proof-1` |
| Sealed lanes protected | flyer · business-card · menu · service-sheet · promotion-graphics · social-posts |

---

## 2. Authoritative contract (honored)

| Law | Proof behavior |
|-----|----------------|
| Customer promise 4–6 | Richness-driven N selection yields 4 / 5 / 6 |
| `plannedPostCount ∈ {4,5,6}` | Locked before render; typed + asserted |
| Studio chooses N before execution | `selectSm001PlannedPostCount` + durable selection fingerprint |
| No padding | Core richness → 4 (no phantom 5/6) |
| QA cannot shrink N | Failures return locked `plannedPostCount`; no auto-reduce |
| Calendar = required schedule manifest | `calendar-manifest.json` deliverable |
| 1:1 post↔calendar | Entries bind order + asset + caption + suggested date |
| Date governance | Constraint window respected; outside-window fail-closed |
| Calendar versions with set | Whole-set `vN` includes calendar path + fingerprint |
| No times / publish | Manifest flags `postingTimesExcluded` + `publishingExcluded` |
| Plate product deferred | Technical executable path = **square-only** (fail-closed elsewhere) |

---

## 3. N-selection logic

| Richness | Signals | `plannedPostCount` |
|----------|---------|--------------------|
| `full` | logo + offer + dates + extended copy + secondary proof (`was $249`) | **6** |
| `extended` | logo + offer + dates + extended copy | **5** |
| `core` | logo + offer + dates | **4** |

- Selected **before** execution (`selectedBeforeExecution: true`)
- Auditable `selectionFingerprint` + rationale string
- **Not** chosen by render success, QA survival, filename count, fixture padding, or post-hoc shrink

---

## 4. N=4 / 5 / 6 behavior

| N | Members | Layouts | Result |
|---|---------|---------|--------|
| 4 | `social-post-1…4` | offer_lead · cta_book · dates_window · trust_brand | PASS |
| 5 | `social-post-1…5` | + `proof_point` | PASS |
| 6 | `social-post-1…6` | + `soft_close` | PASS (max-load visual evidence) |

No arbitrary-N engine. Only `{4,5,6}`.

---

## 5. Member identities

Durable ordered IDs: `social-post-1` … `social-post-N`.

- N=4: no phantom Post 5/6  
- N=6: no omitted members  

---

## 6. Posts 5–6 layouts

Studio production templates (not customer contract roles):

| Post | Template | Distinct hierarchy |
|------|----------|--------------------|
| 5 | `proof_point` | Navy offer band with was-price emphasis; logo top-right |
| 6 | `soft_close` | Soft-close split: cream brand top + navy CTA footer |

Anti-clone set QA requires six distinct layout fingerprints at N=6.

---

## 7. Caption binding

Every post → exactly one Studio-written caption (`caption-{n}`).

Bound chain: post ID → caption ID/text → order → set version.  
Caption facts locked to campaign truth (no invented prices).

---

## 8. Calendar manifest

Artifact: `calendar-manifest.json` (deliverable, not chrome).

Per entry (minimum): set version · order · post ID · caption ID · suggested date · artifact PNG path.

Flags: `advisory: true` · `publishingExcluded: true` · `postingTimesExcluded: true`.

---

## 9. Date governance

| Case | Behavior |
|------|----------|
| Harbor start/end `2026-03-10` … `2026-04-15` | Suggested dates spaced **inside** window (`constraint_window`) |
| Forced date after end | **DATE_GOVERNANCE_FAILURE** |
| No timing constraints | `bounded_advisory_sequence` from proof epoch (recommendations, not customer facts) |

---

## 10. Plate result

| Topic | Result |
|-------|--------|
| Executable plate proven | **`cert-square-1024` (1024×1024)** |
| Portrait / TikTok | **Fail-closed** (`INVALID_PLATE`) |
| Product contract rewrite? | **No** — square is technical fulfillment for this proof only |

---

## 11. Whole-set identity / versioning

Identity includes: `plannedPostCount` · selection record · N assets · N captions · posting order · calendar fingerprint · material fingerprint.

- Material change → immutable `vN+1`; prior set retained  
- Same authoritative truth reuse path preserved via fingerprinting  

---

## 12. Partial-failure behavior

All fail closed **without** shrinking `plannedPostCount`:

| Fault | Code |
|-------|------|
| Mid-set export fail (e.g. 3/6) | `PARTIAL_SET_FAILURE` |
| Missing caption | `CAPTION_FAILURE` / `BINDING_FAILURE` |
| Bad caption binding | `BINDING_FAILURE` |
| Missing calendar entry | `CALENDAR_FAILURE` / `BINDING_FAILURE` |
| Date outside constraints | `DATE_GOVERNANCE_FAILURE` |
| Count mismatch | `COUNT_MISMATCH` |
| Unsupported plate | `INVALID_PLATE` |

---

## 13. Actual N=6 visual evidence

**Path:** `docs/launch/studio-operating-design-sm-001-proof-1/artifacts/sm-001/renders/v1/`

| File | Role |
|------|------|
| `social-post-1.png` | Offer lead |
| `social-post-2.png` | Booking CTA |
| `social-post-3.png` | Dates window |
| `social-post-4.png` | Brand trust |
| `social-post-5.png` | Proof point (was-price) |
| `social-post-6.png` | Soft close |

Also: `captions.json` · `captions.txt` · `posting-order.json` · `calendar-manifest.json` · `artifact-identity.json` · `campaign-set.design-qa.json`

### Scout visual read (for Owner — not a substitute for Owner grade)

- Campaign family coherent (Harbor & Oak · same offer · shared palette)  
- Hierarchy varies by member (left stack · centered CTA · dates band · split trust · proof band · soft-close split)  
- Posts 5–6 read as **extensions**, not clones of 1–4  
- Set does **not** read as six padded copies of one template  
- CERT chrome labels present (fixture honesty; same pattern as sealed social proof)  

**Owner must still grade** coherence / weak members / intentional six vs centipede.

---

## 14. QA

Design-quality gate with `minAssets = maxAssets = plannedPostCount`.  
Set consistency + caption binding + calendar completeness + date governance.  
Max-load N=6 passed technical QA.

---

## 15. Owner-independence

Routine Owner action target: **NONE**.

Proof Machine performed: N selection · layouts · captions · caption binding · suggested dates within constraints · calendar assembly · square export · set QA.  
Tagia does **not** need to operate Canva, invent posts to reach six, or hand-repair partial sets for this proof path.

---

## 16. Canva / Make / six-lane protection

| Item | Status |
|------|--------|
| Canva | **Unchanged** — `resolveServiceProductionContract("sm-001").primaryTool.toolId === "canva"` |
| Make | **NOT REQUIRED** |
| flyer / card / menu / service-sheet / promo / social-posts | Regression **PASS** |
| monthly / ma-001 | Parked · not started |

---

## 17. Tests / result

```
npx vitest run src/lib/studio-design-renderer/sm-001-proof.test.ts
→ 10 passed (10)
```

Coverage: contract · N-selection · layouts 5–6 · N=6 artifacts · N=4/5 · versioning · fail-closed suite · advisory calendar · Canva unchanged · six-lane regression.

---

## 18. Proof verdict

### SM-001 RENDERER PROOF PASS

(Technical. Visual Owner gate **PENDING**.)

---

## 19. Git state

| Field | Value |
|-------|--------|
| Commit | **None** |
| Push | **None** |
| Merge | **None** |
| Working tree | Proof sources + artifacts + this report (uncommitted) |

---

## 20. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-INTAKE-TRUTH-1`** — map live campaign/job truth → Machine Launch Set structure (`plannedPostCount`, square executable plate, Studio layout templates, timing constraints for calendar) **before** any dispatch hook.

Do **not** open `SM-001-DISPATCH-HOOK-1` until that seam is closed.

---

## READY FOR OWNER VISUAL REVIEW → **CLOSED PASS WITH LIMITS**

**Scout proceeded to INTAKE-TRUTH-1 seam.**
