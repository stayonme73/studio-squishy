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
