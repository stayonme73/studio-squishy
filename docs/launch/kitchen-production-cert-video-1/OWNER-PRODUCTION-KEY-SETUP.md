# Owner action required — Shotstack Production API key

**Package:** `KITCHEN-PRODUCTION-CERT-VIDEO-1`  
**Why:** V2 sandbox watermark blocks customer delivery. Cert candidate V3 must render on **Production (v1)**.  
**Scout stops here until the Production key exists in local secrets.**

Do **not** paste the API key into chat.  
Do **not** purchase a plan unless the dashboard blocks free Production credits — then STOP and ask Owner before buying.

---

## Exact steps

1. Open Shotstack dashboard: https://dashboard.shotstack.io/  
2. Account menu → **API Keys**  
3. Copy the **Production** key (not Sandbox / stage)  
4. Add to **`.env.local`** (gitignored):

```env
SHOTSTACK_PRODUCTION_API_KEY=<your-production-key>
SHOTSTACK_ENV=v1
```

Keep the existing stage key if you want:

```env
SHOTSTACK_API_KEY=<stage-key-unchanged>
```

5. Confirm `.env.local` is **not** staged (`git status` must not list it).  
6. Tell Scout:

**“Production key is in .env.local — continue V3.”**

---

## What Scout will do next

1. Ingest V3 assets on Production  
2. Render watermark-free V3 MP4  
3. Bind SHA-256 · machine QA · return for Owner visual review  
4. Still **NOT CERTIFIED** until you watch the exact file  

---

## Already prepared (no Tagia editing)

- V3 work packet with embedded plate captions (no duplicate overlays)  
- New endcard plate without baked “Book a visit”  
- Single CTA overlay: `Book your visit today` in dark teal `#1F4A44`  
- End-card hold 8s → 6.5s (voice MP3 is 39.4s and fills the whole timeline; trim is pacing, not silence after VO ends)  
- V1 + V2 preserved  
