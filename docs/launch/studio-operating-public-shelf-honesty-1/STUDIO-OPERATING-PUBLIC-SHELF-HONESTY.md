# PUBLIC SHELF HONESTY

> **HISTORICAL — SUPERSEDED FOR LAUNCH (owner ruling 2026-10-10).** The 11 customer-visible choices below are the old Launch Now shelf. It is not the customer-facing launch menu. The launch menu is the three-package door, unpublished. Authority: `../studio-canonical-launch-truth-1/STUDIO-CANONICAL-LAUNCH-TRUTH.md`.

**Package:** `STUDIO-OPERATING-PUBLIC-SHELF-HONESTY-1`  
**Date:** 2026-09-26  
**Grant:** AUTHORIZE NEXT PACKAGE — PUBLIC SHELF HONESTY  
**Website / beta / marketing / Stripe live / capacity:** not started.  
**Merge:** no. **Push:** no.  
**Factories reopened:** no.

---

## Where the 16-count came from

Customer shelves are built by `getJobsForRoad` / `ROUTE_MAP_V1.jobs` from `getActivationMapShelfEntriesForLane`.

That helper treated every activation-map `active_candidate` as purchasable. That set was:

- **12 V2 RTU SKUs** (the certified 11 plus Voice)
- **4 continuing V1 jobs** still marked `active_candidate` for Batch 3

12 + 4 = **16**. The public story was **11**.

Surfaces that used that list: Conversation Room service list / route peek, Route Map job shelf, Project Builder, Random Exit, I-75, I-20, Update, and Studio Voice shelf answers.

---

## The extra five (not public SELL NOW)

| ID | Customer name | Why it was visible | What we did |
|---|---|---|---|
| `v2-rtu-voice` | Make Me a Voice Announcement | Activation map `active_candidate`; launch class `NOT_AUTONOMOUS_HOLD`; not in the certified 11 | Hidden from public shelf. Factory kept. |
| `rm-j002` | Make Me a Social Profile Setup Kit | Continuing V1, held for Batch 3 | Hidden. Factory kept. |
| `rm-j005` | Make Me a Page for My Sale, Event, Opening, Service, or Offer | Continuing V1, held for Batch 3 | Hidden. Factory kept. |
| `rm-j007` | Update My Existing Promotion | Continuing V1, no V2 equivalent | Hidden. Factory kept. |
| `rm-j008` | Make Me a Social Profile Update Kit | Continuing V1, held for Batch 3 | Hidden. Factory kept. |

Held handout (`v2-rtu-handout`) and retired `rm-j003` / `rm-j004` / `rm-j006` were already off the shelf.

---

## Files changed

- `src/config/route-map-v1.ts` — public roads/jobs filter to certified SELL NOW 11
- `src/lib/studio-customer-life/voice-shelf-truth.ts` — Voice lists the same 11
- `src/config/studio-public-shelf-honesty-v1.ts` — package stamp
- `src/lib/studio-public-shelf-honesty/public-shelf-honesty.test.ts` — stranger proof
- `src/lib/route-map-campaign.test.ts` — shelf counts updated to 11

Internal catalogs, Kitchen 22, dispatch hooks, intake schemas, and `getRouteMapJob` for historical SKUs were not deleted.

---

## Before / after customer-visible counts

| Surface | Before | After |
|---|---|---|
| Unique purchasable shelf (`ROUTE_MAP_V1.jobs`) | **16** | **11** |
| I-75 | 12 | 9 |
| I-20 | 10+ extras | 10 public |
| Update | 7 (incl. rm-j007/008) | 5 public |
| Random Exit | 15 | 10 |
| Voice public shelf answers | included Voice | 11 only |

Road counts differ because not every public SKU sits on every road (business card is I-75 only; email/SMS are I-20 + Random Exit). The **union** is 11.

---

## Proof

- Exactly 11 public SELL NOW IDs match `INTERNAL_SELL_NOW_SKUS`
- No withheld / held / retired ID on I-75, I-20, Update, Random Exit, Lobby/plan selection, Route Map, or Voice
- Prices: flyer $69 · campaign graphics $79 · social posts $99 · business card $69 · menu $89 · service sheet $79 · email kit $129 · SMS kit $69 · short video $149 · **Short-Form Video Editing $349** · **Clip Repurposing $549**
- Original nine prices unchanged
- Each public SKU still routes to its own intake template
- Kitchen `ACTIVE_CUSTOMER_FACING_SKUS` still **22**
- `getRouteMapJob` still resolves Voice and the four V1 jobs for existing records

Tests: **119 passed** (honesty harness, Route Map campaign, Voice shelf, $349 / $549 publish, mobile conversation).

---

## Remaining mismatch (honest, not a leak)

- Activation map still *lists* Voice and the four V1 jobs internally as `active_candidate`. That is factory/planning truth, not the customer shelf.
- Kitchen 22 still includes those SKUs so production contracts stay alive.
- Old links / historical campaigns can still resolve `rm-j006` → Voice. A stranger cannot discover Voice as a new purchasable service.

---

## STOP

Shelf honesty only. Desk WHITE. Website, testers, advertising, Stripe-live, and capacity stay parked.