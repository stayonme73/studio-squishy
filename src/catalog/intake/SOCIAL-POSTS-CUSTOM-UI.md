# Catalog intake schemas vs live Social Posts UI

**Package 3 — Owner decision F2 (intentional divergence).**

## Live customer surface

When a Route Map job has `intakeType === "rtu-social-posts"`, Project Intake renders **`SocialPostsIntakeForm`** in `src/components/route-map/RouteMapIntakeForm.tsx`.

That custom UI owns:

- Chip choices (`socialPostsPurposeChoice`, action, platform, materials choices)
- Optional file-name noting (not file storage)
- Social-specific Save Draft shape written into `routeMapIntakeDraft.answers`

## Catalog schema

`ROUTE_MAP_INTAKE_SCHEMAS["rtu-social-posts"]` in `src/catalog/intake/schemas.ts` remains for:

- Production briefs / internal modeling
- Automated tests that read schemas via `getRouteMapIntakeSchema`
- Post/Publish addon field append experiments

It does **not** automatically drive the live Social Posts customer form.

## Change rule

Before changing either surface, inspect **both**. Updates to one do not update the other unless intentionally coordinated.

Protected by `src/lib/route-map-intake-materials.test.ts` (divergence guard).

## INTAKE-TRUTH-1 — role / placement / order (Machine)

**Do not** add four customer role selects (`offer_lead` / `cta_book` / `dates_window` / `trust_brand`) to either surface. Those names are proven Machine **layout templates** from SOCIAL-POSTS-PROOF-1 (Harbor CERT), not fixed service-contract roles and not live intake choices.

Service contract remains: exactly four coordinated posts, one campaign theme, one platform, Studio-written captions, Studio recommended posting order, one agreed platform size.

Machine mapper: `mapSocialPostsSetStructureFromIntakeAnswers` in `social-posts-intake-truth.ts` — reads campaign-level purpose / action / platform; assigns square `cert-square-1024` ×4; assigns durable `social-post-1…4` + order 1–4; Studio production assigns the four proven layout templates. Captions stay Studio-written. Portrait is not executable from Instagram chip copy alone.
