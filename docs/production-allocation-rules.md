# Production Allocation Rules

**Status:** Locked business rules  
**Purpose:** Prevent the Discovery generator from recommending unlimited services  
**Last updated:** June 26, 2026

> **LOCKED:** Changes require explicit approval from Tagia.

---

## Purpose

The Discovery generator must not recommend unlimited services.

The recommendation must stay within The Studio's production allocation rules so the system does not promise work we did not intend to include.

---

## Service Classes

Use these service classes:

### Signature

Formerly Level C / Hard / most difficult.

Highest production effort.

### Core

Formerly Level B / Medium.

Moderate production effort.

### Essential

Formerly Level A / Soft / easiest.

Supporting production effort.

Do not use the words hard, medium, soft, difficulty, or easy in customer-facing UI.

### Internal mapping

| Legacy | Studio class |
|--------|--------------|
| Level C | Signature |
| Level B | Core |
| Level A | Essential |

---

## Included Recommendation Limits

The automatic recommendation may include:

| Service class | Maximum included |
|---------------|------------------|
| Signature | 1 |
| Core | 2 |
| Essential | 4 |

These limits apply to the automatically generated recommendation.

The system must never generate more than these included limits unless the customer manually adds services.

**V1 decision:** Essential included limit = 4. That gives enough support pieces without turning the plan into a buffet plate with no bottom.

---

## Current Service Class Assignments

### Signature Services

- BF-001 Brand Identity Refresh
- BF-002 Brand Messaging
- CP-001 Marketing Campaign
- SM-001 Social Media Marketing
- CC-001 Marketing Copywriting
- VP-001 Marketing Video Production
- LP-001 Landing Pages & Web Content

### Core Services

- EM-001 Email Marketing
- SMS-001 SMS Marketing
- CC-002 Content Writing
- AP-001 AI Voice Over Production
- MO-001 Marketing Optimization

### Essential Services

- MA-001 Marketing Assets

---

## Recommendation Behavior

After Discovery scoring is complete:

1. Rank services by score.
2. Select no more than:
   - 1 Signature
   - 2 Core
   - 4 Essential
3. If more services score highly, place them in a section called **Additional Studio Services Available**.
4. Additional Studio Services are not included automatically.
5. If the customer chooses to add them, they are treated as paid add-ons.
6. Pricing must come from the Service Catalog only.
7. Do not guess add-on pricing inside Discovery.

---

## Substitution Rules

The customer may remove or swap recommended services.

### Allowed no-price-change swaps

- Signature for Signature
- Core for Core
- Essential for Essential

### Upgrade required

- Essential swapped for Core
- Essential swapped for Signature
- Core swapped for Signature
- Adding any service beyond the included allocation

### Downgrade allowed

- Signature swapped for Core or Essential
- Core swapped for Essential

If a downgrade creates unused allocation, do not automatically refund or reprice unless pricing rules explicitly support that later.

---

## Customer Choice Rules

The recommendation is not mandatory.

Customer may:

- Accept the recommendation.
- Remove services.
- Substitute services within the same class.
- Add services from the Studio Services menu.
- Build a final Studio Plan from available Studio Services.

The final Studio Plan must only contain services from the approved Studio Services menu.

---

## Safety Rule

If the generator cannot confidently map a customer answer to approved Studio Services, it should not invent a service.

It should flag the answer for review or return:

> This request may be outside our current Studio Services.

---

## Customer-Facing Language

Do not show:

- Signature
- Core
- Essential
- Level A
- Level B
- Level C
- difficulty
- production allocation
- production class

Customer sees only:

- Recommended Studio Services
- Additional Studio Services Available
- Add to My Studio Plan
- Replace This Service
- Review My Studio Plan

---

## Developer Rule

Business limits must live in the Service Catalog or a central recommendation configuration.

Do not hard-code these limits inside UI components.

Implementation: `src/catalog/production-allocation.ts` (limits, class mapping, substitution rules, section labels).

---

## Add-On Services

Add-On Services are a business rule only — not a Studio Service catalog entry.

Additional Studio Services, revisions, or production beyond the customer's Studio Plan are governed by the Service Catalog.
