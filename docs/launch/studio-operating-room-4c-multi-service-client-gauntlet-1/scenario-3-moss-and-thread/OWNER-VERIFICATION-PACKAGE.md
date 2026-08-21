# Scenario 3 — Owner verification package

**Superseded photo-rights sentence:** this package recorded an older `customer_owns` campaign-level sentence. That sentence is void. Current authority is `campaign-brief.json` SHA-256 `feceace09e382de7a5c59a79884727e86c6d613dbd8c324b8594c16a67e49904` plus `RIGHTS-RECORD.json`.

**Control status:** PRE_PRODUCTION_BLOCKED  
**Acceptance:** BLOCKED  
**Production files created:** none  
**Photographs generated, edited, cropped, animated, or published:** none  

Room 4C remains OPEN. Room 5 remains NOT_STARTED. No merge.

---

## 1. Final authoritative brief

**SHA-256:** `f49716c904fe3f0a028d67bf2ec773cc17eabc89f5640db85421da0295e71033`  
**File:** `campaign-brief.json`  
**Fact-source / approval status:** OWNER_APPROVED_FOR_CERTIFICATION  
**Certification status:** All business, event, address, contact, and offer facts are fictional and owner-approved solely for Studio certification.

| Locked fact | Value |
|-------------|--------|
| Business | Moss & Thread Studio |
| Event | Studio Open Weekend |
| Dates | November 7–8, 2026 |
| Location | 214 Loom Street, Richmond, Virginia |
| Saturday hours | 10:00 AM–5:00 PM |
| Sunday hours | 11:00 AM–4:00 PM |
| CTA | Visit the open studio |
| Event URL | mossthread.example/open-weekend |
| Contact email | hello@mossthread.example |
| Phone | not required; do not invent one |
| Admission | Free to visit |
| Approved claims | visitors may view the studio, meet the maker, and shop available textile pieces in person |
| Prohibited claims | product prices; discounts; demonstrations; workshops; refreshments; giveaways; limited quantities; custom-order availability; accessibility claims; parking information; shipping; phone number; additional event activities |
| Print dimensions | US Letter invitation/handout, 8.5×11 inches; print-ready PDF 612×792 pt; PNG 2550×3300 |
| Photo-rights sentence (campaign-level only) | customer owns the supplied product, maker, and studio photographs and grants The Studio permission to use and adapt them for this certification campaign |

That campaign-level sentence is **not** a per-file clearance. It is not bound to any photograph hash.

---

## 2. Required-fact gate

Generic customer-fact source gate: **PASS** against the owner-stamped lock. No fact was inferred or Machine-generated. Phone remains empty on purpose.

| Fact | Exact value | Required / optional | Source | Approval status | Result |
|------|-------------|---------------------|--------|-----------------|--------|
| businessName | Moss & Thread Studio | required | owner stamp | OWNER_APPROVED_FOR_CERTIFICATION | PASS |
| offerName | Studio Open Weekend | required | owner stamp | OWNER_APPROVED_FOR_CERTIFICATION | PASS |
| datesDisplay | November 7–8, 2026 | required | owner stamp | OWNER_APPROVED_FOR_CERTIFICATION | PASS |
| locationDisplay | 214 Loom Street, Richmond, Virginia | required | owner stamp | OWNER_APPROVED_FOR_CERTIFICATION | PASS |
| hoursDisplay | Saturday 10:00 AM–5:00 PM; Sunday 11:00 AM–4:00 PM | required | owner stamp | OWNER_APPROVED_FOR_CERTIFICATION | PASS |
| Saturday hours | 10:00 AM–5:00 PM | required | owner stamp | OWNER_APPROVED_FOR_CERTIFICATION | PASS |
| Sunday hours | 11:00 AM–4:00 PM | required | owner stamp | OWNER_APPROVED_FOR_CERTIFICATION | PASS |
| cta | Visit the open studio | required | owner stamp | OWNER_APPROVED_FOR_CERTIFICATION | PASS |
| bookingUrl | mossthread.example/open-weekend | required | owner stamp | OWNER_APPROVED_FOR_CERTIFICATION | PASS |
| emailDisplay | hello@mossthread.example | required | owner stamp | OWNER_APPROVED_FOR_CERTIFICATION | PASS |
| priceDisplay (admission) | Free to visit | required | owner stamp | OWNER_APPROVED_FOR_CERTIFICATION | PASS |
| contentsDisplay (approved claim) | visitors may view the studio, meet the maker, and shop available textile pieces in person | required | owner stamp | OWNER_APPROVED_FOR_CERTIFICATION | PASS |
| phoneDisplay | *(empty)* | required-empty | owner stamp: phone not required | OWNER_APPROVED_FOR_CERTIFICATION | PASS |

---

## 3. Photo manifest

**Supplied photographs:** 0  
**Required campaign slots:** 4  
**Rights bound to a file hash:** none  

A campaign-level “customer owns photos” sentence is **not** clearance. No file exists to inspect for likeness, trademarks, or third-party artwork. Cropping/adaptation permission is therefore **not established** for any asset.

| Slot ID | Filename | SHA-256 | Dimensions | File type | Category | Intended campaign use | Rights status | Identity / privacy | Trademark / third-party artwork | Cropping / adaptation permission |
|---------|----------|---------|------------|-----------|----------|----------------------|---------------|--------------------|---------------------------------|----------------------------------|
| moss-thread-product-textile-1 | *(not supplied)* | *(none)* | *(none)* | *(none)* | product | photo-led social, video, print | NOT CLEARED — no file hash | cannot evaluate; no file | cannot evaluate; no file | not established |
| moss-thread-product-textile-2 | *(not supplied)* | *(none)* | *(none)* | *(none)* | product | photo-led social, video, print | NOT CLEARED — no file hash | cannot evaluate; no file | cannot evaluate; no file | not established |
| moss-thread-maker-at-work | *(not supplied)* | *(none)* | *(none)* | *(none)* | maker | photo-led social, video, print | NOT CLEARED — no file hash | unresolved — identifiable-person likeness cannot be confirmed without a file | cannot evaluate; no file | not established |
| moss-thread-studio-interior | *(not supplied)* | *(none)* | *(none)* | *(none)* | studio | photo-led social, video, print | NOT CLEARED — no file hash | cannot evaluate; no file | cannot evaluate; no file | not established |

Maker likeness: if a later file shows an identifiable person, the customer must attest permission to use that person’s likeness in promotional materials. That attestation must be bound to that file’s SHA-256. It is **not** confirmed now.

---

## 4. Acceptance result

**BLOCKED**

Production may not start. Required photographs lack exact manifest entries, file hashes, ownership bound to those hashes, campaign-use permission bound to those hashes, cropping/adaptation permission bound to those hashes, person-consent confirmation, and third-party IP inspection.

Passing tests only prove the gates reject missing files. They do not prove photographs are cleared.

### Board confirmation

| Control | Status |
|---------|--------|
| Room 4C | OPEN |
| Scenario 3 | PRE_PRODUCTION_BLOCKED |
| Scenario 1 hashes | unchanged (verified on disk) |
| Scenario 2 hashes | unchanged (verified on disk) |
| Room 5 | NOT_STARTED |
| Merge | none |
| Scenario 3 production files | none |
