# DigitalOcean clip worker — operations (GO A–D, local only)

**Authorization:** `HOSTED-CLIP-OWNER-AUTH-GO-A-D-2026-10-30.json`  
**No commit / push / Production deploy** unless separately authorized.

## Milestone band (Owner + Chat)

1. Server verified → 2. Worker connected → 3. **3/3** `production.mp4` → 4. **Autonomous** dispatch proven → 5. Q/Review/Delivery → 6. Clip certified

Step 4 is **required before SELL NOW / autonomous cert** — not optional after launch.

---

## Gate A — finish verify (SSH from your desk)

```powershell
cd C:\Users\tagia\studio-squishy-mobile-customer-journey-certification-1
Get-Content scripts\hosted-clip-droplet-verify-on-server-1.sh | ssh studioadmin@68.183.142.179 "bash -s"
```

Save output to Desktop; Scout merges into `HOSTED-CLIP-DO-DROPLET-VERIFY-2026-10-30.json` (no secrets).

---

## Gate B — code (on droplet, no git push required)

Copy workspace to droplet (example):

```powershell
# From repo root — adjust if you use rsync/scp tooling
scp -r .\scripts .\src .\public .\package.json .\package-lock.json .\tsconfig.json studioadmin@68.183.142.179:/var/studio/studio-squishy/
```

On droplet:

```bash
cd /var/studio/studio-squishy
npm ci
npm run build   # fonts/assets for hosted hydrate seed
```

---

## Gate C — Test credentials (never in chat)

From **your desk** (uses `.env.local`, does not print values):

```powershell
node scripts/hosted-clip-droplet-install-remote-env-1.mjs studioadmin@68.183.142.179
```

Refuses Production Supabase ref. Installs `/etc/studio/worker.env` mode `600`.

---

## Gate D — one controlled production drive

**Before start:** confirm **no** Vercel `hosted-clip-mux-phase-chain` / chunk drive running.

On droplet:

```bash
cd /var/studio/studio-squishy
STUDIO_HOSTED_CLIP_WORKER_ENV=/etc/studio/worker.env npx tsx scripts/hosted-clip-droplet-production-drive-1.ts disposable-hpt-cert-clip_repurposing-6a31a13c
```

On desk (proof, unchanged):

```powershell
node scripts/hosted-clip-set-mp4-proof-1.mjs disposable-hpt-cert-clip_repurposing-6a31a13c
node scripts/hosted-clip-first-mp4-proof-1.mjs c-17-127
node scripts/hosted-clip-first-mp4-proof-1.mjs c-82-641
```

**If exit 5:** stop — no second drive without Owner-approved correction.

---

## Autonomous dispatch proof (after 3/3, before autonomous cert)

On droplet (systemd or tmux):

```bash
STUDIO_HOSTED_CLIP_WORKER_ENV=/etc/studio/worker.env npx tsx scripts/hosted-clip-droplet-worker-http-1.ts 8787
```

Expose via firewall/reverse proxy only to Vercel egress or Tailscale — not open internet without auth.

From desk:

```powershell
node scripts/hosted-clip-droplet-autonomous-dispatch-proof-1.mjs http://<worker-host>:8787 disposable-hpt-cert-clip_repurposing-6a31a13c
```

**Later Preview deploy (separate GO):** set `HOSTED_CLIP_COMPUTE_PROVIDER=droplet` + `HOSTED_CLIP_WORKER_URL` so Vercel observer **never** runs FFmpeg in serverless (`409 clip_worker_external`).

---

## Rollback

- Stop worker HTTP / drive process.
- Remove Preview env delegation flags when authorized to touch Vercel env.
- Leases expire via orchestrator stale recovery.
