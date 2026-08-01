# UR-ROOM-CERT-1

**Status:** DEFINED · **CERTIFICATION NOT AUTHORIZED**  
**Type:** Room certification package definition (docs only until separately authorized)  
**Definition base / protected tip:** `4bb878c0ca1e5a6b88907bf36a1d7cc28e33ee54`  
**Branch:** `fix/discovery-responsive-layout`  
**Active room:** Unified Review / Final / Delivery Room  
**Authority:** Working Protocol §1 room-completion rule (LOCKED 2026-08-01)  
**Prior closed gate:** UR-PROOF-READINESS-INSPECT-1 — **COMPLETE / CLOSED** · Choice **A** (link-only proofs)

---

## Objective

Certify the **Unified Review / Final / Delivery Room as one room program** — not three disconnected products — with an honest outcome class of:

> **BROWSER-CERTIFIED WITH EXPLICIT LIMITS**

This is **not** a silent full close. Every carried limit from sealed siblings and Choice A must remain visible in the certification record.

**This definition does not authorize the certification run.** After the definition is sealed, Tagia must separately authorize certification.

---

## Room program under test

| Element | Requirement |
|---|---|
| Room | One Unified Review / Final / Delivery Room |
| States | **Review** · **Final** · **Delivery** — distinct states, same room |
| Canonical route | `/feedback-studio` |
| Legacy redirect | `/deliverables` redirects into the **Delivery** state of the same room |
| Lobby continuity | C8e lounge-plate continuity across Review · Final · Delivery |
| Proof viewing (Choice A) | Session-gated **link-only** open via `accessHref` — **no** embedded in-room proof renderer |
| Expected outcome | **BROWSER-CERTIFIED WITH EXPLICIT LIMITS** |

---

## Viewport coverage

| Viewport | Required |
|---|---|
| Desktop (~1440) | Yes |
| Phone (~390) | Yes |
| **360px** | Required **if** this cert claims Gate #17 / Hierarchy C #14 room close; otherwise disclose that 360 is **not** claimed |

Do not claim full multi-viewport room close without exercising the viewports listed in the cert plan.

---

## Regression scope (check — do not rebuild)

Certify that sealed behavior still works. **Regression-check only.** Do **not** reopen or rebuild sealed siblings without contradictory evidence.

| Area | Sealed / closed authority | Cert honesty |
|---|---|---|
| Update History | UPDATE-HISTORY-1 @ `1e1308e…` | Customer-safe `jobActivityEvents` projection; Final/Delivery need `jobId` |
| Version Compare | VERSION-COMPARE-1 @ `b0bd5e5…` | **Metadata only** — not visual compare · not auto-diff |
| Highlighter | HIGHLIGHTER-1 @ `96b6a39…` | Marks on **`proof_markup_board_v1`** — not source-proof pixels |
| Text Comment | TEXT-COMMENT-1 @ `071c2b1…` | Proof-version-bound text — **not** an in-proof location |
| Sticky | Existing room tools | Deliverable/section only — not Text Comment |
| Pencil | Existing room tools | Ephemeral strokes; section keys only — depth limits remain visible |
| Voice | Existing room tools | Tool exists; prior C8 certs did not exercise voice depth — limit remains visible |
| Decisions / submission | C8b · C8-CERT-1 | Draft free of round spend; formal submit locks package |
| Correction accounting | C8c · C8C-CERT-1 | Finite version-linked rounds; Scenario E execution limit remains visible |
| Handoff receipts | C8b | Presentation over records; 7A stage authority |
| Project Communication | COMM CWL · C8 reuse | In-product only; no email/SMS/push; no attachments; no read receipts — limits remain visible |
| Issue reporting | ISSUE-ENTRY-1 @ `727c831…` · Gate #12 CWL | System-receipt only; statuses Received / Additional information requested / Closed |
| Room navigation | C8d | Review / Final / Delivery state navigation; `?jobId=` preservation |
| Lobby continuity | C8e @ `167979e…` | Route-scoped lounge-plate; workspace readable |

---

## Explicit carried limits (must appear in the cert record)

These are **accepted certified limits**, not defects to “fix away” during cert:

1. **Proof viewing (Choice A):** session-gated links — **no** embedded renderer  
2. **Version Compare:** metadata-only  
3. **Highlighter:** `proof_markup_board_v1` — not source-proof pixels  
4. **Text Comment:** proof-version-bound without in-proof location  
5. **PAGE-TABS-1:** **deferred** — do not fabricate pages or dress proof selectors as pages  
6. **Pencil** persistence / draw-inventory depth limits remain visible  
7. **Voice** depth limits remain visible  
8. **COMM** channel limits remain visible  
9. **Issue reporting** system-receipt / no-SLA limits remain visible  
10. Prior C8d / C8e / C8C Scenario E / Auth CWL disclosures remain in force where still applicable  

---

## Hard exclusions

- No product construction / feature building in this package  
- No proof renderer  
- No Page Tabs construction  
- No Refund UI or Payment work  
- No inventing file contents, pages, previews, dimensions, or comparison results  
- Do not reopen sealed UPDATE-HISTORY-1, VERSION-COMPARE-1, HIGHLIGHTER-1, TEXT-COMMENT-1, C8a–C8e, correction accounting, handoff receipts, ISSUE-ENTRY-1, or UR-PROOF-READINESS-INSPECT-1 without concrete contradictory evidence  
- Leave all **113** unrelated dirty WIP entries untouched  
- Do not claim a silent “fully closed” room wipe of known limits  

---

## Room-completion sequence

1. Customer Update History — **SEALED** · UPDATE-HISTORY-1 @ `1e1308e…`  
2. VERSION-COMPARE-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `b0bd5e5…`  
3. HIGHLIGHTER-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `96b6a39…`  
4. REVIEW-TEXT-TOOLS-INSPECT-1 — **COMPLETE / CLOSED**  
5. TEXT-COMMENT-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `071c2b1…`  
6. PAGE-TABS-1 — **deferred**  
7. UR-PROOF-READINESS-INSPECT-1 — **COMPLETE / CLOSED** · Choice **A**  
8. **UR-ROOM-CERT-1** ← this package (defined; certification waits)  
9. Only then Payment room / Refund UI  

---

## Definition of done (when certification is later authorized)

1. Browser cert plan executed covering Review · Final · Delivery on `/feedback-studio`, plus `/deliverables` → Delivery redirect.  
2. Desktop + phone exercised; 360 exercised **or** explicitly not claimed for Gate #17.  
3. Regression checks from the table above pass or fail with honest evidence — no silent skips.  
4. Choice A link-only proof viewing verified (open via session-gated link; no claim of in-room embed).  
5. Full **explicit limits list** written into the certification record.  
6. Temp cert harnesses removed before seal (same pattern as prior tool seals).  
7. Outcome class recorded as **BROWSER-CERTIFIED WITH EXPLICIT LIMITS** (or fail with evidence).  
8. Hierarchy C #8 / room-close language updated only from sealed cert evidence — not from this definition alone.  

---

## Authorization gates

### Docs definition (this package document)

Authorized for documentation that defines **UR-ROOM-CERT-1**. After this definition is sealed, **certification remains blocked**.

### Certification run

Scout remains parked for certification until Tagia explicitly says to authorize **UR-ROOM-CERT-1** certification (exact wording Tagia uses).

### Construction / Payment

No product construction, renderer, Page Tabs, Refund UI, or Payment work is opened by this definition.

Until then: definition may be sealed · open construction package **none** · open certification package **none** · product tip holds at protected control point `4bb878c0ca1e5a6b88907bf36a1d7cc28e33ee54`.
