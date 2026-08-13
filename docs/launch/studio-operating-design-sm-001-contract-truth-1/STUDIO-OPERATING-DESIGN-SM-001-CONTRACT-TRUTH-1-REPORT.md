# STUDIO-OPERATING-DESIGN-SM-001-CONTRACT-TRUTH-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-CONTRACT-TRUTH-1  
**Mode:** Product-contract freeze only — no renderer work · no proof · no intake implementation · no remapping  
**Scout status:** PARKED  
**Final status:** OWNER ACCEPTED WITH TWO AMENDMENTS  
**Git:** No commit · No push · No merge  

---

## Verdict

### SM-001 CONTRACT TRUTH — ACCEPTED WITH CLARIFICATION + DATE-GOVERNANCE LOCK

| Gate | Status |
|------|--------|
| SKU #7 selection (`sm-001`) | Accepted (prior) |
| **Cardinality truth** | **ACCEPTED WITH CLARIFICATION** |
| **Calendar truth** | **ACCEPTED WITH DATE-GOVERNANCE LOCK** |
| Plate truth | Intentionally deferred (technical reinspect) |
| Delta class | **C** until `SM-001-DELTA-2` technical reinspect |
| Renderer / proof | **NOT AUTHORIZED** |
| Canva / Make | Unchanged / NOT REQUIRED |
| Six sealed lanes | Protected |

**Lock honored:** Product truth first. Renderer convenience did not drive N, calendar shape, or date rules.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `fa3cddc3871ede9d75ad27b8e765edc565a10f7c` |
| Prior package | `STUDIO-OPERATING-DESIGN-SM-001-DELTA-1` → **SM-001 DELTA C** |
| Scoreboard | **6/13 sealed** · `sm-001` = #7 selected · proof not authorized |
| Authorities | `src/catalog/services.ts` (`sm-001`, `sm-001-monthly`, `social_media-execution`) · `sku-overrides.ts` · `closeout/ledger.ts` · `family-baselines.ts` (`social`) · RTU lineage note in `batch1-ready-to-use.ts` · sealed social-posts contract (contrast only) |

---

## 2. Evidence (not freezes)

### 2.1 Cardinality — what the catalog actually says

| Source | Language |
|--------|----------|
| Deliverable | “Creates **up to six** static social posts” |
| Delivery map | `static_social_post` **quantity: 6** |
| Kitchen QA | “**No more than** six static posts” |
| Purpose / name | “polished **starter batch**” · **Launch Set** |
| Captions | “Writes **one caption per post**” |
| Order (separate) | “Provides **suggested** posting order” |
| Client responsibilities | Offer details · logos/images · approval — **no “choose post count”** · **no required publish dates** |
| RTU lineage | `sm-001` = up to six + calendar at $395; RTU = **exactly four** coordinated posts at $99 (**no** calendar) |
| Parallel “up to” pattern | `ma-001` “up to four” + delivery quantity 4 + CERT `minAssets: 1` / `maxAssets: 4` (variable ceiling pattern exists elsewhere — **not** copied blindly onto social “Launch Set”) |

**Sealed social contrast (not sm-001 law):** exact-4, posting order **not** a full calendar, no content calendar deliverable.

### 2.2 Calendar — what the catalog actually says

| Source | Language |
|--------|----------|
| Deliverable | “Provides a **simple content calendar**” |
| Delivery map | `content_calendar` **quantity: 1** · unit `calendar` |
| Monthly twin | “simple **monthly posting** calendar” |
| Family handoff | “static posts + captions (**and calendar when included**)” |
| Closeout | “simple calendar” · **Studio does not post** · client posts/schedules |
| Order vs calendar | Both promised on `sm-001` — order is **suggested posting order**; calendar is a **separate** deliverable |
| Execution add-on | `social_media-execution` **schedules and publishes** approved posts — **not** part of base `sm-001` |
| Client dates | `sm-001` does **not** list “Dates” as a client responsibility (unlike `ma-001`) |

**Absent from authority:** calendar schema · visual vs document · required fields · date source · post binding rules · posting clock times.

---

## 3. Cardinality FREEZE — ACCEPTED WITH CLARIFICATION

### Owner amendment 1 (customer promise language)

“Up to six” alone can still sound like six is the expected package and four is a shortfall. **Authoritative customer / preaccept / service promise:**

> The Studio creates **4–6** posts, with the final count determined by the campaign needs and usable approved material, up to a maximum of six.

That wording is product law wherever the customer promise is represented (catalog-facing copy paths, preaccept, service truth). Internal ceiling language may remain “up to six”; customer-facing promise must not imply “six expected, fewer = failure.”

### C-1. Ceiling — ACCEPTED

**Hard maximum = 6** static social posts per `sm-001` job.  
Above 6 = contract breach / fail-closed. Never deliver more than six.

### C-2. Meaning of the package — ACCEPTED (clarified)

Customer buys a **Launch Set**: Studio creates **4–6** posts for **one** content/campaign focus. Final count follows campaign needs and usable approved material. Not a guarantee of six. Not empty reserved slots.

Completeness is judged against the job’s locked **`plannedPostCount`**, not against the package ceiling alone.

### C-3. Allowed N — ACCEPTED

**N ∈ {4, 5, 6}.** Values 1–3 and >6 are not valid for this SKU.

### C-4. Who determines N — ACCEPTED

**Studio production determines N** within {4, 5, 6} from campaign truth and usable approved materials, **without inventing posts, offers, prices, or dates** to pad the count.

| Who | Role |
|-----|------|
| Customer | Does **not** pick N from a menu. Supplies focus, facts, materials, constraints. |
| Package scope | Floor 4 · ceiling 6. |
| Studio production | Chooses N **before execution**. |
| QA / renderer | **Do not** choose or revise N after the fact. |

### C-5. Durable job identity + lock — ACCEPTED (Owner amendment)

| Field | Rule |
|-------|------|
| **`plannedPostCount`** | Durable job-level identity: **`4 \| 5 \| 6`** |
| When set | Studio chooses N **before execution** (production accept / scope lock). |
| After lock | **Immutable for that job’s production set.** Production cannot quietly change 6→5 because one render failed. |
| Pre-payment draft | May change while working draft remains editable. |
| Purchased snapshot | Carries the locked `plannedPostCount` for the job. |

**Critical distinction:** Studio chooses N before execution. **QA does not choose N afterward.**

### C-6. Delivered count vs ceiling — ACCEPTED

| Situation | Truth |
|-----------|-------|
| `plannedPostCount=6`, deliver 6 | Complete. |
| `plannedPostCount=4`, deliver 4 | Complete — matches clarified 4–6 promise. |
| `plannedPostCount=5`, deliver 4 | **Incomplete / fail.** |
| Phantom empty slots to show “six” | **Forbidden.** |
| Pad with invented posts | **Forbidden.** |

### C-7. QA / partial failure — ACCEPTED

If fewer than **`plannedPostCount`** posts (+ matching captions) pass QA:

- **Fail closed** (or revise under revision rules).  
- Do **not** auto-reduce `plannedPostCount` to match what passed.  
- Do **not** ship a partial set as success.  
- Do **not** leave empty numbered slots.

### C-8. Identity / order for size N — ACCEPTED

For locked `plannedPostCount` = N:

- Durable IDs for **exactly N** members — only real members.  
- Suggested posting order lists **exactly those N** IDs.  
- Captions: **exactly one per post**.  
- Whole-set version binds N posts + N captions + order + calendar.

---

## 4. Calendar FREEZE — ACCEPTED WITH DATE-GOVERNANCE LOCK

### Owner amendment 2 (date governance)

Suggested dates may be generated by Studio **only within authoritative campaign timing constraints**.

If customer / campaign truth contains any of:

- promotion start/end  
- event date  
- expiration  
- launch date  
- blackout dates or other **supported** timing constraints  

the Machine **must respect them**. It must not produce a pretty calendar that schedules a post after the promotion ended (or otherwise violates supported constraints).

If **no** campaign timing constraints exist, Studio may create an advisory sequence under a **bounded scheduling policy**. Those dates are **recommendations**, not customer-provided facts.

**Versioning:** Calendar truth versions with the set. If a material scheduling constraint changes, the manifest **must not mutate underneath** an already identified set version — allocate a new whole-set version.

### K-1…K-3, K-5…K-7 — ACCEPTED as written

- Required ordered schedule manifest (not a visual calendar graphic)  
- Real deliverable; advisory only for customer posting action  
- 1:1 post ↔ calendar binding  
- Fields: order + assetId + captionId + suggested date/day-slot  
- No posting clock times · no publishing/scheduling  
- Distinct from suggested posting order  
- Completeness with the set; fails with the set  

### K-4. Where dates come from — ACCEPTED (amended)

| Source | Rule |
|--------|------|
| Customer-required publish schedule on base SKU? | **No** |
| Customer posting-date intake questions? | **Not added** (Owner: do not balloon the product) |
| Studio suggested dates? | **Yes** — only inside authoritative campaign timing constraints when present |
| Constraint violation? | **Fail closed** / revise — do not ship an illegal pretty calendar |
| No campaign dates? | Bounded Studio advisory scheduling policy; dates are recommendations, not customer facts |
| Customer-supplied preferred dates in materials? | **Preserve** when present; do not invent conflicting schedule facts |
| Exact posting times / platform account / publish? | **Excluded** |

### Explicitly not added (Owner)

Customer posting-date questions · posting-time fields · platform account access · scheduling · publishing · visual calendar graphics.

---

## 5. Coupled locks (in scope of this freeze)

| Lock | Freeze |
|------|--------|
| Captions | One Studio-written caption per delivered post; N captions for N posts |
| Hashtags | “Basic hashtag/keyword suggestions where appropriate” remains a package promise — **not** unlimited research; bounds for Machine copy deferred to a later intake/copy truth if needed |
| One focus | One content/campaign focus per job (catalog purpose) |
| Reels / multi-aspect | Still excluded |
| Plate / square | **Not frozen here** — deferred (product size “one agreed aspect” exists; CERT square is a technical choice for a later package, not smuggled in as product law today) |
| Monthly twin | Inherits these freezes for method; monthly ops remain parked |

---

## 6. Explicitly not decided by renderer ease

| Temptation | Rejected |
|------------|----------|
| “Always N=4 because social engine is exact-4” | Rejected — would erase sm-001’s “up to six” ceiling value |
| “Always N=6 and pad” | Rejected — invents content; phantoms |
| “Calendar = rename posting-order.json” | Rejected — catalog lists both |
| “Skip calendar until renderer has dates UI” | Rejected — calendar is a deliverable |
| “Require customer date authorization because binding is hard” | Rejected — invents a client responsibility |
| “Visual calendar graphic as the only calendar” | Rejected — invents a design asset not in the simple-document reading |

---

## 7. Owner acceptance record

| Item | Verdict |
|------|---------|
| Cardinality truth | **ACCEPTED WITH CLARIFICATION** — customer promise = 4–6; `plannedPostCount`; Studio chooses before execution; QA does not rewrite N |
| Calendar truth | **ACCEPTED WITH DATE-GOVERNANCE LOCK** — constraint-respecting suggested dates; set-version immutability |
| Plate truth | Intentionally deferred |
| Not added | Customer date questions · posting times · account access · scheduling · publishing · visual calendar graphics |
| Proof | **NOT authorized** |
| Next | `STUDIO-OPERATING-DESIGN-SM-001-DELTA-2` |

---

## 8. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-DELTA-2`** — technical re-inspect against this **accepted** product truth: given frozen 4–6 + bound advisory schedule manifest, what genuinely new engineering remains beyond the six sealed lanes? Return exactly one class **A / B / C / D**. No proof.

---

## OWNER ACCEPTED WITH TWO AMENDMENTS

**Scout proceeded to DELTA-2.**
