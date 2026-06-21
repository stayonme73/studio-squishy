# Repository Rename Plan — Post Phase 1

> **DO NOT EXECUTE** any step in this document until:
>
> 1. Phase 1 is **committed and stable** on `main`
> 2. Production build is **green** (`npm run build`)
> 3. The founder **explicitly approves** the rename in writing

This document is planning only. No rename steps should be performed during Phase 1 development.

---

## Product vs repository naming

| Context | Current | Target (post-rename) |
| -------- | ------- | -------------------- |
| **Product (user-facing)** | The Studio | The Studio *(unchanged)* |
| **GitHub repository** | `studio-squishy` | `the-studio` *(recommended)* |
| **Local folder** | `studio-squishy` | `the-studio` |
| **npm package** | `studio-squishy` | `the-studio` |
| **localStorage keys** | `studio-squishy:*` | `the-studio:*` *(with migration)* |
| **Custom events** | `studio-squishy:campaign-updated` | `the-studio:campaign-updated` |

**Recommended GitHub name:** `the-studio` — short, matches product name, URL-friendly.

Alternatives considered: `the-studio-app`, `studio-by-spark` (aligns with sidebar lockup but longer).

---

## Preconditions (must all be true)

- [ ] Phase 1 feature set is complete and merged to `main`
- [ ] All Phase 1 work is **committed** (no large uncommitted rename mixed with feature work)
- [ ] `npm run build` passes locally and on CI
- [ ] Vercel production deploy is healthy
- [ ] Local backup: `git clone` or zip of repo + note of current Vercel project settings
- [ ] Document current localStorage state if QA relies on persisted campaign data (optional export script)
- [ ] Team notified of brief deploy URL / git remote change window

---

## Scope

### In scope

1. **GitHub repository rename** (`studio-squishy` → `the-studio`)
2. **Local clone folder** rename on developer machines
3. **`package.json` / `package-lock.json`** `name` field
4. **Vercel project** — reconnect or rename linked Git repository
5. **localStorage key migration** — one-time client migration on app load
6. **Custom event names** — update dispatch/listener strings to match new prefix
7. **Documentation** — README, internal docs referencing old repo slug
8. **CI / scripts** — any hardcoded paths or project names in scripts or config

### Out of scope (unless explicitly added)

- Product copy changes (already uses "The Studio")
- Welcome Hall locked visuals, skyline hero, cork card structure
- CSS class prefixes (`sb-`, `bf-`, etc.) — not user-facing
- Squishy character / host naming (character name, not product name)
- Supabase project naming (post-MVP)
- Domain / DNS changes (separate decision)

---

## Technical inventory (current)

### localStorage keys

| Key | File |
| --- | ---- |
| `studio-squishy:current-campaign` | `src/lib/studio-board-campaign.ts` |
| `studio-squishy:last-draft` | `src/lib/studio-board-campaign.ts`, `src/lib/draft-intake.ts` |

### Custom events

| Event | Files |
| ----- | ----- |
| `studio-squishy:campaign-updated` | `src/lib/studio-board-campaign.ts`, `src/lib/use-current-campaign.ts` |

### Package name

| File | Field |
| ---- | ----- |
| `package.json` | `"name": "studio-squishy"` |
| `package-lock.json` | `"name": "studio-squishy"` |

### Import paths

No `@studio-squishy/*` or repo-name-based import aliases exist. Path alias is `@/*` → `src/*` only. **No import path changes required** for the rename.

### Environment variables

No env vars contain `studio-squishy`. `.env.example` uses product name in comments only.

---

## localStorage migration strategy

Run once on app bootstrap (e.g. in root layout client wrapper or a small `migrateLegacyStorage()` called from Studio Board mount):

```typescript
const LEGACY_PREFIX = "studio-squishy:";
const NEW_PREFIX = "the-studio:";

function migrateLegacyStorageKeys() {
  if (typeof window === "undefined") return;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(LEGACY_PREFIX)) continue;
    const value = window.localStorage.getItem(key);
    const newKey = key.replace(LEGACY_PREFIX, NEW_PREFIX);
    if (value !== null && window.localStorage.getItem(newKey) === null) {
      window.localStorage.setItem(newKey, value);
    }
    window.localStorage.removeItem(key);
  }
}
```

**Rollback:** Keep migration idempotent; if rolling back code, old keys are gone — restore from backup export if needed.

---

## Ordered checklist

### Phase A — Preparation (no production impact)

1. [ ] Create rename branch: `chore/rename-the-studio`
2. [ ] Update `package.json` and `package-lock.json` name to `the-studio`
3. [ ] Replace `studio-squishy:` prefix in `src/lib/studio-board-campaign.ts`, `src/lib/draft-intake.ts`, `src/lib/use-current-campaign.ts`
4. [ ] Add `migrateLegacyStorageKeys()` and call on client init
5. [ ] Grep repo for remaining `studio-squishy` strings; update docs/comments as needed
6. [ ] Run `npm install`, `npm run build`, `npm run lint`
7. [ ] Manual QA: existing campaign in localStorage survives migration; draft intake still works
8. [ ] Open PR; merge to `main` **before** GitHub repo rename (avoids broken CI mid-rename)

### Phase B — GitHub rename

9. [ ] On GitHub: Settings → General → Repository name → `the-studio`
10. [ ] Update local remotes on all machines:
    ```bash
    git remote set-url origin git@github.com:<org>/the-studio.git
    git fetch origin
    ```
11. [ ] Rename local folder: `studio-squishy` → `the-studio`; reopen in IDE
12. [ ] Verify `git remote -v` and `git pull` work

**Rollback (GitHub):** GitHub keeps redirects from old URL for a period; rename back to `studio-squishy` in Settings if needed within redirect window.

### Phase C — Vercel

13. [ ] In Vercel dashboard: Project Settings → Git → confirm repo connection after GitHub rename (usually auto-updates via redirect)
14. [ ] If connection breaks: disconnect and reconnect to `the-studio` repository
15. [ ] Optionally rename Vercel project display name to "The Studio"
16. [ ] Trigger production deploy; verify preview URLs and env vars intact
17. [ ] Update any bookmarked deploy URLs in docs

**Rollback:** Re-link to old repo name if GitHub rename was reverted; redeploy previous commit.

### Phase D — Cleanup

18. [ ] Update README repo clone URL
19. [ ] Search GitHub org for references to `studio-squishy` (other repos, wiki, Actions secrets names)
20. [ ] Remove or archive migration helper after one release cycle (optional)
21. [ ] Close rename tracking issue

---

## Rollback summary

| Step gone wrong | Action |
| --------------- | ------ |
| Code merged but keys broken | Revert PR; users may need to re-enter draft (if migration ran) |
| GitHub rename too early | Rename repo back; update remotes; GitHub redirects help temporarily |
| Vercel disconnected | Reconnect Git integration; redeploy last known good commit |
| localStorage data lost | Restore from pre-migration export; no automatic recovery |

---

## Verification after full rename

- [ ] `npm run build` green
- [ ] Clone fresh from `the-studio` repo URL works
- [ ] Production site title/metadata still "The Studio"
- [ ] Campaign persistence works for users who had data under old keys
- [ ] Dev status reset / draft flow functional
- [ ] No user-facing "studio-squishy" or "Studio Squishy" strings in app UI

---

## Approval gate

**Status:** Planned — not approved for execution.

When Phase 1 is stable, the founder should reply with explicit approval before any Phase A–D work begins. Until then, continue using repository name `studio-squishy` for all technical identifiers.
