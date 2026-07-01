# Studio Self-Test V1

Internal harness for **The Studio as first real client** — one canonical campaign exercised from Discovery through Final Delivery, with deliberate failure scenarios and a visible pass/fail scoreboard.

**Locked config:** `src/config/studio-self-test-matrix.ts`  
**Campaign ID:** `studio-self-test`  
**Scoreboard:** `/file-room/studio-self-test` (owner login)

---

## Identity

| Field | Value |
|-------|-------|
| Campaign ID | `studio-self-test` |
| Campaign name | The Studio Self-Test Campaign |
| Primary service | `sm-001` (Social Media Launch Set) |
| Client login (dev) | `studio-self-test@local.dev` / `dev-only` |
| Server paths | `data/campaigns/`, `data/campaign-tasks/`, `data/campaign-materials/`, `data/campaign-production/` |
| Results file | `data/studio-self-test-results.json` |

The campaign is **not** a hidden fixture — it appears in File Room like any synced client campaign.

---

## Self-Test Matrix (summary)

| Category | Rows | Seeded in V1 | Automated checks |
|----------|------|--------------|------------------|
| identity | 4 | 4 | store |
| service-family | 13 | 1 (social_media) | script + manual |
| journey | 7 | 5 | store + manual |
| production-pipeline | 4 | 2 | store + manual |
| materials | 2 | 2 | store |
| exceptions | 6 | 6 | store |
| owner-console | 2 | 2 | api (needs dev server) |
| delivery | 2 | 0 | manual |

**40 matrix rows total** — structure is locked; statuses live in `data/studio-self-test-results.json`.

### Seeded exception scenarios

- `compliance_hold` — waiting on Owner  
- `direction_disagreement` — open  
- `scope_change` — waiting on Owner  
- `deadline_risk` — open  
- `missing_client_fact` — promotable  
- `client_request` — waiting on Owner (with clientRequestDraft)

### Production state (sm-001)

- Strategy complete  
- Copy `ready_for_qa`  
- Production work unit at copy stage with strategy QA pass pinned  

---

## How to run

### 1. Seed deliberate scenario data

```bash
npm run seed:studio-self-test
```

With dev server running (`npm run dev`), the seed script also initializes tasks and materials via API. Use `--offline` to write campaign + production only:

```bash
node scripts/seed-studio-self-test.mjs --offline
```

### 2. Run automated checks

```bash
npm run test:studio-self-test
```

Store checks work offline. API rows (`owner-console-*`) need dev server + `SESSION_SECRET` in `.env.local`:

```bash
node scripts/run-studio-self-test.mjs --skip-api   # offline store/script checks only
```

Exit code `1` when any automated row fails.

### 3. View scoreboard

1. Start dev server  
2. Log in as owner (`tagia@local.dev` / `dev-only`)  
3. Open **File Room → Studio Self-Test** or `/file-room/studio-self-test`

---

## What Tagia does tomorrow (Owner decisions)

After seed, these items wait on Owner in **Owner Console** and campaign drill-down:

1. **Compliance hold** — review and resolve or assign  
2. **Scope change** — approve/deny extra post request  
3. **Client material request** — approve promotion to client-facing materials slot (or decline)  
4. **Missing client fact** — approve promotion or resolve internally  
5. **Direction disagreement** — adjudicate strategy vs copy conflict  
6. **Deadline risk** — acknowledge and set path forward  

Re-run `npm run seed:studio-self-test` to reset exception states after exercising decisions.

---

## Gaps / manual steps (full Discovery → Delivery E2E)

| Gap | Notes |
|-----|-------|
| Browser Discovery → Project Summary | Use `OwnerQaPanel` journey seeds or Playwright `e2e-discovery-first-journey.mjs` — not wired into self-test runner yet |
| Secure Checkout payment | Seeded as `paymentReceivedAt` on server record; live checkout UI not in runner |
| QA fail → revision → re-submit | Manual matrix row; exercise via Team Offices + QA Office |
| Full pipeline to DELIVERED | Manual — Review Room, Final Delivery, archive rows |
| Non-sm-001 service families | Matrix rows only; add fixtures when those pipelines are priority |
| Client browser journey sync | Self-test client user exists; localStorage sync path separate from File Room seed |

---

## Files

| Path | Role |
|------|------|
| `src/config/studio-self-test.ts` | Campaign ID, routes, copy |
| `src/config/studio-self-test-matrix.ts` | Locked matrix (machine-readable) |
| `src/lib/studio-self-test/load-results.ts` | Results file + scoreboard loader |
| `src/app/file-room/studio-self-test/page.tsx` | Scoreboard page |
| `src/components/file-room/FileRoomSelfTestScoreboard.tsx` | Scoreboard UI |
| `scripts/seed-studio-self-test.mjs` | Seed campaign + scenarios |
| `scripts/run-studio-self-test.mjs` | Runner + results update |
| `scripts/lib/studio-self-test-shared.mjs` | Shared seed/run helpers |

---

## Related verify scripts

Existing proofs this harness builds on:

- `scripts/prove-team-offices-v1.mjs` — kitchen pipeline  
- `scripts/prove-owner-console-v1.mjs` — owner decisions  
- `scripts/verify-slice3d-*.mjs` — exceptions API  
- `scripts/e2e-discovery-first-journey.mjs` — browser Discovery journey  
