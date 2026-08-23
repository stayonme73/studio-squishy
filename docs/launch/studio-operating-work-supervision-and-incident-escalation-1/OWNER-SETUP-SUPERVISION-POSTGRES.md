# Owner setup — supervision Postgres (names only)

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**Pass:** 3C  
**Live production certified:** no  
**Live REST/RPC connector:** ready in code

Do not paste secret values into chat, commits, Scout, or screenshots. This page lists names and server-side steps only.

After Pass 3C, Tagia only needs to configure the project and authorize the real two-process proof. There is no remaining connector coding gap.

## What production requires

Launch runtime (`NODE_ENV=production`, `NETLIFY=true`, or `STUDIO_SUPERVISION_RUNTIME=launch`) refuses memory and `studio-data-json`. It initializes the live Supabase Postgres connector, verifies schema version 2, and hydrates records. It never silently falls back to JSON or memory.

Supabase object/file storage is not the incident database.

## Environment-variable names

Set these on the **server** through an approved local or Netlify secret-setting path. Never `NEXT_PUBLIC_` for the service-role key. Never send the service-role key to the browser.

| Name | Role |
|------|------|
| `STUDIO_SUPERVISION_SUPABASE_URL` | Preferred project URL |
| `STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY` | Preferred service-role key (server only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Allowed fallback for the URL only |
| `SUPABASE_SERVICE_ROLE_KEY` | Allowed fallback for the service-role key |

JSON-file local variables remain valid for local development only (`STUDIO_SUPERVISION_DATA_DIR`, `STUDIO_SUPERVISION_REQUIRE_DURABLE`, `STUDIO_SUPERVISION_DISABLE_LIVE_SWEEP`).

Do **not** set `STUDIO_SUPERVISION_ALLOW_INPROCESS_POSTGRES` in production.

## Owner steps remaining

1. Select or create a Supabase project that will hold supervision **records**, not just file storage.  
2. Apply both migrations, in order:  
   - `supabase/migrations/20260823_supervision_launch_runtime.sql`  
   - `supabase/migrations/20260824_supervision_live_connector.sql`  
3. Place the two server-only environment variables through the approved secret-setting path.  
4. Authorize the real two-process live proof (separate processes against the real database). Do not treat Netlify as durable until that proof is accepted.

## What the connector already does

When those variables are present, the Machine selects `supabase-postgres`, verifies schema, hydrates, and writes through transactional RPCs (`supervision_accept_heartbeat`, `supervision_upsert_incident_with_events`, `supervision_try_claim_sweep`, `supervision_apply_ops`, and related functions). Pass 3C proved those requests against a deterministic PostgREST stub. That is not live Supabase certification.
