# STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1 REPORT

**Package:** STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1  
**Room:** 1 — Customer Life + Communication (this section only)  
**Branch:** `operating/design-renderer-proof-1`  
**Scout status:** PARKED — ready for Manager review · **no merge**  
**Starting control:** Room 1 not closed. Previous customer-life package `c713cb7` found the live upload path was **filename / metadata, not file bytes**. This package closes that seam.

Maya fixture (unchanged): Maya Brooks · Cedar & Bloom Home Organizing · Back-to-School Reset · Make Me a Flyer / `v2-rtu-flyer` / Studio fee **$69**. No new customer facts. Sealed flyer law still holds: `FLYER_PROOF_CONTRACT.customerLogoRequired === false`. Wordmark-only is allowed.

---

## A. Overall verdict

**READY FOR MANAGER REVIEW — WORKS, WITH ONE LIVE WALK STILL DUE**

Maya can finish flyer intake without a forced logo. If she sends a real file from the customer materials panel, The Studio now:

1. accepts the bytes  
2. stores them privately (Supabase File Room when configured; durable local File Room objects in non-production when it is not)  
3. ties them to Maya’s project and purchased job  
4. acknowledges from **stored** truth, not a filename string  
5. updates the materials ledger and job file registry so the Machine knows the file is present  
6. lets the authorized production path retrieve the actual bytes  
7. refuses empty / oversize / unsupported files, keeps the first copy of a duplicate, and fails closed if another customer tries to read Maya’s file  

`uploaded` is still not `approved_for_use`. Frozen product law was not rewritten. Owner routine = **NONE**. No new paid tool. Make and Canva were not added.

This package did not open Voice, Review, Owner Console, or Room 2.

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

## H. Return-later proof

Not localStorage. Campaign materials envelope is the durable ledger (`data/campaign-materials/` locally). File bytes are File Room objects (Supabase private storage in production; `data/file-room-objects/` when cloud storage is not configured in non-production). A new adapter instance still downloaded Maya’s PNG in test.

No live Maya campaign was sitting in this workspace’s `data/` to re-open in a browser this pass. The customer UI path is the Board / Campaign Record materials panel, which now sends real files.

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

---

## M. Regression totals

Targeted run (this package): **92 passed** across materials, Maya customer-life, flyer mapping, intake tablet status, File Room storage, job communication.

Follow-up: client-file-store return-later, Board next-action, Maya paid-activation customer-eyes: **17 passed**.

Communication “return to queue” was updated so a required logo that is only metadata_only / unauthorized no longer counts as received for Machine unwait. That matches uploaded ≠ approved for use.

Unrelated `current-identity.json` / auth ledger dirt on the branch was **not** included.

---

## N. Remaining limits

- A **live signed-in Maya Board click** (choose file → Send → see receipt → leave → sign in again) was not executed here because this workspace had no Maya campaign data to open. The customer path is implemented; Owner/Manager visual walk is still the close-the-loop check.  
- Production still needs configured private storage (existing File Room / Supabase). Local FS is the non-production stand-in, not a second product.  
- Email / Voice TELL loop is **out of this package** (next Room 1 section).  
- Review + revision full loop is **out of this package**.  
- Uploaded optional files still wait on team use-review before they may enter the flyer. That is preserved law, not a defect.  
- Shared mixed-SKU intake materials label is first-writer-wins from the schemas (business card vs flyer). Flyer-only Maya gets the wordmark-safe flyer copy.

---

## O. Commit / push state

Local commit on `operating/design-renderer-proof-1` with this package’s source, tests, and report. **Not pushed. Not merged.**

---

## P. Exact next section inside Room 1

Do **not** open Owner Console, customer-facing truth cleanup, rehearsal, or soft opening.

**Next:** `STUDIO-OPERATING-VOICE-MACHINE-AND-CUSTOMER-COMMUNICATION-1`

Continue Maya Brooks / Cedar & Bloom / Make Me a Flyer $69. Purpose: Studio Voice + Machine + customer communication still inside Room 1 — Maya is told from Machine truth at the right beats, without treating Board-only awareness as a delivered notice if that is still the gap. Then Review + Revision full loop. Then email/notification delivery + watchdog/failure drills.

Park this materials package until Tagia walks or accepts the live upload path.
