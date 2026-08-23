# Journey route and control map

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`  
**Spine:** live Conversation Room customer path (not Host Route Map as the cert spine)  
**Date:** 2026-08-22

This maps each required phone action to an existing live route and control. It is readiness documentation. It is not a sealed phone run.

---

## Required journey → live route

| # | Phone action | Live route / surface | Primary control |
|---|----------------|----------------------|-----------------|
| 1 | Enter Studio | `/` or `/studio-lobby` with `?studioPaymentSandbox=1` | Lobby Entry Film |
| 2 | Begin | `/lobby-entry/begin-new` (no-JS) or Let’s Get Started JS | `LET’S GET STARTED` → `/studio-conversation-room?studioPaymentSandbox=1` |
| 3 | Talk | Conversation Room tablet | Use Voice guidance / type |
| 4 | Discovery | Conversation Room, discovery questions | Live Q1–Q4 + later fit questions |
| 5 | Route + services | Conversation Room service building / Studio Plan | Keep Make My Campaign Graphics (`v2-rtu-promotion-graphics`). Do not send Launch Now id `campaign-creative` as `job.skuId`. Do not add carousel. |
| 6 | Sandbox pay | Conversation Room checkout panel (`SecureCheckoutGrid`) | Terms checkbox + **Test pay with sandbox confirm** (`data-developer-fixture="sandbox-confirm"`). Handler: `handleSandboxCheckoutConfirm` with `preferSandbox: true`. |
| 7 | Intake | Conversation Room `?stage=intake` | Intake form on the tablet |
| 8 | Account handoff | `/account-handoff?from=/studio-board` | **Create Account** (primary), Sign In (secondary) |
| 9 | Board | `/studio-board` (auth-gated) | Project status, materials, composer |
| 10 | Materials + rights | Board `MaterialsIntakePanel` → `PATCH /api/campaigns/{id}/materials` | Per-file attestation radios (Gate X copy). Unique radio names per slot. |
| 11 | Communicate + status | Board communication section | Composer send; in-product status. Email/SMS/push are not the source of truth. |
| 12 | Review / feedback | `/feedback-studio` · `/review-room` | Review tools + feedback. Requires honest production-state seed after materials. |
| 13 | Final approval | Review / Final surfaces | Approve control |
| 14 | Delivery + download | `/deliverables` | Download released files |

Host Route Map (`/route-map` → `/project-builder` → `/checkout`) remains a live Host path. It is **not** the cert spine for this package.

---

## Persistence

| Event | Expected |
|-------|----------|
| Lobby → Conversation Room | `studioPaymentSandbox=1` preserved (readiness fix) |
| Conversation Room stage changes | Working draft + session snapshot; query flag kept (return URL only strips `payment` / `session_id`) |
| Phone refresh after sign-in | Session cookie + Board campaign still present |
| Return to Lobby before pay | Working draft must not erase captured answers |
| Account create | Session cookie set; `window.location.assign` to Board (phones must not stick on `/sign-in`) |

---

## Desktop-only / touch risks noted in readiness (not a phone stamp)

| Risk | Status |
|------|--------|
| Sandbox fixture hidden after SSR hydration | **Fixed** in this pass: client `useEffect` after mount |
| Lobby dropped `studioPaymentSandbox=1` | **Fixed** in this pass: Lobby, begin-new, and `browserSafeRedirectUrl` preserve caller query |
| Dev settings jumper on Board | Local-only; Tagia must not use it. Not the customer path. |
| Review/delivery after pay+intake | Honest limit: production state is not invented. Scout seeds after Tagia’s stop in the owner guide. |
| Self-signed HTTPS warning | Expected for local `dev:https`. Not a product redesign. |
| Keyboard covering fields | Watch on the real phone. Preflight cannot certify this. |
| Required browser zoom | Watch on the real phone. Existing `mobile-route-fixes.css` is not this cert. |

---

## Error and blocked-action cases prepared

| Case | Fixture | Expected live behavior |
|------|---------|------------------------|
| Corrupt upload | `northwind-corrupt.png` | Technical rejection; customer can try again |
| Third-party without authority | `northwind-shelf-with-fictional-labels.jpg` | `QUARANTINED` / hold — not unrestricted clear |
| Crop/adapt denied | `pine-petal-no-crop-menu.pdf` | `CLEARED_WITH_LIMITS` + `no_crop_adapt` |
| Ordinary cleared logo | `pine-petal-ordinary-mark.png` | Cleared for this project when answers match |

Do not request new personal photographs from Tagia. Do not use Gate X owner staging (emptied).
