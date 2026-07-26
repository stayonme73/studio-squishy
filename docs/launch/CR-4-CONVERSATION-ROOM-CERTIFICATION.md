# CR-4 — Conversation Room End-to-End Certification

**Status:** **CERTIFIED — PASS** (with explicit non-blocking deferrals)
**Certified product tip:** `02657aa1edc8e73c6b04d9a7ef843509a50dba3a`
**Branch:** `fix/discovery-responsive-layout` (`0 ahead / 0 behind` at certification)
**Generated:** 2026-07-26 (full matrix + Row 25 signed-out auth continuation)
**Required rows:** **30 PASS · 0 FAIL · 0 BLOCKED**

## Environment

| Item | Value |
|---|---|
| Cert tree | `C:\Users\tagia\studio-squishy-cr4-cert` (detached at tip) |
| `node_modules` | Real directory (not a junction) |
| Node / npm | v24.15.0 / 11.12.1 |
| Browser | Playwright Chromium (headless) |
| Server | `next start` @ `http://127.0.0.1:3022` (production) |
| Material env | `NEXT_PUBLIC_PAYMENT_SANDBOX=1` (bake-time) · `SESSION_SECRET` set at runtime |
| Dirty main WIP | Not used by the cert server |

```
git rev-parse HEAD
# 02657aa1edc8e73c6b04d9a7ef843509a50dba3a
node --version   # v24.15.0
npm --version    # 11.12.1
```

## Protected repair chain (do not reopen)

| Package | Tip |
|---|---|
| CR-4R1 Runtime null-guard | `5c719ab4…` |
| CR-4R2 Continuity alignment | `3f89c80d…` |
| CR-4R3 Voice preference stacking | `318d89da…` |
| CR-4R4 Session scrim / nav | `f0a122cb…` |
| CR-4R5 Presentation tablet clearance | `02657aa1…` |

## Signup API 500 — diagnosis (FIRST ACTION)

| Field | Result |
|---|---|
| Request | `POST /api/auth/signup` |
| Payload shape | `{ email, password, displayName }` (no secrets logged) |
| Prior status | **500** |
| Prior body | `{"error":"SESSION_SECRET is not configured"}` |
| Root cause | **Certification environment** — production `next start` lacked `SESSION_SECRET` |
| Product defect? | **No** — `createSessionToken` correctly throws when unset (`src/lib/auth/session.ts`) |
| Correction | Set runtime `SESSION_SECRET` when starting the cert server; rebuild with `NEXT_PUBLIC_PAYMENT_SANDBOX=1` |
| After correction | Signup **200**, session cookie set; signed-in Board handoff **PASS** |

## Matrix 1 — Production build

```
NEXT_PUBLIC_PAYMENT_SANDBOX=1 npm run build
```

**PASS** on tip `02657aa`. No uncommitted product files in the cert tree.

## Matrix 2 — Automated protected regression

```
npx vitest run src/lib/route-map-intake-continuity.test.ts \
  src/lib/studio-intake-handoff.test.ts \
  src/lib/studio-voice-board-handoff.test.ts \
  src/lib/studio-conversation-framework \
  src/lib/studio-conversation-phase-gates \
  src/lib/studio-working-draft \
  src/lib/conversation-room-draft \
  src/lib/studio-guide-lobby-boot.test.ts \
  src/lib/studio-presence-system-v1.test.ts \
  src/lib/payment-plan-summary.test.ts

CERT_BASE_URL=http://127.0.0.1:3022 node scripts/cert-cr4r-interaction-proof.mjs
CERT_BASE_URL=http://127.0.0.1:3022 node scripts/cert-cr4r5-tablet-scrim.mjs
npx tsc --noEmit
```

| Suite | Result |
|---|---|
| Focused vitest (13 files) | **100/100 PASS** |
| Extra auth/handoff/attribution/lobby-begin | **26/26 PASS** |
| CR-4R interaction proof | **49/49 PASS** |
| CR-4R5 tablet-scrim proof | **51/51 PASS** |
| Conversation Room tsc errors | **0** |
| Auth path tsc errors | **0** |
| Unrelated tsc baseline | **66** |

Full journey harness (pre–Row 25): **PASS=105 · FAIL=0 · BLOCKED=0 · N/A=3**
Focused Row 25 harness (`CERT_FOCUS=row25`): **PASS=17 · FAIL=0 · BLOCKED=0 · N/A=0** (includes signed-out auth continuation **PASS**)

## Final 30-row matrix

| # | Row | Result | Evidence basis |
|---|---|---|---|
| 1 | Production build | **PASS** | `npm run build` with sandbox bake-in @ `02657aa` |
| 2 | Automated protected regression | **PASS** | 100/100 + 49/49 + 51/51 + 26/26 |
| 3 | Desktop 1440 | **PASS** | Viewport + complete journey |
| 4 | Phone 390 | **PASS** | Viewport + complete journey |
| 5 | Narrow phone 360 | **PASS** | Viewport + complete journey |
| 6 | Voice On | **PASS** | Preference matrix + 390 complete journey |
| 7 | Voice Off | **PASS** | Preference matrix + 1440/360 complete journeys |
| 8 | Completed fresh start | **PASS** | Completed-restart matrix |
| 9 | Resume from route | **PASS** | Resume matrix |
| 10 | Resume from services | **PASS** | Resume matrix |
| 11 | Resume from plan | **PASS** | Resume matrix |
| 12 | Resume from Checkout | **PASS** | Resume matrix |
| 13 | Resume from Intake | **PASS** | Resume matrix |
| 14 | Lobby round trip from services | **PASS** | Lobby matrix |
| 15 | Lobby round trip from Intake | **PASS** | Lobby matrix |
| 16 | Help open/close | **PASS** | Help matrix |
| 17 | Temporary-mode preservation | **PASS** | Help preserves stage services→services |
| 18 | Sandbox Checkout truth | **PASS** | Honesty copy + no false tax claim |
| 19 | Sandbox Checkout natural interaction | **PASS** | Show payment form + Test continue; no force |
| 20 | Intake field persistence | **PASS** | Field edit + campaign write |
| 21 | Intake attribution | **PASS** | Customer field attribution; idle no duplicate |
| 22 | Intake submission idempotency | **PASS** | Double-submit guard on checkout; intake idle no duplicate attribution |
| 23 | Signed-in browser handoff | **PASS** | Signup 200 + cookie → `/studio-board` |
| 24 | Signed-out account-handoff | **PASS** | `/account-handoff?from=%2Fstudio-board` |
| 25 | Signed-out authentication continuation | **PASS** | Create Account → Sign Up UI → `/studio-board`; same campaign; submit 1→1; session real (see Row 25 evidence) |
| 26 | Completed restart | **PASS** | Opening after complete + clear |
| 27 | Customer-truth scan | **PASS** | No Host/engine/Review claims |
| 28 | No Studio Review navigation | **PASS** | Session strip + journey scans |
| 29 | No horizontal overflow | **PASS** | All three viewports + complete journeys |
| 30 | TypeScript Conversation Room boundary | **PASS** | 0 CR errors; baseline 66 unrelated |

## Complete journeys (Lobby start)

| Viewport | Voice | Lobby→CR | Checkout→Intake | Handoff | Overflow | Studio Review |
|---|---|---|---|---|---|---|
| 1440 | Off | PASS | PASS | account-handoff | 0 | none |
| 390 | On | PASS | PASS | account-handoff | 0 | none |
| 360 | Off | PASS | PASS | account-handoff | 0 | none |

Note: After Lobby entry + Voice preference, the protected Checkout→Intake→handoff spine is seeded so late-stage interaction is exercised without replaying every Discovery answer. Lobby start and preference remain real customer steps.

## Checkout truth

- Developer Sandbox / non-live honesty visible
- Show payment form naturally clickable
- Test continue → Intake
- Double-submit guarded
- Cancel/failure UI: **NOT APPLICABLE**

## Intake attribution storage

Inspected after field edit / idle / handoff paths in harness:

- Campaign remains Intake answer store
- Working draft retains customer field attribution
- Unchanged idle does not append
- Submission distinct from field events
- No speech attribution invented
- Materials dual-UX: deferred (Board), not decided in CR-4

## Row 25 — Signed-out authentication continuation → Studio Board

**Distinct from signed-in Board handoff.** Proves a signed-out customer’s preserved project reconnects after authentication.

| Item | Evidence |
|---|---|
| Focused run | `CERT_FOCUS=row25` · tip `02657aa` · **PASS=17 FAIL=0** |
| Handoff URL | `http://127.0.0.1:3022/account-handoff?from=%2Fstudio-board` |
| Visible action | **Create Account** (primary) → `/sign-up?from=%2Fstudio-board` |
| Signup API | **200** via Create Account form (unique email; real UI; `force: false`) |
| Board URL | `http://127.0.0.1:3022/studio-board` |
| Campaign before→after | same id (`cr4-1785100949736`) |
| Attribution / submit | attr 1→1 · submit events 1→1 (no duplicate) |
| Session | `/api/auth/session` authenticated |
| Board truth | No false review/production-began claim |
| Guide cleanup | Left Conversation Room surface for Board |
| Artifacts | `row25-account-handoff.png` · `row25-studio-board.png` · `row25-signed-out-auth-continuation.json` · `row25-run.txt` |

## Defects

### Resolved previously

- **CR-4-CHECKOUT-SCRIM** — protected in CR-4R5 (`02657aa`)

### Signup 500

- **Not a product defect** — missing `SESSION_SECRET` in cert environment

### Signed-out missing submit (historical)

- Harness/seed issue (CTA + incomplete answers), not a separate product defect after R5

## Non-blocking deferrals

- Audible Voice quality (speak() probe only)
- Materials dual-UX Board primacy
- Checkout cancel/failure UI absent → N/A
- Unrelated TypeScript baseline (66)
- External real payment (separate launch gate)

## Generated artifact policy

Local certification evidence was retained during the certification run under:

`studio-squishy-cr4-cert/test-artifacts/cr4-conversation-room-journey/`

Examples of local (not committed) paths used:

- `cr4-report.json` / `cr4-report.md`
- Viewport / journey / checkout / handoff screenshots
- `build.txt` · `tsc.txt` · `journey-run.txt` · `env-note.txt`
- Row 25: `row25-run.txt` · `row25-signed-out-auth-continuation.json` · `row25-account-handoff.png` · `row25-studio-board.png`

**Generated artifacts are intentionally not committed** to the repository (screenshots, Playwright traces, generated JSON/Markdown reports, build/tsc/journey run logs, cookies, or certification account credentials). The three committed harnesses below are sufficient to regenerate the checks:

- `scripts/cert-conversation-room-journey.mjs`
- `scripts/cert-cr4r-interaction-proof.mjs`
- `scripts/cert-cr4r5-tablet-scrim.mjs`

## Final recommendation

**Certify CR-4 with explicit non-blocking deferrals.**

Do **not** begin CR-5 until Tagia authorizes that package.
