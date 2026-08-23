# Gate X — owner customer-experience review

Package: `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`  
Status: **CLOSED WITH EXPLICIT LIMITS**  
Owner decision: **ACCEPTED** (2026-08-22)  
Final classification: **CLOSE WITH EXPLICIT LIMITS**  
No merge. Room 5 remains **NOT_STARTED**. Register tip `5c22de9` remains an untouched ancestor. The next package is not opened.

Closeout: `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CLOSEOUT.md`

| Tip | SHA |
|-----|-----|
| Corrections | `82e48727` |
| Supplemental evidence | `9fcc4c37` |
| Index pointer | `715ace3c` |
| Case 3 likeness supplemental | `261eb606` |

Sealed runs (do not overwrite, rename, or reinterpret):

- Original: `certification-runs/gate-x-run-2026-08-22T230059190Z/` · manifest SHA-256 `04c34166c92efe0b6f241033bff7f391e5ee98e2b12782d812def7b61412a14c`
- Supplemental Cases 2/4: `certification-runs/gate-x-run-2026-08-22T232853529Z/` · manifest SHA-256 `77f1dbf62b634bc5d695476f855d2dccf8e4bcd273260078bcf39b4f4d1073ab`
- Case 3 likeness supplemental: `certification-runs/gate-x-run-2026-08-22T235349346Z/` · manifest SHA-256 `ebd769003e7527fd906b627390f6804d71fe6b50fef68ae36bbdbc2be433f1d2`

Defect ledger: `DEFECT-LEDGER.md` (GX-D2 and GX-D4 **CORRECTED AND CERTIFIED**; original failures preserved).

---

## How to review (safe path)

Customer surface: Studio Board → **Materials we still need** (`MaterialsIntakePanel`).

1. Read the **customer-visible copy** in this file. That is the CX source of truth.
2. Open only **safe fixtures** listed below. Do not open owner portraits or Git-ignored run screenshots.
3. Use the sealed-run notes for routing labels. Treat tmp dumps as internal, not customer-facing.

**Safe to open**

- Scout Case 4 still: `controlled-test-pack/04-third-party-fictional/northwind-shelf-with-fictional-labels.jpg` (fictional labels only)
- Scout Case 5: `controlled-test-pack/05-corrupt/northwind-corrupt.png` (truncated PNG header, not a photograph)
- This review file and the three `certification-runs/*/notes.md` files

**Do not open**

- `tmp/gate-x-controlled-test-owner-staging/` (raw owner JPEG/PDF/PNG)
- `tmp/gate-x-run/` screenshots (may include file thumbnails of owner photographs, including the self-portrait)
- `.env.local`, cookies, storage locators, or campaign JSON under `data/`

Live campaigns from the runs are sandbox test accounts, not a public customer walkthrough. Do not sign in as those users for a photo review.

---

## Customer-visible copy (what the client reads)

### 1. Per-file rights questions — no preselected answers

Shown on file upload for logo, photo, and document slots. Empty draft starts with no checkbox and no Yes/No selected. Proof: `rightsDraftHasNoPrecheckedDefaults` in `src/lib/materials/materials-intake-rights-form.test.ts`.

| Customer text |
|---------------|
| These confirmations record your representations for this file. They do not guarantee legal ownership. The Studio uses them to control production use for your project. |
| I own this file, or I have permission to provide it for this project. |
| The Studio may use this file in commercial work for this project. **Yes / No** |
| The Studio may crop, resize, or adapt this file for this project. **Yes / No** |
| Does this file show recognizable people? **Yes / No** |
| If Yes: Everyone shown has given appropriate consent for commercial use in this project. If unchecked: If you cannot confirm this, you may still send the file. The Studio will hold it out of production until likeness consent is confirmed. |
| Does this file include third-party logos, artwork, trademarks, photography, or other protected material? **Yes / No** |
| If Yes: I have authority for commercial use of that third-party material in this project. If unchecked: If you cannot confirm this, you may still send the file. The Studio will hold it out of production until authority is confirmed. |
| Button: **Send to Studio** |

### 2–9. Status lines the client sees after send

| State | Label | Explanation |
|-------|-------|-------------|
| Cleared | Cleared for production | This file passed your rights confirmations and technical checks. The Studio may use it in production for your project. |
| Limits | Cleared with limits | This file is cleared with limits. The Studio may use it in production, but not with crop or adapt changes. |
| Likeness hold | Quarantined — Studio review required | Recognizable people appear in this file, but likeness consent is not confirmed yet. |
| Filename mismatch | Quarantined — Studio review required | Your answers do not match signals in this file name. The Studio will review this file before production use. |
| Third-party hold | Quarantined — Studio review required | Third-party protected material appears in this file, but commercial-use authority is not confirmed yet. |
| Corrupt reject | Alert on the panel | The Studio could not read this file. Please check the file and send it again. |
| Withdrawn | Withdrawn | You withdrew this file. It is no longer cleared for production use. |
| Duplicate | Receipt | We already have this exact file on your project. You do not need to send it again. |
| Stored name | Status | We have {fileName} stored with this project. |
| Outstanding | Panel title | Materials we still need |
| Under review | Status | Received — under review / We received this and our team is reviewing it. No further action is needed right now. |
| Empty required | Status | Still needed |
| Withdraw | Button | Withdraw this file |

Replacement (Case 6) on the customer panel shows the **new** filename and its current routing line. The retired file is kept as `SUPERSEDED` in the internal archive. The client does not see a separate “Superseded by a newer file” row for the old file.

Case 9 production blocking (`canTransitionToBuildingConcepts`) is a Studio workspace gate. The client sees outstanding required materials and any uncleared file’s routing explanation.

---

## Nine-case disposition

Read original + both supplementals together. Original actuals are not rewritten.

| Review item | Customer-visible result | Proof source |
|-------------|-------------------------|--------------|
| 1. Rights form, no preselects | Empty Yes/No and authority checkbox | Automated (`materials-intake-rights-form.test.ts`) |
| 2. Case 1 — cleared | Label **Cleared for production** + cleared explanation | **Original** live GET |
| 3. Case 2 — cleared with limits | Label **Cleared with limits** + no-crop/adapt explanation; stored `no_crop_adapt` | **Supplemental** live GET (original live was unrestricted clearance — GX-D2, corrected and certified) |
| 4. Case 3 — likeness quarantine | Label **Quarantined — Studio review required**. Explanation: Recognizable people appear in this file, but likeness consent is not confirmed yet. | **Case 3 supplemental** live GET. Original live quarantined on filename mismatch and is not rewritten. |
| 5. Case 4 — third-party quarantine | Label **Quarantined — Studio review required** + third-party authority sentence | **Supplemental** live GET (original live was technical review — GX-D4, corrected and certified) |
| 6. Case 5 — corrupt rejection | HTTP 400; prior file unchanged. Panel alert uses the could-not-read sentence | **Original** live 400 + slot unchanged; sentence from live API copy / automated reject |
| 7. Case 6 — replacement | Active v2 **Cleared for production**; v1 archived SUPERSEDED internally | **Original** live GET (active filename v2) + original notes (archive) |
| 8. Case 8 — withdrawn | Label **Withdrawn** + withdrew explanation; withdraw button gone | **Original** live GET |
| 9. Case 9 — production blocked | Workspace gate `allowed=false` / `materials_incomplete` while required material is uncleared | **Original** (withdrawn file + empty slots) and **Supplemental recheck** (Case 4 logo-brand uncleared; Case 2 did not count as uncleared) |

---

## Automated tests after corrections

Re-run 2026-08-22 after `82e48727`:

- **9 files, 132 tests, all passed** — Gate X intake/rights + Room 4B/4C regression
- Visual-prep cover-crop refusal when `cropAdaptPermitted` is false: **2 passed** in the visual-prep slice (not counted in the 132)

That 132 is the post-correction Gate X + Room 4 bar. It is not a full-repo total. Closeout re-runs the same relevant suites.

---

## Branch and remote

- Branch: `operating/external-customer-content-intake-and-rights-certification-1`
- Evidence tips remain: corrections `82e48727` · supplemental `9fcc4c37` · index `715ace3c` · Case 3 `261eb606`
- Register tip `5c22de9` is an ancestor
- This review records the owner close decision. It does not change any sealed run.

---

## Remaining honest limits

1. Likeness and third-party detection uses customer declarations and filename hints; it does not perform image-content recognition.
2. Rights certification records customer representations and Studio controls; it is not an independent legal ownership determination.
3. Malware scanning is not included or claimed.
4. A superseded prior file is preserved internally but is not displayed to the customer with a separate “Superseded” banner.
5. The customer sees outstanding-material status rather than the internal `materials_incomplete` production-gate code.

Additional preserved notes (not current defects):

- Original Case 2 and Case 4 failed; those records stay failed in the original sealed run.
- Original Case 3 quarantined on filename mismatch in the first sealed run. That record stays unchanged. A later Case 3 supplemental live run proved the intended likeness-hold explanation.
- Original Case 5 proved reject + unchanged slot. The exact alert sentence was not stored in `outcomes.json`.
- Original hire still showed Waiting on Project Intake on the Board after Conversation Room intake; materials were available because payment had been received.
- Sandbox pay used `preferSandbox` API; the on-page sandbox button was not in the DOM.
- Owner raw files and secrets are not in Git and must stay out of this review.

---

## Owner decision

**ACCEPTED.** Final classification: **CLOSE WITH EXPLICIT LIMITS.**
