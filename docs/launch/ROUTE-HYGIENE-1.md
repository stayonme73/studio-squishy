# ROUTE-HYGIENE-1

**Status:** PRODUCT COMMITTED · **DOCS SEAL PENDING PUSH**  
**Type:** Narrow checkout / quarantine shell seal (not full CR-5 route inventory hygiene)  
**Product commit:** `74a378e7d632d78fae2c24278f6187803310a646`  
**Subject:** `fix: align checkout quarantine and Conversation Room front door`  
**Branch:** `fix/discovery-responsive-layout`  
**Parent tip:** `ee1f48a6be440a161d6ac6012413cde50c4fdbdd`  
**Authority:** AUTHORIZE ROUTE-HYGIENE-1  

---

## Accepted result

| Field | Value |
|---|---|
| Scope | Narrow checkout quarantine list + redirect shells + Conversation Room front-door copy/tests |
| Full CR-5 `ROUTE-HYGIENE` inventory reconcile | **Remains open** |
| Payment/refund product behavior | **Not reopened** beyond truthful redirect-shell alignment |
| Production build | **Not run** — narrow redirect-shell surface; tip TypeScript baseline unchanged by this package |
| Gate #21 | Certified on clean branch `cert/gate-21-route-honesty` @ `08f09f5` only — **not integrated** |
| Protected readiness | Remains **4 fully complete · 12 CWL · 16 of 23** until Gate #21 transfers and pushes |
| Main porcelain after product commit | **107** unrelated entries left untouched |

---

## Product files (committed)

1. `src/config/legacy-route-quarantine-v1.ts` — `"/checkout"` added to `LEGACY_QUARANTINED_ROUTES`
2. `src/app/checkout/page.tsx` — no competing `CheckoutScene`; `redirect(legacyRouteQuarantineV1.activeCheckout)`
3. `src/components/payment/SecureCheckoutPageScene.tsx` — redirect via `activeCheckout` (no `/checkout` hop)
4. `src/components/payment/PaymentCheckoutScene.tsx` — legacy export comment aligned
5. `src/lib/navigation-cleanup-v1.test.ts` — Conversation Room front door + quarantine asserts
6. `src/config/welcome-hall-phase1.ts` — Welcome Hall copy no longer advertises Route Map
7. `src/components/studio-conversation-room/guide/ConversationRouteChoose.tsx` — alt text “route chooser” (eyebrow left for Gate #21)
8. `src/components/route-map/RouteMapScene.tsx` — recovery → Conversation Room

---

## Required behavior sealed

- `/checkout` is in legacy quarantine authority  
- `/checkout` does not mount a competing legacy checkout experience  
- Checkout redirects use existing `activeCheckout` authority  
- Conversation Room remains the truthful customer front door  
- Welcome Hall copy no longer advertises Route Map as the next room  
- Route chooser alt text no longer names a retired Host room  
- Route Map recovery directs customers back to Conversation Room  
- Focused navigation tests reflect active front door and quarantine authority  

---

## Validation

| Suite | Result |
|---|---|
| `navigation-cleanup-v1` | **6/6 PASS** |
| `project-record-canonical-route` | **8/8 PASS** |
| `studio-intake-handoff` | **9/9 PASS** |
| `browser-safe-redirect-url` | **4/4 PASS** |
| Static redirect / front-door smoke | **21/21 PASS** |

**Baseline out of scope (not part of this package):** `help-center-navigation.test.ts` still carries a tip-stale `"/route-map"` expect alongside `activeFrontDoor` — left untouched for Gate #21 / later hygiene.

---

## Gate #21 preservation (for later transfer)

When Gate #21 lands after this seal:

- Keep this package’s RouteChoose **alt-text** improvement  
- Add Gate #21 **Conversation Room** eyebrow  
- Keep this package’s sealed Welcome Hall **kioskLabel** wording  
- Keep this package’s **quarantine** assertions  
- Add Gate #21 scaffold non-advertisement assertions for `/account` · `/past-campaigns` · `/creative-room`  

Do not overwrite one package’s truth with the other.

---

## Explicit limits

1. Full redirect ↔ quarantine inventory reconcile remains open (CR-5 future `ROUTE-HYGIENE`)  
2. Does **not** close Gate #21  
3. Does **not** build scaffold rooms  
4. Product commit local until Tagia authorizes push  
5. Docs fanout limited to this file · Master List · Scout handoff  

---

## Fanout

- `docs/launch/ROUTE-HYGIENE-1.md` (this file)  
- `docs/launch/STUDIO-MASTER-LAUNCH-LIST.md`  
- `docs/launch/SCOUT-CONTROL-POINT-HANDOFF.md`  
