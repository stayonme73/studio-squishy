# Owner action required — Shotstack stage API key

**Package:** `KITCHEN-VIDEO-INTEGRATION-1`  
**Blocker type:** Genuine Owner account / credential setup  
**Scout stops here until the key exists in local secrets.**

Do **not** paste the API key into chat.

---

## Why this stop is correct

Shotstack cloud Edit/Ingest APIs require an `x-api-key`.  
No key is present in `.env.local` (`SHOTSTACK_API_KEY` unset).  
Creating the account/key is Owner setup — not production labor.

---

## Exact steps

1. Open: https://dashboard.shotstack.io/register  
2. Create a free developer account (pricing FAQ: **10 free credits**, 30-day validity).  
3. Prefer **stage / sandbox** API key (not production `v1`) for this package.  
4. Recommended key name (if renameable): `studio-kitchen-video-integration-1-stage`  
5. Least privilege: use **stage** only; do not purchase a paid plan unless separately authorized.  
6. Credit card: confirm at signup — Shotstack advertises free start / free credits; treat card requirement as **confirm-in-dashboard**.  
7. Store locally in **`.env.local`** (already gitignored via `.env*`):

```env
SHOTSTACK_API_KEY=<your-stage-key>
SHOTSTACK_ENV=stage
```

8. Verify `.env.local` is **not** staged (`git status` must not list it).  
9. Tell Scout: **“Shotstack stage key is in .env.local — continue KITCHEN-VIDEO-INTEGRATION-1 live renders.”**  
   Still do **not** paste the key.

---

## What Scout will do after the key exists

1. Ingest Cedar Lane scene PNGs + certified voice MP3 via Shotstack signed upload  
2. Submit V1 Edit render from work packet  
3. Poll → download → persist → SHA-256 → QA READY bind  
4. If free credits allow: V2 correction render (CTA hold + CTA text) with V1 preserved  
5. Complete integration report (still **NOT CUSTOMER READY / NOT CERTIFIED**)

---

## Explicit non-actions

- Do not reopen CapCut  
- Do not operate a timeline editor  
- Do not purchase credits/plans unless Owner authorizes separately  
- Do not commit `.env.local`  
- Do not paste secrets into chat  
