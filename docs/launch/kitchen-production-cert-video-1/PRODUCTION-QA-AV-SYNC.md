# Production QA rule — A/V beat synchronization

**Package:** KITCHEN-PRODUCTION-CERT-VIDEO-1  
**Rule ID:** `av_beat_synchronization_per_artifact`  
**Status:** Mandatory for every customer short-video artifact  

## Why this exists

V5 proved owner-independent Shotstack Production can deliver a coherent short video with the major message beats present.

Owner review also found a **minor timing lag** on topic-card transitions (notably around “Sessions begin…” and “Call…”). That is a routine production QA issue, not a reason to burn further certification credits on an internal fixture.

## Rule

Before customer delivery:

1. Watch the **exact bound MP4 with sound** (path + SHA-256 for that job).
2. Confirm each major spoken beat has matching on-screen support when it matters:
   - brand / business identity
   - offer + price
   - deadline
   - session timing
   - contact / booking detail
   - final CTA
3. If the artifact fails A/V beat-sync QA → **production regenerates before delivery** (Creative Production → QA). Owner is not required for ordinary timing fixes.
4. **Per-artifact gate:** no customer artifact may inherit readiness from a prior video/hash (including cert V5 or any other campaign).
5. Do **not** treat fractional timing polish on internal fixtures as a paid certification loop.

## Explicit limit (customer-ready language)

`v2-rtu-short-video` is **CUSTOMER READY WITH LIMITS — MP4**.

**Limit:** Final A/V beat synchronization remains a mandatory per-artifact QA check before customer delivery. Failed sync check requires regeneration.
