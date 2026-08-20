# STUDIO-OPERATING-ROOM-4B-PHOTO-LED-CAMPAIGN-LIVE-CERTIFICATION-1 REPORT

**Package:** `STUDIO-OPERATING-ROOM-4B-LAUNCH-TOOLBOX-CERTIFICATION-1` (continuation)  
**Mode:** CapCut-style live operational certification — audition before hire  
**4B status:** **REMAINS OPEN**  
**Prior tips:** evaluation `cdf39bf` · note `a492b77` · Nia work `f21c65e`  
**This live-cert tip:** recorded at commit below  
**Room 5:** NOT STARTED · **No merge** · **No next Toolbox project** · **No purchase**

---

## Verdict (park for Manager)

### Recommendation: **OWNER PURCHASE DECISION REQUIRED**

Not CERTIFY. Not CERTIFY WITH LIMITS. Not REJECT of Adobe/Canva/Placid as production engines.

**Why:** Live CapCut gates could not be exercised. Access and customer photo binaries are missing. Marketing docs ≠ proven Machine control. Claiming CERTIFY or REJECT without API calls would fake the audition.

**Two-stage ≠ two subscriptions.** Two logical capabilities (art treatment + controlled layout). One platform that later passes both gates is fine. Extra cost is decided only after real Nia output exists.

**Carousel:** stays **NOT ON LAUNCH MENU**.

---

## Hard question (unchanged from CapCut)

> Can The Studio Machine operate this capability repeatably without Tagia working inside the editor?

Not: “Can Adobe or Canva make something pretty?”

---

## Actual access matrix

Inspected: `.env.local`, `.env*`, repo integrations, official docs (2026-08-19).  
**No Adobe / Canva / Placid / Bannerbear / Firefly credentials present.**

| Candidate | Account in Studio env? | Developer / API credential path? | Plan / access requirement (official) | Free/dev/trial usable here without purchase? | Status |
|-----------|-------------------------|-----------------------------------|--------------------------------------|----------------------------------------------|--------|
| **Adobe Firefly Services / Photoshop API** | **No** | Docs require Adobe Developer Console + org product profiles | **Enterprise / Firefly Services under ETLA** — Creative Cloud individual/pro trial ≠ API access ([Adobe Community: Firefly API enterprise-only](https://community.adobe.com/questions-404/not-able-to-access-firefly-apis-1475318); [Photoshop API requires Firefly Services ETLA](https://community.adobe.com/questions-624/cannot-sign-up-for-adobe-api-free-trial-button-not-clickable-683229); [Getting started](https://developer.adobe.com/firefly-services/docs/guides/get-started)) | **No** — no self-serve API trial proven in this environment | **ACCESS GATE — OWNER DECISION** |
| **Canva Connect Autofill / Brand Templates** | **No** | Connect app + OAuth possible in theory | Autofill / Brand templates require **Canva Enterprise** membership for developer **and** acting user ([Autofill guide](https://www.canva.dev/docs/connect/autofill-guide/)). Dev-only access may be *requestable* via Developer Portal — still Owner action | **Not proven** — no Enterprise account; Scout did not apply for Canva developer exception | **ACCESS GATE — OWNER DECISION** |
| **Placid (fallback layout)** | **No** | REST API after project + API token | Public plans + **free trial, no credit card**; unlimited **watermarked** previews ([pricing](https://placid.app/pricing)) | **Theoretically yes** after Owner authorizes signup + one-time templates + API token in env | **ACCESS GATE — OWNER DECISION** (free trial not started; no credentials; Manager-scoped trial not authorized in this turn) |

**Repo integration scan:** no live Adobe/Canva/Placid client code. Historical Canva = manual spine (OFF for sealed renderer SKUs) — not Machine Autofill.

Executable probe: `scripts/studio-operating-room-4b-photo-led-access-probe.mts` (env presence only; does not invent calls).

---

## Nia exact assets used (and what is missing)

**Customer (unchanged):** Nia Carter · Rooted & Ready Wellness Studio · Fall Reset Launch Campaign

**Preserved campaign truth (fixture):**

| Fact | Value |
|------|--------|
| Voice brief | Calm wellness; women 30s–50s; no neon; no before/after body pictures |
| Dates | September 9 – October 20, 2026 |
| Price | $297 |
| CTA | Enroll in Fall Reset |
| Booking | rootedandready.example/fall-reset · (804) 555-0194 |

**Text-led baseline (existing failed-quality evidence — inspected):**

| Artifact | Path |
|----------|------|
| Square social | `docs/launch/.../continuation-v2/artifacts/nia-social-post-1.png` |
| Print flyer | `docs/launch/.../continuation-v2/artifacts/nia-flyer-v1.png` |
| Campaign | `nia-r4b-live-1787185497469` |

**Visual baseline (mandatory inspection):** cream CERT plates, logo/wordmark, large `$297`, dates, CTA — **no customer photography**, not photo-led art direction. Safe text-led ≠ sellable photo campaign.

**Customer photo binaries:** **NOT IN REPO.** `NIA_MATERIALS` in `nia-fixture.ts` are **descriptive placeholders** (`nia-photo-good-1` “Nia by the studio window”, etc.) — not image files.  
→ Even with vendor API access, Machine cannot run the exact photo-led Nia audition until Owner supplies a photo pack bound to those material IDs.

---

## Certification A — Adobe art-treatment engine

| Gate | Result |
|------|--------|
| Machine control (API) | **NOT PROVEN** — no credentials |
| Ingest customer photo | **BLOCKED** — no API + no photo binaries |
| Crop / expand / background / aspect | **NOT RUN** |
| Controlled production asset return | **NOT RUN** |
| Repeat from project record | **NOT RUN** |
| Graded as art-treatment workstation | Docs support the *role*; **live CapCut FAIL/PASS unknown** |

**Adobe cert result:** **ACCESS GATE — OWNER DECISION**  
Do not use Adobe as final campaign-layout system (unchanged hypothesis).  
**Scalability note (docs):** Firefly API default org limits **4 RPM / 9,000 RPD** ([rate limits](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/rate-limits/)). Capacity testing later needs higher limits via account manager — material for Room 4 scale, not inventable here.

---

## Certification B — Canva layout engine

| Gate | Result |
|------|--------|
| Select approved Studio template via API | **NOT PROVEN** — Enterprise + no templates + no credentials |
| Insert photography + controlled copy | **NOT RUN** |
| Multi-size export without editor | **NOT RUN** |
| Revision without Tagia in editor | **NOT RUN** |
| One-time template setup vs routine job | **Distinguished in doctrine; neither proven live** |

**Canva cert result:** **ACCESS GATE — OWNER DECISION**  
Strongest deterministic path remains Brand Template + Autofill **if** Enterprise (or approved dev exception) + reusable Studio template family exists. Opening Canva editor per customer job = CapCut failure mode.

---

## Certification C — Placid fallback layout

Evaluated only because Canva is blocked for meaningful live cert.

| Gate | Result |
|------|--------|
| API-first multi-format renderer | Docs: yes ([Images API](https://placid.app/docs/2.0/rest/images)) |
| Free trial path | Official: no card; watermarked previews free |
| Studio account / token / templates | **Absent** |
| Owner-independent routine jobs | **NOT PROVEN** — would still need one-time template system (allowed) + Machine API (blocked) |

**Placid cert result:** **ACCESS GATE — OWNER DECISION** (free-trial signup not executed without Manager-scoped authorization)

---

## Two-stage live proof

**Not executed.**

Required path:

`Machine → art-treatment → controlled layout → QA → customer artifact`

Blocked by Adobe access + layout access + missing Nia photo binaries.

Minimum deliverables (square social / vertical social / print handout) from candidate stack: **NOT PRODUCED**.

---

## Revision proof

Nia: *“Use the photo where I’m standing by the window instead, but keep the campaign style the same.”*

**NOT RUN** — no photo-led production line to revise.

---

## Failure / recovery proof

Deliberate stage break (bad photo / treatment fail / layout fail / export fail): **NOT RUN**.

Existing Studio text-led QA/leak gates remain on the old renderer path only — not a vendor-engine recovery proof.

---

## Actual visual comparison

| Dimension | Text-led Nia (continuation-v2) | Candidate photo-led |
|-----------|----------------------------------|---------------------|
| Photo prominence | **None** | **N/A — not produced** |
| Hierarchy | Price-forward CERT plate | — |
| Brand / calm wellness | Palette restrained; not art-directed photography | — |
| Campaign consistency | Same renderer family across social/print | — |
| Would Studio charge a serious client for this exact output? | **No** for photo-led campaign product (already established) | **Cannot answer** — no candidate output |

---

## Owner-independence result

| Engine | CapCut-style result |
|--------|---------------------|
| Adobe | **INCOMPLETE — ACCESS GATE** (not FAIL, not PASS) |
| Canva | **INCOMPLETE — ACCESS GATE** |
| Placid | **INCOMPLETE — ACCESS GATE** |
| Two-stage | **INCOMPLETE — ACCESS GATE** |

**Hard independence FAIL conditions** (Tagia opens editor / hand-crops / manual multi-export / manual stage transfer / manual revision resume) were **not observed** because no live fulfillment path ran. Do not confuse “not tested” with “passes.”

---

## Scalability / rate-limit findings

| Item | Finding |
|-------|---------|
| Adobe Firefly API defaults | **4 RPM / 9,000 RPD** per org (official) — insufficient for naive high-concurrency campaign farms without quota uplift |
| Canva | Async jobs documented; rate/plan limits not measurable without Enterprise access |
| Placid | Credit model (1 image = 1 credit); previews free/watermarked; concurrency not live-tested |
| Later Room 4 capacity | **Blocked** until Owner access + real job loop exists |

---

## Provider swappability

**Doctrine preserved (no code that violates it):**

```
Customer → The Studio → Machine → approved creative engine(s) → QA → Review → Delivery
```

No customer state written into Adobe/Canva accounts. No provider IDs as customer truth.  
Live swappability of Adobe↔Placid/Canva: **architecturally required; not runtime-proven.**

---

## Cost / access gates requiring Owner decision

1. **Adobe Firefly Services / Photoshop API** — Enterprise / ETLA (or equivalent org provisioning). Individual Creative Cloud ≠ API.  
2. **Canva Enterprise** (or Owner-approved Developer Portal exception for Autofill) + MFA + Brand Template publishing.  
3. **Placid free trial** — Manager must explicitly authorize account creation; then API token + one-time Studio templates. Still not a purchase.  
4. **Nia photo pack** — bind real files to `nia-photo-good-1`…`nia-photo-mediocre-2` (+ logo) for exact campaign audition.  
5. **Do not buy two subscriptions because the architecture is two-stage** — decide after first sellable Nia output.

---

## What Scout did / did not do

**Did:** Access matrix · doc-verified plan gates · rate-limit capture · Nia baseline visual inspection · fixture honesty (placeholders) · CapCut-gate framing · park recommendation · config/probe update  

**Did not:** Purchase · Enterprise contract · Tagia-in-editor design of Nia · fake API success · start Room 5 · start another Toolbox SKU · merge · auto-subscribe Placid

---

## Resume criteria (when Owner unlocks access)

1. Place credentials in env (never commit secrets).  
2. Supply Nia photo binaries for fixture material IDs.  
3. Re-run CapCut gates A → B/C → two-stage → revision → failure → visual sellability.  
4. Then and only then: CERTIFY / CERTIFY WITH LIMITS / REJECT.

---

## PARK for Manager

**4B remains OPEN.**  
Campaign creative stays on the long-term capability list.  
Carousel stays off Launch Now.  
**No purchase. No merge. No next project.**

**Recommendation again:** **OWNER PURCHASE DECISION REQUIRED**
