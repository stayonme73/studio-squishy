# AUTH-GATE-1 — Project Record Page Authentication Gate

## 1. Protected tip and scope

**Base tip:** `62664777ca00619c8079f508298454de799632e5`
**Branch:** `fix/discovery-responsive-layout`
**Package:** Narrow page-gate repair only — bring `/campaign-details` under the existing purchased-room session proxy.

## 2. AUTH-TRUTH-1 finding

AUTH-TRUTH-1 identified one Customer-One blocker: `/campaign-details` was missing from the proxy authentication gate that already protects Board, Review, and Delivery. Campaign APIs already enforce session + ownership. No cross-customer API leak was proven.

## 3. Exact missing route gate

Before repair:

- `isClientRoute` omitted `/campaign-details`
- proxy `matcher` omitted `/campaign-details`
- signed-out `GET /campaign-details` returned **200**
- `SAFE_RETURN_PATHS` omitted `/campaign-details`
- `CampaignDetailsScene` ignored `accessState` and could show empty-campaign UX for auth/deny cases

## 4. Existing session contract reused

Same HMAC cookie session check via `readSessionFromCookieHeader` and the same `signInRedirect(..., from=)` pattern used for `/studio-board`.

## 5. Proxy matcher change

Added `/campaign-details` to:

- `isClientRoute` in root `proxy.ts`
- `config.matcher` in root `proxy.ts`
- `config.matcher` in `src/proxy.ts` (re-export config must stay aligned)

## 6. Safe return-path change

Added `/campaign-details` to `SAFE_RETURN_PATHS` in `src/lib/auth/safe-return-path.ts`.

## 7. Campaign Details access-state behavior

`CampaignDetailsScene` now mirrors Board / Review / Delivery:

- loading while `!ready`
- `ClientAccessStatePanel` for `auth-required` / `denied` / `error` / `no-active-project`
- empty Project Record copy only when `accessState === "ready"` and no campaign
- authorized record only when ready + authorized

Job/activity fetches use the authorized campaign only.

## 8. Authentication versus authorization boundary

| Layer | Responsibility |
|---|---|
| Proxy | Valid customer session before page render |
| Campaign APIs | Ownership / 401 / 403 (unchanged) |
| Scene | Truthful client presentation of access states |

## 9. Signed-out proof

HTTP + browser: `GET /campaign-details` → **307** `/sign-in?from=%2Fcampaign-details`. No usable Project Record shell.

## 10. Authorized proof

Signed-in owner with disposable campaign opens Project Record; refresh keeps access.

## 11. Wrong-customer proof

`client-b` with foreign `campaignId` shows no foreign campaign name; denied/unavailable UX.

## 12. Sign-out and browser-back proof

After logout, protected campaign content is not restored as usable; direct revisit returns to Sign In.

## 13. Regression route proof

Signed-out `/studio-board`, `/feedback-studio`, `/deliverables` still redirect to Sign In. Help Center and Sign In remain public **200**.

## 14. Desktop proof

~1440px authorized + signed-out scenarios PASS.

## 15. Phone proof

~390px wrong-customer path PASS; no horizontal overflow.

## 16. Automated tests

`npx vitest run src/lib/auth/auth-gate-1-project-record.test.ts` → **8/8 PASS**.

With sync-client auth guard suite: **17/17 PASS**.

## 17. Dirty WIP boundary

Did not stage or modify dirty timeout/sign-out files. Reverted accidental touch of dirty `journey-hydration-first-paint.test.ts`.

## 18. Explicit exclusions

No Auth framework swap, password/timeout redesign, COMM, Materials, Board/Review/Delivery redesign, MLL update, or API ownership rewrite.

## 19. Customer-One impact

Project Record now requires the same server session gate as other purchased rooms, with truthful access states and safe post-sign-in return.

## 20. Remaining Auth limits

- Inactivity timeout remains client-driven
- Page gates are session-auth; ownership remains API-enforced
- Hierarchy C #6 may still need a later MLL truth refresh after this package is protected
- Email-verification hard-before-Board policy remains a separate Auth sequence item when Tagia authorizes

## 21. Final recommendation

Approve AUTH-GATE-1 commit when Tagia accepts the staged boundary. Do not open another Auth package until authorized.
