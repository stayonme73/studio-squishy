# Step 3 Review Studio Plan — typography hierarchy (2026-09-05)

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`  
**Branch:** `operating/mobile-customer-journey-certification-1`  
**Status:** OPEN / IN PROGRESS. Typography pass recorded. **Standard Light tile appearance is an OPEN visual follow-up** (`2026-09-05-STEP-3-STANDARD-LIGHT-VISUAL-FOLLOW-UP.md`; MJ-D21) — not owner-approved, not frozen. Do not continue Step 3 CSS tonight.  
**Step 2:** frozen. Do not restyle. **Merge:** no.

Functional/content state is unchanged. This pass is type hierarchy, secondary readability, and a minimum Step 3 glass fill only.

**Resume URL:** `https://10.179.174.254:3000/?studioPaymentSandbox=1`

---

## Inventory found (before correction)

Step 3 used **twelve+ distinct sizes** on one screen:

| Role | Was |
|------|-----|
| STEP 3 eyebrow | 0.88rem / 700 |
| BEFORE CHECKOUT | 0.85rem / 750 |
| Checklist items | 1.02rem / default |
| Card labels (Route, Services, Investment, Timeline) | 0.95rem / 750 |
| Studio Plan title | phone clamp 1.18–1.45rem / 700 |
| Route / timeline values | clamp 1.35–1.7rem / 700 |
| Service name / price | clamp 1.25–1.55rem / 700–750 |
| **Estimated Investment $69** | clamp **1.75–2.25rem** / 750 |
| Secondary notes | 1.12rem, color `rgba(220, 216, 208, 0.9)` (washed ivory — vanished on Lounge) |
| Plan details toggle | 1.05rem / 700 |
| Change route / Edit Services | 1.02rem / 700 |
| Continue to Checkout | Welcome CTA clamp 0.9–1.02rem / 700 |

Card family mixed `--mc-card` 55% ivory with Plan Details on `--mc-chip` 50%.

---

## Consolidated hierarchy (implemented)

Five roles, scoped to `.planTablet` only:

1. **Label** — 0.78rem / 700 / uppercase / eucalyptus — STEP 3, BEFORE CHECKOUT, Route, Services, Estimated Investment, Estimated Timeline  
2. **Page title** — 1.2rem / 700 / ink — Studio Plan  
3. **Plan value** — 1.12rem / 700 / ink — route, service, price, timeline; **investment $69** is 1.22rem / denim (findable, not hero)  
4. **Secondary** — 0.92rem / 500 / ink 88% — timeline note, Plan Details hint  
5. **Actions** — 1.02rem / 700 / 0.05em — Change route, Edit Services, Continue to Checkout

Phone plan cards / Plan Details: 78% ivory fill, no backdrop-filter on the card. Before Checkout is quieter (40% ivory). Lounge remains. No global glass token change. No Step 2 frost plate.

---

## Second Samsung pass (contained)

Owner review: type consolidation held. Three remaining issues only.

1. **Plan reading surfaces** — phone Route / Services / Investment / Timeline / Plan Details cards: ivory 64% → **78%** plus `blur(16px)` frost. Lounge still visible around and softly through. Not an opaque slab.
2. **Secondary copy** — timeline and Plan Details notes stay **0.92rem**; ink mix **72% → 88%**.
3. **Before Checkout** — same copy and place. Quieter heading (0.72rem / 650), softer checks, **40%** ivory so the plan cards carry the page.

Bottom actions unchanged. Wording, $69, timeline logic, route/service, checkout, Voice, Studio Review, and Step 2 stay protected.

Do not stamp visual acceptance until Tagia reviews this on the real Samsung.

---

## Third Samsung pass — compositing, not another opacity bump

Owner: 78% ivory still read as dark brown/charcoal windows on the real Samsung. Mural lettering, architecture, and furniture stayed clearly visible through Route / Services / Investment. Do not raise 78%. Before Checkout is quieter — leave it. Typography is not this pass.

**Cascade:** the phone card rule *does* win. Computed background is `color-mix(ivory 78%, transparent)`. `--mc-card` 55% is not the painted declaration.

**What actually produced espresso:**

1. **Card `backdrop-filter` + `overflow: hidden` on the same box** (the previous pass). This is the same Samsung class of bug as `.screen` frost sampling a dark empty box and Voice Choice charcoal when filter sat on a clipped surface. On the phone the filter sampled Lounge through the card and **did not composite the 78% ivory as a covering fill**. That is why raising 64% → 78% did not look like ivory.
2. **Ancestor Voice Choice `.panel`** (`nameQuestionPanel`): `--mc-glass` 46% ivory/cream mix + `.panel::before` `blur(14px)` with no fill of its own. Over Lounge + the room `::after` 18% ink veil, that sheet already reads espresso. Cards sat on it. Left in place so Before Checkout does not shift.
3. **Room `::after` veil** — `color-mix(#2e2b28 18%, transparent)`. Global lounge-light. Not changed.
4. No parent `opacity`, no `mix-blend-mode`, no extra Step 3 dark overlay.

**Fix (Step 3 cards only):** keep 78% ivory; add `isolation: isolate` so the fill flattens as a layer; remove `backdrop-filter` / `-webkit-backdrop-filter` / `overflow: hidden` from `.planFactCard` / `.planDetailsCard`. Ambient frost stays on the Voice Choice panel. Before Checkout 40% untouched. Step 2 frost plate untouched.

Intended read: Lounge around the plan → light ivory reading cards → Lounge only softly suggested through the 22% that is not ivory. Not owner-approved until the Samsung proof.

---

## Fourth Samsung pass — Step 2 environmental frost, not another card opacity

Owner same-device comparison: frozen Step 2 is milky/diffused; Step 3 was a clear window with dark rectangles. Do not guess card opacity. Do not clone service-card states. Step 2 unread except as ruler.

**Step 2 layer that creates the accepted frost:** phone `.nameQuestionFrost` under `[data-stage="services"]` — clipped plate (`overflow: hidden`), ivory 36%, `blur(28px) saturate(1.06) brightness(1.18)`. Panel background is transparent so Voice Choice `.panel` 46% glass is not the painter. Service cards sit *inside* that plate.

**What Step 3 was missing:** no frost plate. Plan used Voice Choice `.panel` 46% + `::before` `blur(14px)` over sharp Lounge. Cards then fought the mural themselves.

**Fix (Step 3 workspace only):** enable the same `.nameQuestionFrost` recipe for `[data-stage="plan"]`; neutralize plan-stage `.panel` fill and `::before` filter. Plan cards stay 78% ivory with no card-local backdrop-filter. Before Checkout, typography, copy, Voice, bottom actions, Step 2 services rules untouched.

Not owner-approved until the real Samsung comparison.

---

## Fifth Samsung pass — frost plate containing context, not blur/opacity

Owner: plate exists but mural lettering and the microphone graphic stay sharp through Step 3. Frozen Step 2 visibly diffuses those details. Do not change 78% cards, helper copy, typography, or buttons.

**Why the same CSS numbers failed on Samsung:** Step 2 `.nameQuestionFrost` sits in a panel with `overflow: visible`. Step 3's plate sat in the shared summary/checkout scroller (`overflow-y: auto` + max-height). Samsung then samples the empty scroller, not Lounge, so `blur(28px)` does not soften the mural. Ivory wash still paints; diffusion does not.

**Fix:** take `[data-stage="plan"]` out of that scroller rule so the plan panel matches Step 2 (`overflow: visible`). Scroll with the page, same as frozen Step 2. Frost recipe unchanged. Cards, Before Checkout, Voice, and Step 2 untouched.
