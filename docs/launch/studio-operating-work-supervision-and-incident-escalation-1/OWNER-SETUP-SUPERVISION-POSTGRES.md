# Owner setup — supervision Postgres (names only)

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**Pass:** 3B  
**Live production certified:** no

Do not paste secret values into chat, commits, or evidence files. This page lists names and server-side steps only.

Pass 3B ships the adapter, SQL migration, and deterministic tests. It does **not** claim a live Supabase project is configured.

## What production requires

Launch runtime (`NODE_ENV=production`, `NETLIFY=true`, or `STUDIO_SUPERVISION_RUNTIME=launch`) refuses memory and `studio-data-json`. It requires a shared Supabase **Postgres** record store. Supabase object/file storage is not the incident database.

## Environment-variable names

Set these on the **server** (Netlify site env / Owner secrets store). Never `NEXT_PUBLIC_` for the service-role key. Never send the service-role key to the browser.

| Name | Role |
|------|------|
| `STUDIO_SUPERVISION_SUPABASE_URL` | Preferred project URL for the supervision adapter |
| `STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY` | Preferred service-role key (server only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Allowed fallback for the URL only |
| `SUPABASE_SERVICE_ROLE_KEY` | Allowed fallback for the service-role key |
| `STUDIO_SUPERVISION_RUNTIME=launch` | Optional explicit launch classification |
| `STUDIO_SUPERVISION_PROVIDER=supabase-postgres` | Optional explicit provider request |

Do **not** set `STUDIO_SUPERVISION_ALLOW_INPROCESS_POSTGRES` in production. That flag is a deterministic in-process stand-in and is not live certification.

JSON-file local variables remain valid for development only:

| Name | Role |
|------|------|
| `STUDIO_SUPERVISION_DATA_DIR` | Local `studio-data-json` directory |
| `STUDIO_SUPERVISION_REQUIRE_DURABLE=1` | Forbids memory in local controlled proofs |
| `STUDIO_SUPERVISION_DISABLE_LIVE_SWEEP=1` | Disables in-process sweep ticks |

## Owner steps (server-side)

1. Create or select a Supabase project that will hold supervision **records**, not just file storage.  
2. Apply `supabase/migrations/20260823_supervision_launch_runtime.sql` in the Supabase SQL editor or CLI.  
3. Confirm the service-role key is stored only in server environment variables.  
4. Confirm the anon/authenticated browser key cannot read supervision tables (the migration revokes those grants).  
5. Do not mark production certified until a later authorized live proof: two separate processes against the real database, competing sweep claims, missed-heartbeat continuation, tenant isolation, and fail-closed launch start.

## After credentials exist

Pass 3B still will not claim live production. The live REST hydrate/flush path is not wired. Authorize a later live proof pass before treating Netlify as durable.
