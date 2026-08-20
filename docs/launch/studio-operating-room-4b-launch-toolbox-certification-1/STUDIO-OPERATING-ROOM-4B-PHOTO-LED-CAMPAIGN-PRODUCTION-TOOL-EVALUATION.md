# STUDIO-OPERATING-ROOM-4B — PHOTO-LED CAMPAIGN PRODUCTION TOOL EVALUATION

**Package:** `STUDIO-OPERATING-ROOM-4B-LAUNCH-TOOLBOX-CERTIFICATION-1` (continuation)  
**Manager verdict:** 4B REMAINS OPEN  
**Prior work tip:** `f21c65e` · hash note `de0ad14`  
**This evaluation tip:** recorded at commit (below)  
**Mode:** Selection / CapCut-style operating gates — **no purchase · no subscription · no integration**  
**Room 5:** NOT STARTED · **No merge** · **No next Toolbox certification**  
**Carousel:** stays **NOT ON LAUNCH MENU** (accepted)

---

## Why this evaluation exists

Nia proved:

**safe deterministic text plates ≠ professional photo-led campaign art direction.**

That is a capability gap, not a testing failure.

Campaign Creative is **not** abandoned to “NOT ON LAUNCH MENU” to close the package. It remains a **higher-value Studio direction under active Room 4B work.**

The existing Studio Design Renderer stays accepted for what it can do (customer-safe text-led CERT plates with leak/collision gates). It is **not** sufficient alone for the campaign creative The Studio intends to sell.

---

## CapCut lesson (applied here)

CapCut failed **owner-independence**, not “software quality.” Presence ≠ Machine production.

Same six gates for every candidate (Adobe / Canva / Placid / Bannerbear / Adobe+Canva):

| # | Gate | CapCut result (historical) |
|---|------|-----------------------------|
| 1 | Machine can control it (real API / programmatic path) | FAIL for CapCut desktop click-export |
| 2 | Accepts customer/project truth automatically | Required |
| 3 | Produces repeatably | Required |
| 4 | QA can detect failure | Required |
| 5 | Revises without Tagia | Required |
| 6 | Provider swappable later (Studio owns the contract) | Required |

**Architecture rule (non-negotiable):**

```
Customer → The Studio → Machine → approved creative engine(s) → QA → Review → Delivery
```

Never: `Customer → Canva` or `Customer → Adobe`.

---

## Distinction locked

| Layer | Job |
|-------|------|
| **Art direction / image creation & treatment** | Choose/use photos intentionally; crop; composite; expand; calm wellness treatment |
| **Layout / template rendering** | Place approved visuals + customer-safe copy into multi-size campaign systems safely |

One tool may not do both. A **two-stage stack** is a first-class option.

---

## Repo scan (zero-cost test path?)

| Path | Present? |
|------|----------|
| Studio Design Renderer (text-led CERT plates) | Yes — sealed; Nia continuation proves limits |
| Shotstack short video | Yes — owner-independent kitchen + customer Review wire |
| Live Canva Connect / Autofill integration | **No** |
| Adobe Firefly / Photoshop API integration | **No** |
| Placid / Bannerbear | **No** |

**No zero-cost live Adobe/Canva evaluation path exists in-repo today.** Do not invent credentials. Do not buy. Evaluation below is **docs + Nia-gap fit** only — CapCut-style live cert is the **next** authorized package when Manager says so.

Historical note: Canva was previously used as a fulfillment spine and remapped OFF for sealed design SKUs. Re-evaluating Canva as a **Machine-called layout engine behind Studio contracts** is different from restoring Tagia-in-Canva.

---

## Candidate reports

### 1) Adobe Firefly Services / Photoshop API

**Sources:** [Photoshop API overview](https://developer.adobe.com/firefly-services/docs/photoshop/), [Firefly Services guides](https://developer.adobe.com/firefly-services/docs/guides), [Get started / credentials](https://developer.adobe.com/firefly-services/docs/guides/get-started), [Authentication](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/authentication/)

| Dimension | Finding |
|-----------|---------|
| What it can automate | Programmable Photoshop/Lightroom-style ops via REST: background remove, product/subject crop, smart objects, ActionJSON/actions, **UXP JavaScript**, composites; Firefly generative APIs in the same Services family |
| API availability | Yes — OAuth **server-to-server**; Adobe Developer Console project + API key |
| Customer-asset support | Input images via URL/storage destinations; linked smart objects for reusable assets |
| Photo-layout / art-treatment | **Strongest of the four for image treatment** — intentional crop, composite, expand/fill actions, scripted layer logic |
| Template requirement | Not “autofill brand template” first; can operate on documents/images/scripts. Studio would still need **approved recipes** (actions/UXP/packets) |
| Multi-size / campaign | Artboards / document ops / programmatic variants — plausible for multi-aspect **after** treatment |
| Revision / editability | High potential — re-run actions/UXP with new photo/copy; Machine-owned packets |
| Export | JPEG/PNG/PSD and related outputs (v2) |
| Automation limits | Org provisioning / rate limits (docs cite default RPM/RPD; higher via Adobe account manager). Not a full “campaign art director” out of the box — **Studio recipes required** |
| Human designer routinely required? | **Should not be**, if recipes + QA pass CapCut gates. Tagia designing every Nia asset = FAIL (same as CapCut) |
| Integration burden | Medium–high: auth, storage, job polling, packet binding into existing Board/Review/Delivery |
| Fit with Machine/Review/Delivery | Good as **image-treatment workstation** behind Studio production contract |
| Pricing (verifiable) | Access via Adobe Developer Console + org credentials. Public docs emphasize account-manager / org provisioning for usage. **No self-serve dollar price list verified here** — do not invent |

**Nia question:** Could Adobe alone turn Rooted & Ready into a sellable photo-led campaign?  
**Partial.** Excellent for preparing Nia’s window photo / group stretch / lifestyle shots (crop, calm treatment, aspect expansion). **Does not by itself** guarantee multi-format social+print layout systems with collision-safe copy — that still needs a layout stage (Canva templates, Placid, or an upgraded Studio renderer).

**Six-gate preview:** Gates 1–2 look **PASS-capable** on paper. Gates 3–5 need live Nia cert. Gate 6: PASS if Machine owns work packets (not Adobe-hosted customer editing as the product).

---

### 2) Canva Connect APIs / Brand Template + Autofill

**Sources:** [Autofill guide](https://www.canva.dev/docs/connect/autofill-guide/), [Autofill API family](https://www.canva.dev/docs/connect/api-reference/autofills/), [Canva Developers](https://www.canva.com/developers/)

| Dimension | Finding |
|-----------|---------|
| What it can automate | Upload assets; autofill brand-template fields (text + image); async jobs; export jobs for images/PDF |
| API availability | Connect APIs exist; **Brand template + Autofill require Canva Enterprise membership** for the acting user (official) |
| Customer-asset support | Images must be uploaded as Canva assets first (external URL not direct autofill; upload-via-URL job exists) |
| Photo-layout capability | **Layout/template strength**, not autonomous art direction. Photos go into **predesigned frames**. Cropping/intent depend on template design quality |
| Template requirement | **Hard requirement.** Someone (once) must build Studio brand templates with autofill fields. Quality ceiling = template system quality |
| Multi-size / campaign | Multiple templates / sizes for social vs print — strong if Studio maintains a template family |
| Revision | Re-autofill with new asset_id / text; Machine can retry. Customer editing in Canva UI = **owner-independence risk** if used as the Review surface |
| Export | Official export job APIs for preferred formats |
| Automation limits | Enterprise gate; autofill is slot-fill, not “invent calm wellness composition.” Risk of becoming a prettier template renderer (same class as current CERT plates, with better photos) |
| Human designer routinely required? | **Yes for template creation/maintenance.** **No for every customer job** if autofill + export are Machine-driven |
| Integration burden | Medium: OAuth, asset upload, autofill poll, export, then bind bytes into Studio Review (do not hand customers Canva edit URLs as Final Delivery) |
| Fit | Good as **controlled layout workstation** after photos are prepared |
| Pricing (verifiable) | Autofill = **Enterprise**. Connect “free to build” ≠ Enterprise Autofill entitlement. Dollar amounts: **not verified** beyond Enterprise requirement |

**Nia question:**  
**Yes, if** Studio already has strong Fall-Reset-class brand templates (photo frames, calm hierarchy, multi-size).  
**No**, if we expect Canva to invent art direction per customer without templates — that reintroduces Tagia-in-editor (CapCut failure mode).

**Six-gate preview:** Gate 1 PASS-capable for autofill+export. Gate 6 FAIL if Review/Delivery becomes Canva editor. Template debt is the real cost.

---

### 3) Placid

**Sources:** [Images API](https://placid.app/docs/2.0/rest/images), [Layers](https://placid.app/docs/2.0/rest/layers), [Pricing](https://placid.app/pricing)

| Dimension | Finding |
|-----------|---------|
| What it can automate | Deterministic image/PDF/(video) generation from templates; picture + text layers via REST |
| API | REST + URL API; API key style automation |
| Customer assets | Image URL into picture layers |
| Photo-layout | Template frames + fill — **controlled rendering**, not art direction |
| Template requirement | Hard — templates designed in Placid editor |
| Multi-size | Separate templates / modifications; high-res up to large canvases (docs) |
| Revision | Re-POST layers with new image/text |
| Export | Image formats, PDF pages, optional transfer to S3 |
| Limits | Same class as Bannerbear: quality = templates; no Photoshop-depth compositing |
| Human designer | For templates, not every job |
| Fit | Strong **layout renderer** behind Machine; weak as sole Nia art-direction engine |
| Pricing (verifiable) | Public plans with monthly credits (Basic 500 → VIP 100k); 1 image = 1 credit; free trial / watermarked previews; dollar sticker prices not scraped as static here — see [placid.app/pricing](https://placid.app/pricing) |

**Nia:** Good for **repeatable multi-size layout** once photos are chosen/treated. Alone: **insufficient** for photo-led art direction.

---

### 4) Bannerbear

**Sources:** [Create image via API](https://www.bannerbear.com/help/articles/123-how-do-i-create-an-image-via-api/), [API credits](https://www.bannerbear.com/help/articles/203-what-are-api-credits/), [Image Generation API](https://www.bannerbear.com/product/image-generation-api/)

| Dimension | Finding |
|-----------|---------|
| What it can automate | Template modifications (text/image/color) → image/video/PDF |
| API | REST async (+ sync host for images) |
| Customer assets | `image_url` modifications |
| Photo-layout | Template slots; face-detect option costs extra credits |
| Template requirement | Hard |
| Multi-size | Template sets / multiple templates |
| Revision | Re-create with new modifications |
| Export | Image/video/PDF via API objects |
| Limits | Template ceiling; video credit math by duration |
| Human designer | Template creation |
| Fit | Reliable renderer; not Nia art-direction alone |
| Pricing (verifiable) | Credit system; **30-credit free trial, no card** (official). 1 image ≈ 1 credit. Paid plan dollar amounts: confirm on Bannerbear pricing before any buy |

**Nia:** Same verdict as Placid — **renderer**, not art director.

---

## Against Nia (same failed campaign)

Required: intentional customer photos, professional crop/place, calm wellness direction, social+print system, aspect ratios, hierarchy, no collision, customer-safe copy, revision, no Tagia-per-asset design.

| Candidate | Photo-led art treatment | Multi-format layout | Owner-independent path plausible? | Alone closes Nia gap? |
|-----------|-------------------------|---------------------|------------------------------------|------------------------|
| Adobe Firefly / Photoshop API | **Best** | Secondary | Yes, if recipes + QA | **No alone** |
| Canva Autofill | Weak (slots) | **Best among templates** | Yes, if Enterprise + templates + export-only | **Only with strong templates** |
| Placid | Weak | Strong deterministic | Yes | **No alone** |
| Bannerbear | Weak | Strong deterministic | Yes | **No alone** |
| Existing Studio renderer | No | Text plates only | Already proven | **No** |

---

## End-state recommendation

### **USE TWO-STAGE STACK**

**(Hypothesis to certify next — not purchased, not integrated.)**

```
Machine (project truth + visual recipe)
  → Stage A: Adobe Firefly Services / Photoshop API
       (select/treat/crop/composite customer photos; calm treatment)
  → Stage B: Controlled layout renderer
       (Canva Brand Template Autofill **or** Placid — TBD by live CapCut-style bake-off)
  → Studio QA (collision, crop, CTA, brand, leak scan)
  → Review / revision / Delivery  (Studio-owned, provider-swappable)
```

**Why not the other end states**

| Option | Why not now |
|--------|------------|
| USE EXISTING STACK | Already failed Nia photo-led campaign bar |
| ADD ONE SPECIALIZED TOOL | Adobe alone doesn’t finish layout systems; Canva/Placid alone don’t invent photo art direction |
| CAMPAIGN CREATIVE NOT YET VIABLE | Too early — API surfaces exist; we have not run CapCut-style live cert yet. Do **not** abandon the capability |

**Carousel** remains off the launch menu. Campaign creative stays **open / pursue**.

---

## CapCut-style answer to Tagia

Yes — evaluate Adobe and Canva the same way CapCut was evaluated:

- Not “is the software pretty?”
- **Can Machine run it without Tagia in the editor?**

Adobe looks **more CapCut-like for programmable production** (actions/UXP/server-to-server).  
Canva looks **strong for autofill layout** if Enterprise + Studio templates exist, and **dangerous** if humans must open designs to finish.

Recommended next package (Manager-authorized, not auto-started):

**`STUDIO-OPERATING-ROOM-4B-PHOTO-LED-CAMPAIGN-ENGINE-CERT-1`** (name flexible)

Bake-off using **exact Nia assets / copy / voice brief / formats**:

1. Adobe-only treatment → Studio layout?  
2. Canva-autofill-only with temporary Studio templates?  
3. Adobe → Canva (or Placid) two-stage?

Pass only on the six gates + visual “would we sell this?” inspection.

**No purchase until that cert names a winner.** Free trials / watermarked previews only if Manager authorizes a scoped eval account — still not a subscription sprawl.

---

## Classification posture update (honest)

| Capability | Posture after this evaluation |
|-----------|--------------------------------|
| Text-led CERT plates (current renderer) | READY WITH EXPLICIT LIMITS (accepted) |
| Short-form video | READY WITH EXPLICIT LIMITS |
| Social static / print (text-led) | READY WITH EXPLICIT LIMITS |
| **Campaign creative (photo-led multi-format)** | **OPEN — tool selection / CapCut-style cert required** (not abandoned; not launch-ready) |
| Carousel | NOT ON LAUNCH MENU |

---

## PARK for Manager

- **No buy**  
- **No integrate**  
- **No Room 5**  
- **No next Toolbox service certification**  
- **4B remains OPEN**  
- Next gate: **photo-led campaign engine CapCut-style cert** against Nia, not more cosmetic renderer repair  

**PARK.**
