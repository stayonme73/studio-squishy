# STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1 REPORT

**Package:** STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1  
**Room:** 1 — Customer Life + Communication (this section only)  
**Branch:** `operating/design-renderer-proof-1`  
**Scout status:** PARKED — ready for Manager close · **no merge**  
**Starting control:** Room 1 not closed. Previous customer-life package `c713cb7` found the live upload path was **filename / metadata, not file bytes**. This package closes that seam after BUILD → BREAK → CUSTOMER-USE → FIX → RETEST.

Maya fixture (unchanged): Maya Brooks · Cedar & Bloom Home Organizing · Back-to-School Reset · Make Me a Flyer / `v2-rtu-flyer` / Studio fee **$69**. No new customer facts. Sealed flyer law still holds: `FLYER_PROOF_CONTRACT.customerLogoRequired === false`. Wordmark-only is allowed.

---

## A. Overall verdict

**READY FOR MANAGER CLOSE — LIVE MAYA BOARD LOOP PASSED**

Maya can finish flyer intake without a forced logo. She signed in, opened Studio Board with no internal ID, uploaded a real allowed PNG through the customer materials UI, saw a stored-file acknowledgement, left, opened a genuinely fresh browser, signed in again, and the same file was still attached and retrievable. Duplicate keep-first and “uploaded is not approved for use” held on that same walk.

Owner routine = **NONE**. No new paid tool. Voice/comms was not started.

This package did not open Review, Owner Console, or Room 2.

---

## B. Maya intake result

Customer-facing Flyer Intake (`rtu-flyer`) still requires Maya to **say** what she has or does not have. That field is not a file picker and was not removed.

What changed:

- Label no longer reads as “logo, photos…” as if a mark were required.  
- Hint now states a logo is not required, wordmark-only is allowed, and the actual file can be sent from Studio Board after the form.  
- Shared Project Intake uses each schema’s own materials label instead of overwriting every job with “Logo, photos, colors, or brand references.”

Maya can complete intake for a valid wordmark-only flyer. She is not blocked by a required logo file on this form.

Duplicate / confusing **file** slots that used to appear after pay (required logo, photos, “finished files” documents, distribution “platform/account” access, extra wording confirmation) were demoted so they no longer block production. Exact wording stays on intake (`mustInclude`). That is not a catalog rewrite.

---

## C. Actual file-storage proof

Previous path: PATCH JSON `{ fileName, mimeType }` → `uploadStatus: "metadata_only"` → `google_shared_drive` reference-only. The File object was discarded.

Now:

- Customer PATCH `/api/campaigns/[campaignId]/materials` accepts **multipart** with the real `File`.  
- JSON filename-only for `file-metadata` is rejected (`filenameOnlyRejected`) unless Maya is telling the Studio she does not have the file yet.  
- Bytes go through the existing File Room adapter (`category: "client_material"`), checksummed (`sha256`), written, then **read back**. Success is refused if retrieved bytes are missing.  
- Customer UI (`MaterialsIntakePanel`) keeps the `File` and sends FormData. File-name text fields are no longer treated as the upload.  
- Paid Studio Board also mounts that panel so flyer customers are not limited to the social-goal text workflow.

Proof: `src/lib/materials/client-file-store.test.ts` stores Maya’s PNG, checksums it, downloads the same bytes. A second File Room adapter instance still returns those bytes (disk, not localStorage, not in-memory-only).

---

## D. Receipt / acknowledgement proof

After a stored upload, the API receipt is:

> We received your file. The Studio has stored it with this project. Uploaded is not the same as approved for use.

Duplicate exact bytes:

> We already have this exact file on your project. You do not need to send it again.

That copy is returned only after `uploadStatus === "stored"` and a checksum exists. Filename-only no longer returns a success receipt.

Voice received-count for file slots now requires **stored** (or later approved for use). A submitted filename is not “we have the file.”

---

## E. Machine awareness proof

On a successful store:

- materials item → `uploadStatus: "stored"` + private `storageRef` + checksum  
- job `fileRegistry` gains the client material  
- `client_upload` activity is recorded  
- `lastClientResponseAt` updates  
- paid operating recovery still runs; if the chain is already clear, dispatch is still ensured  

For Maya’s flyer, readiness change is honest: **logo is optional**. The job is no longer waiting on a false required logo. Optional upload does not auto-approve use. Required rights-sensitive SKUs (for example Brand Foundation) still block production until approved for use — stored is not a skip around that law.

Waiting-on-client “materials received, returned to queue” now requires a **usable** required material (stored + authorization), not a filename row.

---

## F. Team retrieval / use proof

Authorized Owner / assigned staff GET:

`/api/campaigns/[campaignId]/materials/[itemId]/content`

returns the stored bytes (`x-studio-material-checksum`). Clients cannot use this route. Another customer cannot read Maya’s campaign (`canReadMaterials` / `canDownloadStoredCustomerMaterial` fail closed).

The file also sits on the job File Room registry with a private object ref. No Tagia download / re-upload bridge. Owner routine = NONE.

---

## G. Duplicate / wrong / unsupported-file behavior

| Case | Result |
|------|--------|
| Valid PNG/JPG/PDF/etc. | Stored, receipt, retrievable |
| Duplicate exact bytes | First file kept; duplicate receipt; no second registry copy |
| Wrong file that is still an allowed type | Stored as submitted, **not** approved for use. Team can send it back (`needs_clarification`). |
| Unsupported type (`.exe`, etc.) | Rejected with a next-step type list |
| Empty file | Rejected |
| Missing file | Rejected |
| Over 5 MB | Rejected |
| Filename JSON instead of bytes | Rejected |
| Leave and return | Fresh adapter / durable object still has the bytes |
| Other customer | 403 — cannot read or download Maya’s material |

---

## H. Return-later / live Board walk proof

Not localStorage as source of truth. Campaign materials envelope is the durable ledger (`data/campaign-materials/` locally). File bytes are File Room objects (Supabase private storage in production; `data/file-room-objects/` when cloud storage is not configured in non-production).

**Live Maya Board loop (required close-the-loop; not an API-only substitute):**

Script: `scripts/studio-operating-materials-upload-and-receipt-1-board-walk.mts`  
Evidence: `docs/launch/studio-operating-materials-upload-and-receipt-1/customer-board-walk/`  
Fixture: Maya Brooks · Cedar & Bloom · paid Make Me a Flyer **$69** · intake complete · wordmark-only. Unique sandbox email per run. Board opened at `/studio-board` with **no** `campaignId` in the URL.

| Step | Result |
|------|--------|
| Maya signs in → Studio Board | PASS — Cedar & Bloom, no internal ID |
| No false logo-required blocker | PASS — optional logo/photo copy |
| Upload real allowed PNG through Choose file + Send to Studio | PASS |
| Customer acknowledgement | PASS — “We received your file. The Studio has stored it with this project. Uploaded is not the same as approved for use.” |
| Wrong / allowed-but-not-approved file | PASS — 1×1 PNG stored as received / under review, **not** `approved_for_use` |
| Duplicate same bytes | PASS — “We already have this exact file on your project. You do not need to send it again.” |
| Leave / fresh browser context / sign in again | PASS — new Playwright context, empty cookies, then session restored the same project |
| Same file still attached and retrievable | PASS — Board shows `We have maya-optional-mark.png stored with this project.` Same checksum after return |
| Owner / Tagia intervention | **NONE** |

Walk checks: **15 passed / 0 failed**. Shots `01`–`05` in `customer-board-walk/shots/`.

Walk defects found and fixed before close:

- Attested optional logo was auto-promoted to `approved_for_use`, so the Board row and stored receipt disappeared. Stored bytes now stay `submitted` (received / under review). Customer attestation is not flyer-use approval.
- Board materials card sat below a no-scroll desktop grid, so Maya could not reach Send to Studio as a visible action. Studio Board main column now scrolls to that panel.
- Next could not serve the Board while Playwright leaked through the design-renderer barrel into a client component. `assemble-truth` now imports the flyer SKU from `types`, not the barrel.

---

## I. Security / ownership proof

- Submit: campaign client only (`canSubmitMaterials`).  
- Team download: Owner or assigned staff (`canReviewMaterials`).  
- Other client: cannot read the campaign, cannot download the file.  
- Stored files are `internal_only` client materials. Review Room / Final Delivery client download rules were not loosened.  
- Client API still does not expose the team ledger internals.

---

## J. Logo / photo requirement cleanup result

Sealed law **not** changed (`customerLogoRequired` remains false).

What was wrong: catalog `requiresClientMaterials` plus responsibility text (`logo`, `images`, `files`, `platform`, `account`, `wording`) seeded **required** File Room slots for Make Me a Flyer.

What this package did (slot inference + existing-ledger reconcile only):

- `logo-brand` and `photo-video` → **optional** for the sealed flyer SKU  
- distribution “finished files” / platform-account / extra wording confirmation slots are not required intake files  
- Brand Foundation (`bf-001`) logo stays **required**  
- optional Board prompts: a logo is not required; photos are not required  
- existing Maya ledgers are demoted on next materials read so an old required logo row cannot keep her stuck  

---

## K. Owner-dependence result

**NONE.**

Storage reuses File Room. Local FS fallback exists only when Supabase env is missing and `NODE_ENV` is not production. Production without storage env still fails closed.

---

## L. Customer-visible friction found and fixed

| Friction | Fix |
|----------|-----|
| “We received your file” when only a name was recorded | Multipart bytes + stored-only receipt |
| Required logo on a wordmark-only flyer | Optional slots + intake copy |
| Files “not uploaded on this form” with no later real upload | Board / intake panel now stores the file |
| Optional file send hidden behind a closed “add more” toggle | Optional list starts open; optional prompts are explicit |
| Board “still need” cards submitting campaign-goal **text** for file slots | File-metadata cards removed from that text workflow; real upload panel used |
| Filename-only later blocked from sending the actual file | Customer can upgrade a metadata row to stored bytes |
| Optional attested upload auto-“Approved” a 1×1 PNG and hid the receipt | Stored files stay submitted / under review; receipt + filename remain on Board |
| Desktop Board clipped the materials upload panel | Board main column can scroll to Choose file / Send to Studio |

---

## M. Regression totals

Targeted run (this package): **92 passed** across materials, Maya customer-life, flyer mapping, intake tablet status, File Room storage, job communication.

After live-walk corrections: materials + Maya customer-life + material-use **92 passed** (12 files). Added attested-store case: stored file is not `approved_for_use`.

Live Board walk: **15 passed / 0 failed**.

Unrelated `current-identity.json` / renderer artifact / auth ledger dirt on the branch was **not** included.

---

## N. Remaining limits

- Production still needs configured private storage (existing File Room / Supabase). Local FS is the non-production stand-in, not a second product.  
- Email / Voice TELL loop is **out of this package** (next Room 1 section). Do not start it in this package.  
- Review + revision full loop is **out of this package**.  
- Uploaded optional files still wait on team use-review before they may enter the flyer. Customer permission attestation is not flyer-use approval.  
- Shared mixed-SKU intake materials label is first-writer-wins from the schemas (business card vs flyer). Flyer-only Maya gets the wordmark-safe flyer copy.

---

## O. Commit / push state

Implementation commit `25c963b`. Walk close commit recorded after this report. Branch `operating/design-renderer-proof-1` pushed to origin. **Not merged.**

---

## P. Exact next section inside Room 1

Do **not** open Owner Console, customer-facing truth cleanup, rehearsal, or soft opening.

**Recommended next (do not start until Tagia closes this package):** `STUDIO-OPERATING-VOICE-MACHINE-AND-CUSTOMER-COMMUNICATION-1`

Continue Maya Brooks / Cedar & Bloom / Make Me a Flyer $69. Purpose: Studio Voice + Machine + customer communication still inside Room 1 — Maya is told from Machine truth at the right beats, without treating Board-only awareness as a delivered notice if that is still the gap. Then Review + Revision full loop. Then email/notification delivery + watchdog/failure drills.
