# Defect ledger — mobile journey readiness

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`  
**Scope:** readiness pass only. Real-phone certification is not stamped here.

---

## MJ-D1 — Sandbox pay control missing after hydration

**Found:** Gate X live notes and this pass. `SecureCheckoutGrid` computed sandbox visibility with `useMemo` reading `window.location.search`. On the server `window` is undefined, so the first paint is hidden. Hydration could keep the fixture out of the DOM even with `?studioPaymentSandbox=1`.

**Fix:** Client `useEffect` after mount sets visibility from `window.location.search`. Production without sandbox availability still hides the fixture. Tests in `hosted-checkout-ui.test.ts` guard the source pattern.

**Retest:** Unit/source preflight. Real-phone proof is Tagia step 6 tomorrow.

---

## MJ-D2 — Lobby dropped the sandbox query

**Found:** `Let’s Get Started` assigned `/studio-conversation-room` with no search. `begin-new` redirected with `browserSafeRedirectUrl`, which cleared all query. Phone cert depends on `?studioPaymentSandbox=1` because `NEXT_PUBLIC_DEV_TOOLS` is unset.

**Fix:** `withStudioPaymentSandboxQuery` on Lobby JS, film no-JS href, `/` and `/studio-lobby` guide redirects, and `begin-new`. `browserSafeRedirectUrl` now keeps caller-provided query and still does not copy incoming request query onto a bare path.

**Retest:** `sandbox-query.test.ts`, `browser-safe-redirect-url.test.ts`. Real-phone proof is Tagia steps 1–6 tomorrow.

---

## MJ-L1 — Review / approval / delivery need an honest production seed

**Not a silent product fake.** Payment and intake do not invent `ready_for_review`. Customer-One E2E used an honest seed. The owner guide stops after Board communication so Scout can seed review state before Tagia continues steps 18–20.

**Not fixed as auto-advance.** Recorded as a readiness limit, not a Room 4C/4B reopen.

---

## Out of contract (not fixed)

- Visual redesign of sealed Lobby / Conversation Room / Board  
- Public tunnels  
- Carousel on Launch Now  
- Merging  
- Room 5  
- Reopening Gate X, Room 4B, or Room 4C without a demonstrated mobile defect  
