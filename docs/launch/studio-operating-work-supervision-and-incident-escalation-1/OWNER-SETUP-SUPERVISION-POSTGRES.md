# Owner setup — supervision Postgres (names only)

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**Pass:** 3C (Secret Key header correction)  
**Live two-process proof:** passed (sanitized evidence). Package remains OPEN.  
**Live REST/RPC connector:** ready in code

Do not paste secret values into chat, commits, Scout, or screenshots. This page lists names and server-side steps only.

After this correction, Tagia should use the **current Supabase Secret Key**, not the retiring JWT `service_role` key.

## What production requires

Launch runtime (`NODE_ENV=production`, `NETLIFY=true`, or `STUDIO_SUPERVISION_RUNTIME=launch`) refuses memory and `studio-data-json`. It initializes the live Supabase Postgres connector, verifies schema version 2, and hydrates records. It never silently falls back to JSON or memory.

Supabase object/file storage is not the incident database.

## Environment-variable names

Set these on the **server** through an approved local or Netlify secret-setting path. Never `NEXT_PUBLIC_` for a secret. Never send a secret key to the browser, logs, proofs, Git, or chat.

| Name | Role |
|------|------|
| `STUDIO_SUPERVISION_SUPABASE_URL` | Preferred project URL |
| `STUDIO_SUPERVISION_SUPABASE_SECRET_KEY` | **Preferred.** Current server-only Secret Key (`sb_secret_…`). Sent only as the `apikey` header. Never as `Authorization: Bearer`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Allowed fallback for the URL only |
| `STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY` | Legacy JWT `service_role` compatibility fallback only |
| `SUPABASE_SERVICE_ROLE_KEY` | Older legacy JWT fallback only |

JSON-file local variables remain valid for local development only (`STUDIO_SUPERVISION_DATA_DIR`, `STUDIO_SUPERVISION_REQUIRE_DURABLE`, `STUDIO_SUPERVISION_DISABLE_LIVE_SWEEP`).

Do **not** set `STUDIO_SUPERVISION_ALLOW_INPROCESS_POSTGRES` in production.

## Owner steps remaining

1. Local URL + current Secret Key are in ignored `.env.local`. Do not paste secrets into chat.  
2. Both migrations are applied (schema version 2). Do not rerun them unless a genuine SQL defect appears.  
3. The live two-process proof has passed.  
4. Before treating Netlify as durable, place the same **names** (`STUDIO_SUPERVISION_SUPABASE_URL`, `STUDIO_SUPERVISION_SUPABASE_SECRET_KEY`) through the approved deployment secret path. Do not paste values into chat.  
5. Do not connect Build-A-Bot or a scheduler until Tagia separately authorizes it.

Installed schema version 2 does not need to be undone for this header correction.

## What the connector already does

When those variables are present, the Machine selects `supabase-postgres`, verifies schema, hydrates, and writes through transactional RPCs. Current `sb_secret_` keys are sent only in `apikey`. A live two-process proof against the real database has passed with fictional Maple/Harbor records. The package is not closed.
