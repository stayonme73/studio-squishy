# Recommendation Engine Philosophy — Locked (V1)

**Status:** Locked — engine philosophy, post-discovery flow, and Project Summary copy structure are frozen unless Tagia approves a business change.

**Code reference:** `src/recommendation/RECOMMENDATION_PRINCIPLES.md` · `src/project-summary/types.ts` (`PROJECT_SUMMARY_LABELS`, `PROJECT_SUMMARY_MOCK`)

**Related locks:** [Recommendation, Not Direction](recommendation-not-direction-v1-locked.md) · [Studio Bundles V1](studio-bundles-v1-locked.md) · [Customer Journey V1](customer-journey-v1-locked.md)

## Implementation status

**Philosophy locked; engine wiring deferred.** Discovery Mapping and Recommendation Engine integration begin **after** Project Summary polish, slide-out Secure Checkout, and end-to-end journey verification (Discovery → Project Summary → payment). Until then, Project Summary may use mock data that follows this doc's copy structure and per-service Why? pattern. See [Customer Journey V1 — Build order](customer-journey-v1-locked.md#build-order-locked) · [Discovery Mapping (planned, PAUSED)](discovery-mapping-v1-planned.md).

---

## Core principle (unchanged)

**The Studio recommends. The client decides.**

See [Recommendation, Not Direction](recommendation-not-direction-v1-locked.md) for customer choice rules. This doc defines **how** the engine listens and **what** it outputs — not whether the client may change the plan.

---

## Core shift

| Before (deprecated) | After (locked) |
|---------------------|----------------|
| Engine finds the right **package** (Spark / Momentum / Growth) | Engine **listens**, understands Discovery answers, and **recommends services** |
| Package tier is the primary Discovery output | **Individual Studio Services** are the primary output |
| One collective rationale for a tier | **Per-service "Why?"** traceable to something the client said |
| Client steered toward a bundle | Client **decides** — accept, remove, substitute, add, or pick an optional bundle shortcut |

**Studio Bundles (Spark / Momentum / Growth) are optional fixed offerings** — not the primary recommendation. They appear **after** service recommendations as pre-built shortcuts. Bundle contents cannot be added to, removed from, or customized. See [Studio Bundles V1](studio-bundles-v1-locked.md).

---

## Locked post-discovery flow (6 steps)

These steps describe the customer experience after Project Discovery submit. Steps 1–2 exist today; steps 3–6 define Project Summary structure and future slide-out checkout alignment.

| Step | Customer moment | What happens |
|------|-----------------|--------------|
| **1. Discovery** | Project Discovery | Client answers service-connected questions |
| **2. Studio reviews** | Split-panel animation | Light bulbs, "Reviewing your goals…" — already implemented |
| **3. Studio Recommendation** | Our Recommendation | Services listed with ✅; **individual Why? per service** tied to client answers |
| **4. Optional Studio Bundles** | Prefer a bundled option? | Spark / Momentum / Growth **fixed** bundle cards — optional, not customizable |
| **5. Customize** | Customize Your Studio Plan | Remove / add / replace services; total updates automatically |
| **6. Approve** | Confirm plan | Recommended services, optional package selection, total investment, disclaimer, approve → Secure Checkout |

Architecture path: Catalog → Recommendation Engine → Discovery Summary Model → Project Summary → Secure Checkout.

---

## Locked language

### Recommendation voice

- **Use:** "Based on what you shared, we recommend…"
- **Never:** "You need this" · "You must purchase" · "The right package for you is…" (as primary output)

### Traceability rule

Every recommended service must have a **Why?** that references something the client said during Discovery. The engine (via Discovery Mapping) links recommendation → discovery answer. Until Discovery Mapping is wired, Project Summary uses mock data that demonstrates the per-service traceability pattern.

Collective rationale alone is **deprecated** for the primary recommendation section. Each service carries its own Why?.

### Disclaimer (verbatim)

> Our recommendations are based entirely on the information you shared during Discovery. They are intended to help you make informed decisions, not to guarantee business results. You're free to adjust your Studio Plan before approving it.

---

## Path A vs Path B

Two valid client paths through Project Summary — both preserve customer choice.

### Path A — Service-first (primary)

1. Client completes Discovery
2. Studio Recommendation shows individual services + per-service Why?
3. Client customizes plan (remove / substitute / add)
4. Client approves → Secure Checkout

**Default path.** The engine never requires Path B.

### Path B — Optional fixed bundle

1. Client completes Discovery
2. Studio Recommendation shows individual services + per-service Why?
3. Client sees **Prefer a bundled option?** and selects Spark, Momentum, or Growth
4. Fixed bundle contents apply — no add, remove, or customize within the bundle
5. Client approves the bundle as-is → Secure Checkout

**Bundles do not replace service recommendations.** They are fixed shortcuts after the service list. A client may ignore bundles entirely, stay on Path A with a **Custom Studio Plan**, and customize in the next section. See [Studio Bundles V1](studio-bundles-v1-locked.md).

---

## Studio Bundles repositioning

| Context | Role of Spark / Momentum / Growth |
|---------|-----------------------------------|
| **Studio Guide** | Compare packages — marketing / education (deliverable quotas; separate from bundle service lists) |
| **Project Discovery** | **Not recommended** — no bundle pressure during intake |
| **Project Summary** | **Optional** — "Prefer a bundled option?" section after Our Recommendation; fixed bundle cards |
| **Recommendation Engine** | Does **not** output a bundle as primary result; may suggest a bundle when mapping rules support it (wiring paused) |

Studio Bundles are **fixed optional shortcuts**, not the brain of Discovery. The brain recommends services from what the client shared. Personalized solutions use **Custom Studio Plan** — see [Studio Bundles V1](studio-bundles-v1-locked.md).

---

## Project Summary copy structure (locked)

Present sections in this order:

### 1. Our Recommendation

- **Title:** Our Recommendation
- **Lead:** Based on what you shared, we recommend starting with:
- **Services:** Each recommended Studio Service with ✅
- **Per-service Why?:** Individual rationale traceable to a Discovery answer

### 2. Prefer a bundled option? (optional)

- **Title:** Prefer a bundled option?
- **Lead:** Studio Bundles are fixed offerings — contents cannot be added, removed, or customized. Choose one below, or continue with your personalized Studio Plan above and customize it in the next section.
- **Cards:** Spark · Momentum · Growth — tagline, description, **Includes** service list, One-Time Investment or Monthly Plan label (locked copy in [Studio Bundles V1](studio-bundles-v1-locked.md))

### 3. Customize Your Studio Plan

- **Title:** Customize Your Studio Plan
- **Lead:** These are recommendations, not requirements.
- **Client powers:** Keep · Remove · Substitute · Add
- **Auto-update note:** Your Studio Plan will update automatically as you make changes.

### 4. Disclaimer

Verbatim paragraph (see Locked language above).

### 5. Approve

- Total investment (placeholder until pricing wired)
- Approve / Confirm and continue → Secure Checkout

---

## Example — new business (Path A)

**Discovery context:** Client is starting a new business; selected "Better Branding" and "Get More Customers."

**Our Recommendation**

Based on what you shared, we recommend starting with:

- ✅ Brand Identity Refresh  
  **Why?** You told us you're building your brand from the ground up — a refreshed identity gives you a consistent look before anything goes live.

- ✅ Brand Messaging  
  **Why?** You selected Better Branding — clear messaging helps customers understand what you offer from day one.

- ✅ Marketing Campaign  
  **Why?** You want to get more customers — a structured campaign turns your new brand into outreach that drives awareness.

- ✅ Social Media Marketing  
  **Why?** You selected Get More Customers — social channels are where many of your prospects already spend time.

**Prefer a bundled option?**

Studio Bundles are fixed offerings — contents cannot be added, removed, or customized. Choose one below, or continue with your personalized Studio Plan above and customize it in the next section.

- Spark · Momentum · Growth *(fixed bundle cards — see [Studio Bundles V1](studio-bundles-v1-locked.md))*

**Customize Your Studio Plan**

These are recommendations, not requirements. You can keep, remove, substitute, or add services. Your Studio Plan will update automatically as you make changes.

**Disclaimer**

Our recommendations are based entirely on the information you shared during Discovery. They are intended to help you make informed decisions, not to guarantee business results. You're free to adjust your Studio Plan before approving it.

---

## Architecture alignment

| Layer | Role under this philosophy |
|-------|----------------------------|
| Service Catalog | Defines approved Studio Services |
| Studio Bundles V1 | Fixed Spark / Momentum / Growth offerings — optional shortcuts, not customizable |
| Recommendation Engine | Listens to Discovery answers; recommends **services** with traceable rationale — packages secondary |
| Discovery Summary Model | Maps engine output to per-service Why? copy and investment labels |
| Project Summary | Presents Our Recommendation → Optional Packages → Customize → Disclaimer → Approve |
| Secure Checkout | Client pays after approving their chosen plan |

---

## What this lock does *not* change

- Discovery Mapping rule content or scoring weights (wiring **paused** until build order step 4 — see [Build order](customer-journey-v1-locked.md#build-order-locked))
- Service Catalog entries, pricing, or production allocation limits
- Discovery room badge offsets (`DISCOVERY_BADGE_OFFSET`)
- Discovery board UI or split-layout CSS mechanics
- `/payment` route — remains active until slide-out checkout ships
- Software architecture (API shape, caching, tests) — only **business philosophy** and **copy structure** are frozen here

---

## Related locks

- [Studio Bundles V1](studio-bundles-v1-locked.md) — fixed bundle copy and rules
- [Recommendation, Not Direction](recommendation-not-direction-v1-locked.md) — customer choice principle
- [Customer Journey V1](customer-journey-v1-locked.md) — Studio Recommendation step in post-discovery path
- [Studio Plan slide-out checkout (planned)](studio-plan-slide-out-checkout-v1-planned.md) — approve-before-pay on one workspace
- Agent rules: `AGENTS.md` — business rule freeze section
