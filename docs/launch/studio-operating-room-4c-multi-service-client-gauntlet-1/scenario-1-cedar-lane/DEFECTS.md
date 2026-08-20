# Defects and explicit limits — Scenario 1

## Blocking defect found and corrected (fact integrity)

The first customer-facing artwork used invented contact facts:

- Phone shown: `(804) 555-0172`
- URL shown: `cedarlaneorganizing.example/fall-reset`

Canonical facts (Tagia):

- Phone: `(804) 555-0147`
- Booking URL: `cedarlaneorganizing.example/book`

Automated copy/campaign checks passed because they compared outputs to Scout’s invented brief, not to Tagia’s facts. That closed loop is the Room 4C failure mode. Current deliverables and render sources bind to the canonical pair. Tests now assert the exact phone and URL on caption, narration, print contact layer, and video CTA plate copy — not merely that “a phone” exists.

## Print format versioning (not a silent Room 4B rewrite)

US Letter is contract `campaign-print-handout-v2-us-letter` (2550×3300 PNG, PDF 612×792 pt). Historical Room 4B replay stays on `campaign-print-handout-v1` (1024×1536). The unnamed default canvas map was restored to v1. Cream full-bleed date color is scoped to the Cedar Lane visual system; Rooted & Ready replay stays muted.

## Visual print notes (corrected, not redesigned)

Supporting copy is larger over a darker overlay. Contact matches CTA size with extra bottom safe margin. Photograph, palette, and headline hierarchy were kept.

## Refusals (correct)

- Carousel refused (not on Launch Now menu).
- Ad ops refused.
- No invented price.

## Explicit limits (do not hide)

- Frozen Launch Now services remain READY WITH EXPLICIT LIMITS. Classifications were not changed.
- Voice TTS still enters through the `ap-001` adapter while routing is supporting narration for `v2-rtu-short-video`. Disclosed; not sold as a voice announcement.
- Photography is Studio-generated for this fictional promo, not a customer photo pack (that is Scenario 3).
- Square social CTA is the label “Book a consult”; phone and URL live on caption + handout + video end plate.
- Mobile notes are responsive coverage, not Room 4 mobile certification.
- Video pacing/text timing still needs Tagia watching and listening to the revised MP4. Machine duration 20.0s does not replace that review.

## Not defects

- Coordinated campaign identity: same closet photograph, same sage/cream system, same offer/dates/CTA.
- Phone preview is a complete 390×390 resize of the square, not a crop.
- No unsupported claims in caption or on-art copy.
- No owner production labor.
