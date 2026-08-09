# Owner setup — Netlify publish (KITCHEN-LANDING-PAGE-PRODUCTION-1)

**Do not paste tokens into chat.**

This is a **genuine account/credential blocker** only. Page generation, machine QA, responsive Playwright checks, V1→V2 correction, and artifact binding already run without Owner page-building labor.

## Why this is needed

Catalog rm-j005 promises publication through an approved Studio page-delivery method. The Kitchen adapter uses the **Netlify Deploy API** (free tier sufficient). Without credentials, public URL proof cannot complete.

## Steps

1. Create or sign in to a Netlify account (free tier is enough).
2. User settings → Applications → Personal access tokens → **New access token**.
3. Add to local `.env.local` (gitignored):

```
NETLIFY_AUTH_TOKEN=<token>
```

4. Tell Scout: **`NETLIFY_AUTH_TOKEN` is present — create the Netlify site via API and continue publish proof.**
5. Do **not** manually create a site, upload a dummy file, or click AI Agent / GitHub / Upload just to manufacture a Site ID.
6. Scout calls `POST /api/v1/sites`, captures the returned site/project id, persists `NETLIFY_SITE_ID` into `.env.local`, then deploys.
7. Do **not** purchase a paid plan unless free tier is blocked.
8. Do **not** commit secrets.

## After token exists

Scout re-runs `npx tsx scripts/run-landing-page-production.ts` and records public URL + deployment ID on the artifact binding. Localhost is never accepted as publish proof.

## If Scout reports HTTP 401 Access Denied

The value in `.env.local` is present, but Netlify rejects `GET /api/v1/user` with Access Denied. Auth header form is not the bug (Bearer / raw both fail). This means the token string itself is wrong or unauthorized.

Exact recreate path:

1. Open: [https://app.netlify.com/user/applications#personal-access-tokens](https://app.netlify.com/user/applications#personal-access-tokens)  
   (User settings → Applications → **Personal access tokens** — not OAuth apps, not Deploy keys, not Site ID.)
2. Revoke any Kitchen/test tokens you are unsure about.
3. **New access token**:
   - Descriptive name, e.g. `studio-kitchen-landing`
   - If you see **Allow access to my SAML-based Netlify team**, check it (required when the team uses SSO)
   - Choose an expiration that has not already passed
   - Generate token
4. Copy the token **immediately** from the success screen (it is shown once).
5. In `.env.local`, set exactly one line:

```
NETLIFY_AUTH_TOKEN=paste_the_token_here_with_no_spaces
```

Rules:
- No quotes
- No `Bearer ` prefix in the value
- No Site ID / client secret / deploy key
- Do not paste the token into chat

6. Optional self-check in your own terminal (do not share output that includes the token):

```
curl -H "Authorization: Bearer %NETLIFY_AUTH_TOKEN%" https://api.netlify.com/api/v1/user
```

Expect HTTP 200. If that is still 401, the token was not copied correctly or the account/token type is wrong.

7. Tell Scout: **token refreshed — resume publish proof.**

Scout still creates the site via API; you still do not need to upload a dummy file.

## Project visibility (proven path)

**Keep team default: Public for new projects**  
Team settings → General → Visitor access → Default project visibility.

Existing private projects stay private. The Netlify API (as of this package) **cannot** flip an existing private project to public. Scout’s owner-independent workaround: create a **new** site under the Public default and deploy there.

Optional cleanup: delete obsolete private Kitchen test sites in the Netlify UI.

Do not buy Pro just for this. Free tier public visibility is enough.

## Not in this setup

- Custom customer domains (not promised by rm-j005)
- Buying a new host without Owner authorization
- Tagia hand-editing HTML/CSS for routine pages
