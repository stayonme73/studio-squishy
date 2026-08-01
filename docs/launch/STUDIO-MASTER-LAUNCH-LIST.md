# The Studio — Master Launch List

**Living launch control tower.** Carry with [`STUDIO-LAUNCH-WORKING-PROTOCOL.md`](./STUDIO-LAUNCH-WORKING-PROTOCOL.md) and [`CUSTOMER-FACING-ROOM-INVENTORY.md`](./CUSTOMER-FACING-ROOM-INVENTORY.md). Temporary owner view: `/file-room/launch-tracker`.

Completed work stays visible and crossed out with evidence. Only one item is **CURRENTLY IN PROGRESS**.

### Permanent operating checklist

- [x] **Do not repeat actions already completed.** Scout must red-flag repetitive instructions and return existing evidence instead of redoing the work. *(NON-NEGOTIABLE · Tagia 2026-07-26)*
- [x] **Room-completion rule.** Once a customer-facing room is active, complete and certify all known launch-critical work for that room before opening construction in another room. *(LOCKED · Tagia 2026-08-01 · Working Protocol §1)*
- [x] Important Chat guidance is recorded in this Communication Notebook or the relevant package document.
- [x] Built ≠ tested ≠ certified ≠ protected ≠ launch-ready.

---

## Daily Snapshot

| Field | Value |
|---|---|
| Protected tip | `36c3468873373ccffb87801edcd45f5ef6168888` — `docs(launch): define review text tools inspection` · advances when TEXT-COMMENT-1 definition is sealed |
| Branch | `fix/discovery-responsive-layout` |
| Sync | **0 ahead / 0 behind** · staging empty · substantial unrelated dirty WIP present (leave untouched · expected **113**) |
| Current active item | **None** — Scout parked · **TEXT-COMMENT-1** defined · **construction not authorized** |
| Doctrine path | `docs/launch/STUDIO-VOICE-DEFINITION-AND-CUSTOMER-PRESENCE-DOCTRINE.md` (**PROTECTED**) |
| Most recently completed | REVIEW-TEXT-TOOLS-INSPECT-1 **COMPLETE / CLOSED** · HIGHLIGHTER-1 **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `96b6a39` · VERSION-COMPARE-1 @ `b0bd5e5` · UPDATE-HISTORY-1 @ `1e1308e` · HIGHLIGHTER-COMPARE-INSPECT-1 **COMPLETE / CLOSED** · ISSUE-ENTRY-1 @ `727c831` · C8e @ `167979e` · C8d `956f4d8` · C8C-CERT-1 `ed5e1d0` · C8c `cebe713a` · C8a `04bd9ba` · C8b `77f6835` · C8-CERT-1 `508bddf` |
| Next three priorities | 1) Finish Unified Review / Final / Delivery Room — **TEXT-COMMENT-1** → PAGE-TABS-1 (deferred) → proof/cert limits → UR-ROOM-CERT-1 · **TEXT-COMMENT-1 construction not authorized** · 2) Materials dual UX decision (waiting — Board limit) · 3) Refund UI only after this room is certified (Payment room) |
| Active blockers | Unified Review room not fully closed (Text Comment · deferred Page Tabs · proof/cert limits) · Materials dual UX waiting · Refund UI waits room completion then Payment-room authorization |
| Decisions waiting | **1** — Materials dual UX (Board limit) |
| Customer-One readiness | **4 of 23** readiness gates complete (#16, #18, #20, #22) · Gates **#4**, **#5**, **#7**, **#9**, **#10**, **#11**, **#12**, and **#19** are **COMPLETE WITH LIMITS** (not counted in the complete total) · Hierarchy C #5–#7 COMPLETE WITH LIMITS · C #8 **PARTIAL / COMPLETE WITH LIMITS** (C8a/C8b/C8c/C8d/C8e; not a full unified-room close) · Hierarchy C #10 (Complaint and issue entry) **COMPLETE WITH LIMITS** @ `727c831` |
| Last updated | 2026-08-01 |

---

## Status Legend

| Status | Meaning |
|---|---|
| **COMPLETE** | Built, verified, accepted, and protected |
| **COMPLETE WITH LIMITS** | Built and protected, but an explicit dependency or launch condition remains |
| **READY TO PROTECT** | Finished and reviewed but not committed/pushed |
| **IN PROGRESS** | Current approved package |
| **PARTIAL** | Real functionality exists; definition of done not met |
| **SCAFFOLD** | Shell exists; launch behavior incomplete |
| **MISSING** | Required surface or behavior does not exist |
| **BLOCKED** | Cannot safely proceed without correction or owner decision |
| **DECISION NEEDED** | Waiting for Tagia |
| **DEFERRED** | Intentionally scheduled later |
| **PARKED** | Outside launch scope |
| **OBSOLETE** | No longer part of the live customer path |
| **DISCONTINUED** | Owner-locked: will not continue building this direction |

### Done vs launch-ready

| Term | Meaning |
|---|---|
| **Built** | Implementation exists |
| **Tested** | Targeted proof passed |
| **Certified** | Approved launch contract passed |
| **Protected** | Committed and pushed |
| **Launch-ready** | Built, tested, certified where required, protected, integrated, truthful, accessible, responsive, and safe for Customer One |

A task may be **complete** but **not launch-ready** if a required dependency remains (for example Auth protection, mobile proof, or Voice definition).

### Completion evidence rule

Every completed item must show available evidence: commit hash · subject · tests · certification · production build · desktop/phone/360 · access-control · owner acceptance · known limits · launch-ready vs technically complete.

- Use **Evidence not yet pinned** when evidence exists but has not been re-verified.
- Use **No dedicated certification recorded** when no certification exists.
- Do **not** invent hashes, totals, dates, or proof.
- Do **not** silently treat an untested feature as complete.
- A prior package test does **not** automatically certify later integrated behavior.

---

## Communication Notebook

> Temporary owner ↔ Scout notebook. Source of truth is this markdown file. Refresh `/file-room/launch-tracker` after Scout saves.

### Tagia Notes

- **2026-08-01 — TEXT-COMMENT-1 defined, construction not authorized:** Distinct REVIEW TOOLS Text Comment — not Sticky Notes. Persist via `JobReviewFeedback`. Bind job + deliverable + proof file + recorded version label. **No geometry / pages / regions / pixels** in first slice. Draft save must not consume a correction round. Review-only. Preserve sealed Compare / Highlighter / Update History / corrections / Sticky / navigation. No Page Tabs · no proof-rendering redesign · no Refund/Payment · no Final/Delivery editing. PAGE-TABS-1 deferred. Template: `docs/launch/TEXT-COMMENT-1.md`. Construction requires separate authorization after this docs definition is sealed. Product tip holds at `36c3468…`.
- **2026-08-01 — REVIEW-TEXT-TOOLS-INSPECT-1 complete / closed:** Inspection accepted. Inspect together, build separately. Text Comment can proceed on proof-file/version identity; Page Tabs blocked without truthful page/location identity (do not invent pages or dress proof selectors as pages). Next: TEXT-COMMENT-1. PAGE-TABS-1 deferred. Do not reopen without contradictory evidence.
- **2026-08-01 — REVIEW-TEXT-TOOLS-INSPECT-1 defined, inspection not authorized:** Combined inspection of **Page Tabs** and **Text Comment** for Unified Review room completion. *(Superseded by complete/closed note above.)*
- **2026-08-01 — HIGHLIGHTER-1 sealed:** **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `96b6a39606a7c9713327801f801d17b4c8c2068b` — `feat: add version-bound review highlighter` · marks on version-bound `proof_markup_board_v1` · **not** pixels inside the source proof · not Pencil · not auto change detection · browser 21/21 · focused unit 27/27 · temp cert harness removed before seal.
- **2026-08-01 — HIGHLIGHTER-1 defined, construction not authorized:** Distinct REVIEW TOOLS highlighter — not Pencil/Draw. Preferred persistence: highlight geometry tied to a selected deliverable + proof file/version. No invented coordinates where preview cannot host them. No pixel/text/auto-diff. Does not consume a correction round alone. Review-first. Template: `docs/launch/HIGHLIGHTER-1.md`. *(Superseded by seal note above.)*
- **2026-08-01 — VERSION-COMPARE-1 sealed:** **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `b0bd5e5f60eaf5342b45b3352d8903e237fec134` — `feat: add truthful proof version comparison` · recorded proof **metadata** comparison only · not rendered visual proof comparison · not automated change detection · browser 37/0 · focused unit 14/14 · temp cert harness removed before seal.
- **2026-08-01 — HIGHLIGHTER-COMPARE-INSPECT-1 complete / closed:** Inspection accepted. Version Compare and Highlighter are architecturally separate packages in the same room sequence. Owner decision: Version Compare first; Highlighter later with persistence = geometry tied to proof version. Room not complete after Compare + Highlighter alone — Page Tabs, Text Comment, proof-rendering depth, and prior cert limits remain before UR-ROOM-CERT-1. Do not reopen without contradictory evidence.
- **2026-08-01 — UPDATE-HISTORY-1 sealed:** Customer Update History **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `1e1308e9f0e4c8b5728a605e4c930198fc2d17e6` — persisted `jobActivityEvents` projection only · Final/Delivery need `jobId` · COMM/project-activity not merged · browser 57/0 with temporary harness removed · Hierarchy C #12 advanced; Gate #12 remains issue reporting COMPLETE WITH LIMITS (do not conflate).
- **2026-08-01 — Room-completion rule (LOCKED):** Sequencing is **room by room**, not feature by feature. Once a customer-facing room is active, complete and certify all known launch-critical work for that room before opening construction in another room. **Active room:** Unified Review / Final / Delivery. **Order:** (1) Customer Update History — sealed (2) VERSION-COMPARE-1 — sealed (3) HIGHLIGHTER-1 — sealed (4) REVIEW-TEXT-TOOLS-INSPECT-1 — closed (5) TEXT-COMMENT-1 (6) PAGE-TABS-1 deferred (7) proof-rendering + prior cert limits (8) UR-ROOM-CERT-1 (9) only then Payment room / Refund UI. Working Protocol §1.
- **2026-08-01 — UPDATE-HISTORY-INSPECT-1 closed:** Inspection completed; construction sealed as UPDATE-HISTORY-1 @ `1e1308e…`. Do not reopen as an open package.
- **2026-08-01 — Scout lean handoff (locked pattern):** Scout receives a separate control-point package, not the entire Flight Manual. Governing truth stays in Master List / Working Protocol / inventory; Scout’s immediate instructions stay narrow and action-ready. When no package is authorized: **Stand by. Verify the protected control point only. Do not begin a new package.** Template: `docs/launch/SCOUT-CONTROL-POINT-HANDOFF.md`. Protected tip: `36c3468873373ccffb87801edcd45f5ef6168888` · branch `fix/discovery-responsive-layout` · expected 0/0 · staging empty · open construction/inspection packages **none** · TEXT-COMMENT-1 defined only.
- **2026-07-26 — Standing rule (locked):** Important Chat guidance must not live only in chat. Send it to Scout and record it here or in the relevant package document.
- **2026-07-26 — Inventory accepted:** Classifications and completion order accepted. Inventory marked complete.
- **2026-07-26 — LOCKED:** Purchased-room authentication and data protection must be completed and certified **before Tagia begins the Customer-One trial.** Not Parking Lot. Does not stop Studio Voice definition.
- **2026-07-26 — Master Launch List must show the full picture** in true priority order: completed, protected, tested, certified, partial, missing, blocked, deferred, parked — with evidence under every completed item. “Built” ≠ “launch-ready.”
- **2026-07-26 — DISCONTINUED:** Live Host / Voice Host will not continue. Studio Voice remains **without** a mascot or hovering character. Recommendation engine will **not** continue for launch.
- **2026-07-26 — Legacy pages:** Leave the live customer path; **archive before any deletion.** Tagia wants verified current and intended page counts distinguishing routes, states, overlays, redirects, scaffolds, internal routes, and archive candidates.
- **2026-07-26 — Launch control tower accepted:** Tagia accepts the priority ordering and launch-control structure.
- **2026-07-26 — OFFICIAL PAGE COUNT LOCK:** Current repository has **16** live customer-facing routed pages. Approved Customer-One target is **15**. **Fourteen** is only a possible intermediate alias-consolidation count (Lobby). **Thirteen** is the later target after the unified Review/Final/Delivery room. Page-count reduction does **not** authorize premature route removal, archiving, or deletion.
- **2026-07-26 — Archive-before-delete remains locked.** Live Host and recommendation-engine directions remain discontinued.
- **2026-07-26 — ANTI-LOOP RULE (NON-NEGOTIABLE):** Repeated work wastes critical launch time. Scout must alert Chat before entering a repetition loop. Chat should ask whether a task is already done before assigning it. Tagia should not have to manually stop already-settled work. The rule must travel in every new-thread suitcase (Working Protocol § Anti-Loop + suitcase ANTI-LOOP RULE line).
- **2026-07-26 — Conversation Room decisions CR-D1–CR-D5 answered (LOCKED):** Keep the typed dock and remove dead Host wording. Editable captured speech does not need a redundant confirmation loop — but consequential actions (payment, scope commitment, submission, approval, revision, delivery acceptance, complaint, refund) still require explicit confirmation. Sandbox checkout is acceptable **for Customer-One only**; **real payment is required before external customers** (now an External Soft-Opening gate). Unwired `discovery/` components wait for the CR-5 audit — archive before delete, no deletion without Tagia approval. **The stage machine is the live authority. Do not create or wire a competing phase authority.** Scout's inspection passed the anti-loop test: two real launch gaps found, not a reason to rebuild the Conversation Room.
- **2026-07-26 — Voice decisions V1/V2/V3 answered (LOCKED):** V1 account persistence with session override (signed-out stays session-only; account persistence is future construction). V2 Board/Review/Delivery quiet by default — reading and decision rooms, not guided tours. V3 communication/complaints/refunds: Voice available on request with restrained escalation guidance; no arguing, defending, refund approval, outcome promises, or minimizing; money/trust matters escalate to Tagia. **Governing principle: Voice guides active construction work, stays quiet during review work, and becomes a careful intake channel during sensitive issues.**

### Scout Notes

- **2026-07-26** — Protocol · Master List · Launch Tracker · Inventory protected through `65f11c6`. Tip sync 0/0.
- **2026-07-26 — Full-list rewrite:** Reordered by launch priority; status legend; Done vs launch-ready; Customer-One and soft-opening gates; discontinued Host/recommendation directions; archive policy; verified page counts from `src/app/**/page.tsx` (53 route files) + inventory.
- **Route count findings:** Live customer-facing routed pages **16** · CR/Lobby/Review states listed separately · Redirect-only **19** · Scaffolds **3** · Internal-only **15** (includes 3 ungated tooling routes that must enter Auth audit) · Archive candidates **19** (redirect shells first) · Missing approved surfaces **5**.
- **2026-07-26 — Page-count arithmetic (locked):**
  - **16 → 15 (Customer-One):** Reclassify `/verify-email/pending` as a verification **state** of `/verify-email` for the approved live-room target (same pattern as Job Review under `/feedback-studio`). It remains a real route file today; Customer-One target does not treat it as a separate journey room.
  - **15 → 14 (optional intermediate):** Consolidate Lobby aliases — `/studio-lobby` becomes **REDIRECT** to canonical `/`. Not required for Customer-One unless Tagia later changes the launch order.
  - **14 → 13 (later unified room):** Merge `/feedback-studio` + `/deliverables` into one unified Review/Final/Delivery room after Voice, CR, communication, Board truth, Tagia design approval, construction, and certification.
  - Compatibility: keep `/studio-lobby`, `/verify-email/pending`, `/review-room`, and other redirects until replacement paths are verified — page-count milestones are not permission to remove routes early.
- **Archive caution:** Do not archive redirect shells until replacement live path is verified for bookmarks. Do not delete Host/recommendation code without dependency audit — tests, Owner QA seeds, and dirty WIP still reference Host-era and recommendation-era surfaces.
- **Recommended next action:** Protect this documentation checkpoint, then begin Studio Voice Definition (docs only) in a new thread.
- **2026-07-26 — Studio Voice doctrine opened:** Draft at `docs/launch/STUDIO-VOICE-DEFINITION-AND-CUSTOMER-PRESENCE-DOCTRINE.md`. Inherits already-locked Host discontinuation, recommendation discontinuation, Lobby silence, CR preference gate, Presence System, Guidance Doctrine, page counts, Auth-before-Customer-One. Newly defines: identity, hovering vs presence, Voice Off journey contract, five channels, authority/escalation matrix, truthfulness vocabulary, a11y multimodal rules, presence-state inventory, full room-by-room Voice matrix. **No product code.** Not complete until Tagia approves. Anti-repetition section lists locks Chat must not re-open as first dates.
- **Chat guidance recorded:** Studio Voice is a system and representative, not the old Host with a new name. Define behavior before choosing implementation. Silence is intentional. Voice Off must preserve the full journey. Communicate separately with customer, machine, Chat, team, and Tagia. Money, deadlines, complaints, refunds, reputation, and trust require escalation. Every irreversible action needs clear authority and attribution. Doctrine must prevent fake recommendations, fake human presence, fake status, and fake completion.
- **2026-07-26 — Anti-loop rule locked into protocol + Master List + suitcase.** Voice doctrine draft **not** rewritten. Inherited locks remain inherited. Only open Voice decisions remain V1–V3; Materials dual UX stays Board-only.
- **2026-07-26 — Conversation Room Completion opened (inspection only, tip `03ee8a7`):** Anti-loop gap check done; plan at `docs/launch/CONVERSATION-ROOM-COMPLETION-PLAN.md`. **Completed behavior found (do not repeat):** stage machine, Voice preference gate, route honesty pass (2026-07-21), Plan+Checkout guidance cert (2026-07-19), working-draft contract, phone layout fix `cc80d94`, checkout sandbox honesty, intake gating, signed-in/out handoff cert, Lobby Entry Film reopen cert, Help shell. **Dirty WIP found (~301+/−315 across 23 files + untracked `lobby-begin.ts`, presence wave):** resume-after-Lobby-return, fresh-start-after-complete, Entry Film return route, draft preserve-on sign-out/timeout, presence rail trim — **all 34 CR unit tests pass on the WIP.** **Genuine gaps:** no end-to-end CR cert script (desktop/phone/360 unproven as a journey), intake answers unattributed, ledger attribution/tests/desktop/mobile gates pending on every row, stale "Discovery Question 1 live wire" comment, send affordance promises dead "Voice Host reply" package, unwired parallel `discovery/` components, phase-gate evaluator unused on live path. **Nothing needs a rewrite.** Proposed order: CR-1 protect WIP → CR-2 truth cleanup → CR-3 intake attribution → CR-4 end-to-end cert → CR-5 obsolete-path hygiene. **Blockers:** none new; Auth-before-Customer-One stands. Decisions CR-D1–CR-D5 added below. No product code changed; nothing committed.
- **2026-07-26 — CR-D1–CR-D5 answered; plan protected.** Existing CR behavior must be **preserved rather than rebuilt**. **CR-1 is a validation and protection package** — it must not absorb CR-2 through CR-5. **Intake attribution belongs to CR-3.** **End-to-end journey certification belongs to CR-4.** Parallel `discovery/` and phase-gate systems belong to the **CR-5 audit** (archive before delete). Locked genuine gaps: intake answers bypass the attributed working-draft history; no full end-to-end Conversation Room certification exists. Neither justifies rewriting the working stage machine. Voice doctrine evidence commit: `03ee8a7e48beb72a2bf249a9da1d340ebe538bc1`.
- **2026-07-26 — CR-4 CERTIFIED (evidence checkpoint).** Conversation Room end-to-end certification **PASS** against product tip `02657aa1edc8e73c6b04d9a7ef843509a50dba3a`. Record: `docs/launch/CR-4-CONVERSATION-ROOM-CERTIFICATION.md`. Harnesses: `scripts/cert-conversation-room-journey.mjs` · `scripts/cert-cr4r-interaction-proof.mjs` · `scripts/cert-cr4r5-tablet-scrim.mjs`. **Protected chain:** CR-1A `d778e7e` · CR-1B `62fa506` · CR-1C `7ad3876` · CR-2 `26f136d` · CR-3 `fb1ad24` · CR-4R1 `5c719ab` · CR-4R2 `3f89c80` · CR-4R3 `318d89d` · CR-4R4 `f0a122c` · CR-4R5 `02657aa`. **Proof:** production build PASS · focused Vitest 100/100 · extra auth/attribution/Lobby 26/26 · CR-4R 49/49 · CR-4R5 51/51 · full journey 105 PASS · Row 25 continuation 17 PASS · **all 30 required rows PASS** (including signed-in Board handoff and signed-out Create Account → same project Board) · desktop 1440 / phone 390 / narrow 360 PASS · Voice On/Off PASS · Intake attribution PASS · Lobby return and fresh-start PASS · no Studio Review customer navigation. **Non-blocking deferrals (not complete):** audible Voice quality · materials dual-UX (Board) · Checkout cancellation unsupported (N/A) · 66 unrelated TypeScript baseline errors · real integrated payment = external-launch gate. Generated artifacts intentionally not committed. *(Superseded note: earlier drafts said “CR-5 not started”; CR-5 → ARCHIVE-1 boundary are now protected — see following entries.)*
- **2026-07-26 — CR-5 COMPLETE.** Obsolete-path dependency and archive-candidate audit protected — `c69b669` · `docs: audit Conversation Room obsolete paths` · record `docs/launch/CR-5-OBSOLETE-PATH-DEPENDENCY-AUDIT.md`. Owner decisions CR-5-D1–D3 locked.
- **2026-07-26 — CR-5B1 COMPLETE.** Host Intake CTA truth repair — `dd8f5a3` · `fix(conversation-room): remove Host wording from Intake CTA`. Customer-visible `Open Host Project Intake` → `Open Project Intake`; destination `/studio-conversation-room?stage=intake` and Link behavior unchanged.
- **2026-07-26 — CR-5B2 COMPLETE.** Discovery dependency repair — `cd1f631` · `refactor(conversation-room): decouple legacy discovery UI`. Framework owns `DiscoveryPresentationPayload`; migration ledger discovery row corrected; discovery UI remains present and unwired.
- **2026-07-26 — ARCHIVE-1 BOUNDARY COMPLETE.** Boundary review protected — `eaf3c239` · `docs: define legacy discovery UI archive boundary` · record `docs/launch/ARCHIVE-1-LEGACY-DISCOVERY-UI-BOUNDARY.md`. Option A approved; future destination `src/archive/studio-conversation-discovery-ui/`; **actual archive move deferred until after Customer-One** (early-start only for build/security/truth/dependency obstruction). Directory not created.
- **2026-07-26 — MLL truth refresh.** Daily Snapshot / Hierarchy B / Hierarchy C / Hierarchy H reconciled to tip `eaf3c239`. Next incomplete Hierarchy C item remains **Customer communication and follow-up access — MISSING** (not started).
- **2026-07-28 — MLL-COMM-1 truth refresh.** Hierarchy C #4 and Gate #7 reconciled to tip `257456c` using `docs/launch/COMMUNICATION-FULL-LOOP-CERTIFICATION.md` (36/36 focused Vitest · 67/67 full-loop browser). Communication is **COMPLETE WITH LIMITS** (in-product Board + File Room only). Next incomplete Hierarchy C item = **Studio Board customer truth and completeness — PARTIAL**.
- **2026-07-28 — MLL-BOARD-1 truth refresh.** Hierarchy C #5 reconciled to tip `48ae3f6` using BOARD-TRUTH-1 decision map + `docs/launch/BOARD-TRUTH-2-PROJECT-SNAPSHOT-DELIVERABLES-HONESTY.md` (**10/10** snapshot · **37/37** Board truth regression · desktop ~1440 / phone ~390). Board truth is **COMPLETE WITH LIMITS**. Next incomplete Hierarchy C item = **Purchased-room Auth Route/Data Protection — MISSING** (locked before Customer-One). Materials dual UX remains a waiting decision / Board limit — not the next engineering package.
- **2026-07-28 — MLL-AUTH-1 truth refresh.** Hierarchy C #6 and readiness gates **#4** / **#5** reconciled to tip `e7688ef` using AUTH-TRUTH-1 + `docs/launch/AUTH-GATE-1-PROJECT-RECORD-PAGE-AUTHENTICATION.md` (**8/8** focused Auth Vitest · Board/Review/Delivery regression kept). Purchased-room Auth Route/Data Protection is **COMPLETE WITH LIMITS**. Stale “No server auth gate” language corrected for Board · Project Record · Review · Delivery. Next Hierarchy C item = **#7 Unified Review / Final / Delivery design approval** (waits on Tagia; not an engineering package). Project Claim, timeout WIP, Materials, and internal/dev routes remain outside this checkpoint.
- **2026-07-28 — MLL-C7-1 truth refresh.** Hierarchy C #7 reconciled to **DESIGN APPROVED / COMPLETE WITH LIMITS** using `docs/launch/UNIFIED-REVIEW-FINAL-DELIVERY-ROOM-CONTRACT-V1-LOCKED.md`. Sealed: Lobby persistent environmental background; one room with Review/Final/Delivery states; labeled REVIEW TOOLS + PROJECT COMMUNICATION; version-linked finite corrections; visible Studio↔customer handoff; locked submitted feedback packages. **C #8 UI construction NOT OPENED** (at that checkpoint). Readiness math remains **4 of 23**. Materials dual UX still waiting. Project Claim / timeout / Auth reopen not absorbed.
- **2026-07-29 — MLL-C8-CERT-1 truth refresh.** Hierarchy C #8 and Review Room gates reconciled to C8a `04bd9ba` · C8b `77f6835` · C8-CERT-1 `508bddf` (`docs/launch/C8A-REVIEW-ROOM-PANEL-CHROME.md` · `docs/launch/C8B-REVIEW-HANDOFF-RECEIPTS-LOCKED-SUBMISSIONS.md` · `docs/launch/C8-CERT-1-CUSTOMER-ONE-REVIEW-ROOM-BROWSER-CERTIFICATION.md`). C8a/C8b are **BROWSER-CERTIFIED WITH EXPLICIT LIMITS**. C #8 is **PARTIAL / COMPLETE WITH LIMITS** (panel chrome + handoff receipts only — not Delivery merge / correction accounting / highlighter/compare / Lobby rebuild). Gates **#9**, **#10**, **#11** → **COMPLETE WITH LIMITS**. Readiness math remains **4 of 23** complete. Artifacts and local cert data stay untracked. No new construction package opened.
- **2026-07-30 — MLL-C8C-1 truth refresh.** Hierarchy C #8 and correction-accounting truth reconciled to C8c implementation `cebe713a5397dd4b57858892612a45aa4a7fcbba` · C8C-CERT-1 browser evidence `ed5e1d06d87d94e3ea5977fb850222d86b087f41` (`docs/launch/C8C-FINITE-CORRECTION-ROUND-LEDGER.md` · `docs/launch/C8C-CERT-1-CUSTOMER-ONE-CORRECTION-ACCOUNTING-BROWSER-CERTIFICATION.md`). Finite correction-round accounting is **BROWSER-CERTIFIED WITH EXPLICIT LIMITS**: included allowances remain finite · usage is version-linked · used corrections do not silently reset · owner-authorized extras are recorded separately · original included allowance stayed unchanged when the owner extra was granted · resulting accounting and UI were browser-verified. Scenario E remains **PASS WITH AN EXPLICIT EXECUTION LIMIT** — formal consumption used the supported API because browser auto-submit was blocked; not fully browser-executed. C #8 remains **PARTIAL / COMPLETE WITH LIMITS** (C8a/C8b/C8c; Delivery merge · highlighter/compare · Lobby continuity rebuild still outside). Readiness math remains **4 of 23** complete. Artifacts and local cert data stay untracked. No C8d / no construction opened.
- **2026-07-30 — MLL-C8D-1 truth refresh.** Hierarchy C #8 reconciled to C8d construction `956f4d88f2bb8edb690427bd1dcd3472b7fcbdb6` — `feat: merge Final and Delivery into unified room` · harness `scripts/cert-c8d-unified-delivery-state-merge.mjs` · focused unit tests **14/14 PASS** · C8d browser certification **56/56 PASS**. C8d is **BROWSER-CERTIFIED WITH EXPLICIT LIMITS**: `/feedback-studio` is the current canonical unified room route · `/deliverables` redirects into the Delivery state of that same room · Review / Final / Delivery remain distinct states · Honest Final Files embedded in the unified room · labeled **REVIEW TOOLS** + **PROJECT COMMUNICATION** preserved · Review `?jobId=` preserved · 7A remains stage-navigation authority · Honest Final Files remains released-file and delivery-language authority · no invented files / statuses / completion / version labels · version labels scoped to released files for the focused job · focused-job delivery availability distinguished from other project files · stale/unavailable requested jobId does not silently substitute another named job · Auth · COMM · C8a · C8b · C8c · correction accounting · locked feedback packages preserved · existing utility backdrop reused without claiming final Lobby visual-continuity complete. **Explicit cert limits:** (1) Interactive MCP login screenshots were not completed. (2) Released-file Delivery verification used route mocks. (3) Locked-package immutability proof covered navigation stability, not a fresh submit-and-lock ceremony. (4) Final version labels appear only when released-file authority supplies them for the focused job. (5) Multi-job Final truth used mocked stages and mocked delivery data, not a live dual-job production campaign. (6) Stale-job proof checked neutral fallback and absence of substitute naming or authorization-oracle wording, not a full cross-tenant fixture-denial UX. C #8 remains **PARTIAL / COMPLETE WITH LIMITS** (C8a/C8b/C8c/C8d; not a full unified-room close). Remaining C #8 customer-facing slices — Lobby visual continuity treatment · highlighter / version comparison (subject to launch-gate review) — **not opened**. Readiness math remains **4 of 23** complete. Artifacts and local cert data stay untracked. No next construction package opened.
- **2026-07-31 — MLL-C8E-1 truth refresh.** Hierarchy C #8 reconciled to C8e construction `167979ef08203ad69811309abcfa7e763a7bc076` — `feat: add Lobby continuity to unified delivery room` · harness `scripts/cert-c8e-lobby-visual-continuity.mjs` · browser certification **31/31 PASS** · evidence `test-artifacts/c8e-lobby-visual-continuity/` (untracked). C8e is **BROWSER-CERTIFIED**: route-scoped CSS-only Lobby lounge-plate continuity on `/feedback-studio` across Review · Final · Delivery · central workspace remains dominant and readable · **REVIEW TOOLS** + **PROJECT COMMUNICATION** labels preserved · UtilityPageFrame / shared standards / config untouched · C8a–C8d logic untouched · Help Center and other utility routes retained the utility mural · Vitest focused suites **95/97** with **2 pre-existing failures** disclosed as unrelated owner-qa WIP (not introduced by C8e; left untouched). C #8 remains **PARTIAL / COMPLETE WITH LIMITS** (C8a/C8b/C8c/C8d/C8e; not a full unified-room close). Remaining C #8 customer-facing slice — highlighter / version comparison (subject to launch-gate review) — **not opened**. Visual Quality Queue — Quality: header navigation pill can overlap Final / Delivery subtitle at some widths (pre-existing; not introduced by C8e; not fixed in C8e). Readiness math remains **4 of 23** complete. Artifacts and local cert data stay untracked. No next construction package opened.
- **2026-07-31 — VQ-C8E-HEADER-1 docs-only disposition.** Moved out of the active Visual Quality Queue and closed in Hierarchy K as **NOT REPRODUCED — NO PRODUCT CHANGE JUSTIFIED**. Originally reported as a possible pre-existing header navigation-pill / subtitle overlap; static inspection identified possible breakpoint fragility involving utility header styles, but static suspicion alone was not accepted as evidence for a product change. A dedicated live-browser reproduction pass was completed: Review, Final, and Delivery tested across 15 viewports each — 45 total tested combinations — with **no overlap reproduced**; nav pill and subtitle maintained an approximately 13.6px gap; `getBoundingClientRect` evidence found zero intersections. **No product files were changed; no CSS fix was authorized or implemented.** Protected product tip remains `17b46bd4997b6e87c5a5d2c0762cc1d273bc169c`. Evidence remains untracked at `test-artifacts/vq-c8e-header-1-repro/`. **Reopen requires new reproducible evidence** naming a specific condition (browser/version, OS, viewport, browser zoom, OS text scaling, fixture/job state, font-loading condition, or screenshot/recording) — not a repeat of the static inspection or the 45-combination reproduction pass already completed. Closing a non-reproduced quality report does not by itself complete a Customer-One readiness gate; readiness math is unchanged at **4 of 23**. Docs-only; no product code touched; not staged/committed/pushed pending Tagia approval.
- **2026-07-31 — MLL-ISSUE-ENTRY-1 truth refresh.** Hierarchy C #10 (Complaint and issue entry) and readiness Gate #12 (Customer can report an issue) reconciled to sealed product tip `727c8311cf90184067d353fcd9f913bc48a597eb` — `feat: add customer problem reporting to project communication` · focused Vitest **50/50 PASS** · browser certification **116/116 PASS** · certification script `scripts/smoke-issue-entry-1.mjs`. **Recorded customer truth:** customers can choose **Ask a question** or **Report a problem** from the shared Project Communication composer, reused across Studio Board · Review · Final · Delivery; ordinary Project Communication remains available alongside the new choice; problem reports use the existing complaint and `OwnerDecisionInteractionRecord` authority and stay connected to the authorized customer and project/job context; customers receive **system-receipt confirmation only** — the system does not claim human review, assignment, escalation, investigation, or a response deadline; supported customer-visible statuses are **Received**, **Additional information requested**, and **Closed**; the composer returns to Ask a question after a problem is submitted; existing communication history remains intact; correction feedback (finite correction-round ledger) remains distinct from problem reporting. A narrow correction in `src/lib/campaign-tasks/generate.ts` preserves `ownerDecisionInteractions` for task-less campaign envelopes during read and refresh — no new data model was created. **Hierarchy C #10 → COMPLETE WITH LIMITS** (customer-facing issue-entry UI now exists; internal team assignment/escalation/SLA workflow remains out of scope by design, not a limit to be closed later). **Gate #12 → COMPLETE WITH LIMITS** (not counted toward the numbered complete total, consistent with the #9/#10/#11 pattern — those gates are also customer-facing capabilities delivered with explicit, accepted scope limits rather than a full closed workflow). Readiness math **remains 4 of 23** — see readiness accounting rule below. **Explicitly still unresolved (unchanged by this package):** Refund UI (Gate #13) · Customer update history (Hierarchy C #12/E7) · Highlighter / version comparison (remaining C #8 slice). Refund UI was **not** added; no ticketing platform was created; no ticket numbers, departments, agents, priorities, or SLAs were added. Docs-only; no product code touched; not staged/committed/pushed pending Tagia approval.

### Decisions Needed

| # | Question | Affected | Why it matters | Options | Scout recommendation | Owner decision | Status | Date |
|---|---|---|---|---|---|---|---|---|
| 1 | Auth Route/Data Protection timing | Auth + Board | Purchased rooms ungated | After Board / with Board / earlier if needed | After Board truth; before Customer-One; pull earlier if cert needs it | Schedule after Board truth/completeness; before Customer-One; may pull earlier for cert | **answered** | 2026-07-26 |
| 2 | Materials We Still Need dual UX | Board truth | CR Intake + Board card both say materials | Keep two-phase / unify copy / merge UI | Identify both; no redesign in inventory | Carry into Board package; no redesign selected yet | **waiting** | — |
| 3 | Coming-soon URLs | Nav truth | Scaffold routes exist | Park / hide / build | Do not advertise as available | Nav must not advertise unfinished routes; placeholders may remain internal/dev | **answered** | 2026-07-26 |
| 4 | Ungated internal tooling | Auth audit | `/studio`, `/textures`, `/decision-learner` | Gate now / before soft opening | Include in Auth audit | Must be inaccessible to signed-out and customers; include in Auth audit; no Owner Console expansion | **answered** | 2026-07-26 |
| 5 | Voice definition scope | Voice package | Prevent invented behavior | Docs-only whole journey | Docs-only; no Package 4 Host | Documentation only; define listed behaviors; no Host, no engine, no redesign, no TTS/STT change | **answered** | 2026-07-26 |
| 6 | Unified-room design kickoff | Review/Delivery | Room lock | After Voice, CR, comms, Board | After Voice, CR, comms, Board; no construction before Tagia layout approval | After Voice, CR completion, communication access, Board truth; no construction before Tagia layout approval | **answered** | 2026-07-26 |
| V1 | Voice On/Off persistence beyond session? | Voice doctrine | Today is sessionStorage only | Session-only · account · device | Session-only through Customer-One | **Persist by account, with session override.** Signed-in preference follows across visits; switchable anytime; signed-out stays session-only. Account persistence = future construction, not yet implemented | **answered** | 2026-07-26 |
| V2 | Board/Review/Delivery default Voice quiet? | Voice doctrine | Avoid Host return | Quiet default · brief welcome · room-specific | Quiet default | **Quiet by default.** Voice speaks only on customer ask, required attention, deadline/materials risk, or review/revision/approval/delivery help. Reading and decision rooms, not guided tours | **answered** | 2026-07-26 |
| V3 | Customer communication Voice class? | Comms construction | Surface missing | Optional · required · text-first + Voice assist | Text-first with Voice assist | **Available on request, restrained escalation guidance.** Collect facts, explain process, confirm capture, state next step. No arguing, defending, refund approval, outcome promises, or minimizing. Money/refunds/disputes/deadline failures/reputation/trust → Tagia | **answered** | 2026-07-26 |
| CR-D1 | Typed send promises "Voice Host reply comes in a later package" — dead package | CR truth | Dead-package promise is misleading | Honest copy · hide send · wire reply | Rewrite copy honestly; keep permanent dock; no reply engine | **Keep the permanent typed-input dock. Remove the obsolete Host-reply promise in CR-2 and replace with wording describing current behavior only.** Do not revive Package 4 Voice Host. Do not imply an unavailable conversational response feature is coming during the launch journey | **answered** | 2026-07-26 |
| CR-D2 | Dictation has no "did I hear you right" confirm loop | CR Voice | Customer edits text manually before Got it | Accept · add confirm loop | Accept — manual review satisfies truthfulness; no new construction | **Accept direct manual correction of speech captured into a visible editable field; no second confirmation loop merely because text came from speech.** Deliberate Continue / Save / submit confirms the edited answer. Captured content stays visible and correctable. **Consequential actions still require explicit confirmation:** payment · service or scope commitment · project submission · approval · revision submission · final delivery acceptance · complaint submission · refund request | **answered** | 2026-07-26 |
| CR-D3 | Checkout has no failure/cancel/retry (honest sandbox) | CR Checkout | Real processor is a later package | Accept for Customer-One · build retry now | Accept through Customer-One | **Sandbox checkout accepted through Customer-One only** — that trial validates the workflow and does not require charging Tagia. Must clearly and literally identify sandbox/test behavior; must not imply a real payment was processed; must preserve truthful success, failure, cancellation, and handoff states the sandbox supports. **Real, integrated, tested, certified payment path required before controlled external customers** — added to the External Soft-Opening gate. Do not silently carry sandbox checkout into external launch | **answered** | 2026-07-26 |
| CR-D4 | Unwired parallel `discovery/` components | CR hygiene | Parallel dead-ish build risks confusion | Archive-candidate after audit · leave | Audit + mark archive-candidate in CR-5; no deletion | **Leave physically untouched during CR-1 through CR-4.** Audit in CR-5 Obsolete-Path Hygiene; classify as archive candidates only after dependency inspection; archive before delete; **no deletion without Tagia's explicit approval** | **answered** | 2026-07-26 |
| CR-D5 | Phase-gate evaluator unused on live stage machine | CR architecture | Two loosely-synced state models | Wire gates · record stage machine as live authority | Record stage machine as live authority; gates stay design reference | **The live stage machine is the authoritative Conversation Room journey** (`opening → route → services → plan → checkout → intake → complete`). Do not wire `evaluateConversationPhaseGate` into the live path merely because it exists. Do not create a second authority system. Classify the parallel phase-gate system for CR-5 dependency audit and possible archiving; preserve untouched if tests, migrations, Owner QA, or dirty WIP still depend on it | **answered** | 2026-07-26 |

### Blocker Notes

> Hey Tagia, Scout and I found something we need to fix before moving on.

- **Purchased-room Auth Route/Data Protection (Hierarchy C #6)** — **COMPLETE WITH LIMITS** @ `e7688ef` (AUTH-GATE-1). Customer-One purchased-room page gates closed (Board · Project Record · Review · Delivery). Remaining Auth limits (Project Claim / email hard-before-Board · client-driven timeout · API-level ownership by design · internal/dev tools ungated) are **not** justification for another purchased-room page-gate package. Must not enter Parking Lot; do not reopen C #6 as MISSING.

### Daily Progress Notes

| Date | Active task | Work completed | Proof | Still open | Next action |
|---|---|---|---|---|---|
| 2026-07-26 | Launch process + inventory | Protocol · Master List · Tracker · Inventory accepted/protected | `e68ccbd` · `50915da` · `28bc218` · `65f11c6` · 0/0 | Master List full-priority rewrite | Tagia reviews reordered list; then protect; then Voice docs |
| 2026-07-26 | Master Launch List control-tower pass | Full priority reorder · discontinued directions · archive policy · verified page counts · readiness gates | Docs only · uncommitted pending Tagia review | Voice not started · Materials dual UX waiting | Protect docs when approved |
| 2026-07-26 | Page-count lock + protect | Official counts locked: 16 current · 15 Customer-One · 14 Lobby intermediate only · 13 later unified | `9e823ca` · 0/0 | Studio Voice definition not started | Begin Studio Voice Definition docs |
| 2026-07-26 | Studio Voice doctrine draft | Doctrine draft written for Tagia review; Master List updated; no product code | `docs/launch/STUDIO-VOICE-DEFINITION-AND-CUSTOMER-PRESENCE-DOCTRINE.md` (uncommitted) | Tagia review · V1–V3 Voice decisions · do not mark complete | After approval: protect doctrine, then Conversation Room completion |
| 2026-07-26 | Anti-loop rule protected · V1–V3 recorded | Anti-loop rule committed (`f1a8864`); Tagia answered V1/V2/V3; decisions recorded in doctrine §4/§12/§14 and this notebook | `f1a8864` · 0/0 · doctrine updated, still uncommitted | Doctrine protect order from Tagia · Materials dual UX (Board) | Protect Voice doctrine docs, then Conversation Room completion |
| 2026-07-26 | Protect Studio Voice doctrine | Doctrine + Master List protected; Voice crossed off; Conversation Room Completion becomes active | subject `docs: lock Studio Voice doctrine` · full hash in return report · 0/0 expected | Pin full hash on next Master List docs touch if needed · Materials dual UX (Board) · CR package not started | Open Conversation Room Completion in a new thread |
| 2026-07-26 | Conversation Room Completion — anti-loop gap check | Full stage/area inspection; dirty-WIP map; 34/34 CR unit tests pass on WIP; plan doc written; tip `03ee8a7` pinned | `docs/launch/CONVERSATION-ROOM-COMPLETION-PLAN.md` (uncommitted) · docs-only diff | Tagia: CR-D1–CR-D5 + approve CR-1 (protect dirty WIP) | Await Tagia decisions; then CR-1 selective staging package |
| 2026-07-26 | Protect CR completion plan + CR-D1–CR-D5 | Five decisions recorded in plan + Master List; real-payment gate added to External Soft-Opening; CR-1–CR-5 order approved | subject `docs: lock Conversation Room completion plan` · full hash in return report · docs-only staging | Materials dual UX (Board) · CR-1 not started | Open CR-1 — validate and protect existing CR WIP |
| 2026-07-26 | CR-4 end-to-end certification | CR-1A–CR-3 + CR-4R1–R5 protected; CR-4 certified 30/30 rows PASS @ `02657aa`; harnesses + cert record prepared | `docs/launch/CR-4-CONVERSATION-ROOM-CERTIFICATION.md` · three `scripts/cert-*.mjs` harnesses (generated artifacts excluded) | Materials dual UX (Board) · audible Voice quality · real payment gate · 66 unrelated tsc | CR-5 opened after cert evidence protect |
| 2026-07-26 | CR-5 → ARCHIVE-1 boundary | CR-5 audit · CR-5B1 CTA · CR-5B2 decoupling · ARCHIVE-1 boundary (move deferred post–Customer-One) | `c69b669` · `dd8f5a3` · `cd1f631` · `eaf3c239` · docs under `docs/launch/` | Materials dual UX (Board) · audible Voice quality · real payment gate · ARCHIVE-1 execute deferred | MLL truth refresh; then open Customer communication when Tagia authorizes |
| 2026-07-26 | MLL truth refresh | Sync Daily Snapshot / Hierarchies B·C·H to tip `eaf3c239`; correct stale CR-5 / Voice / tip pins | `docs/launch/STUDIO-MASTER-LAUNCH-LIST.md` (this refresh) | Customer communication still MISSING · Auth before Customer-One | Tagia approves refresh commit; do not open Customer communication until authorized |
| 2026-07-28 | MLL-AUTH-1 truth refresh | Hierarchy C #6 + gates #4/#5 → COMPLETE WITH LIMITS @ `e7688ef`; correct stale “No server auth gate” language; preserve Auth limits | `docs/launch/STUDIO-MASTER-LAUNCH-LIST.md` (docs only) | C #7 waits on Tagia · Materials dual UX waiting · Project Claim separate | Protect docs; do not open C #7 engineering |
| 2026-07-28 | MLL-C7-1 design lock | C #7 DESIGN APPROVED / COMPLETE WITH LIMITS · Lobby-background + panels + corrections + handoff · C #8 not opened | `docs/launch/UNIFIED-REVIEW-FINAL-DELIVERY-ROOM-CONTRACT-V1-LOCKED.md` + MLL docs-only | C #8 waits Tagia · Materials waiting · readiness still 4/23 | Local commit → evidence → push approval |
| 2026-07-29 | MLL-C8-CERT-1 truth refresh | C8a `04bd9ba` · C8b `77f6835` · C8-CERT-1 `508bddf` BROWSER-CERTIFIED WITH EXPLICIT LIMITS · gates #9/#10/#11 CWL · readiness still 4/23 | `docs/launch/STUDIO-MASTER-LAUNCH-LIST.md` (docs only) | Remaining C #8 slices not opened · Materials waiting · cert data cleanup pending | Protect docs; choose next narrow room slice separately |
| 2026-07-30 | MLL-C8C-1 truth refresh | C8c `cebe713a` · C8C-CERT-1 `ed5e1d0` BROWSER-CERTIFIED WITH EXPLICIT LIMITS · Scenario E PASS WITH AN EXPLICIT EXECUTION LIMIT · readiness still 4/23 | `docs/launch/STUDIO-MASTER-LAUNCH-LIST.md` (docs only) | Delivery merge · highlighter/compare · Lobby rebuild not opened · Materials waiting · cert data cleanup pending | Protect docs; do not open C8d |
| 2026-07-30 | MLL-C8D-1 truth refresh | C8d `956f4d8` BROWSER-CERTIFIED WITH EXPLICIT LIMITS · 14/14 focused · 56/56 browser · readiness still 4/23 | `docs/launch/STUDIO-MASTER-LAUNCH-LIST.md` (docs only) | Lobby visual continuity · highlighter/compare not opened · Materials waiting · cert data cleanup pending | Protect docs; do not open next C #8 slice |
| 2026-07-31 | MLL-C8E-1 truth refresh | C8e `167979e` BROWSER-CERTIFIED · 31/31 browser · Lobby continuity on `/feedback-studio` · readiness still 4/23 | `docs/launch/STUDIO-MASTER-LAUNCH-LIST.md` (docs only) | highlighter/compare not opened · header-pill overlap in Visual Quality Queue · Materials waiting · cert data cleanup pending | Protect docs; do not open next C #8 slice |
| 2026-07-31 | VQ-C8E-HEADER-1 docs-only disposition | Closed VQ-C8E-HEADER-1 as **NOT REPRODUCED — NO PRODUCT CHANGE JUSTIFIED**; moved out of the active Visual Quality Queue into Closed / Not Reproduced (Hierarchy K); recorded prior live-browser reproduction pass (Review/Final/Delivery × 15 viewports = 45 combinations; no overlap; ~13.6px gap; zero `getBoundingClientRect` intersections); no product files changed; no CSS fix authorized or implemented | `docs/launch/STUDIO-MASTER-LAUNCH-LIST.md` (docs only) · evidence `test-artifacts/vq-c8e-header-1-repro/` (untracked) · protected tip unchanged `17b46bd4` | Readiness stays 4/23 · highlighter/compare not opened · Materials waiting · reopen only with new reproducible evidence naming a specific condition | Await Tagia review; do not stage or commit without approval |
| 2026-07-31 | MLL-ISSUE-ENTRY-1 truth refresh | Hierarchy C #10 (Complaint and issue entry) → **COMPLETE WITH LIMITS** @ `727c831`; Gate #12 (Customer can report an issue) → **COMPLETE WITH LIMITS** (not counted in complete total, #9/#10/#11 pattern); shared composer Ask a question / Report a problem across Board · Review · Final · Delivery; system-receipt only, no human-review/assignment/escalation/deadline claims; statuses Received / Additional information requested / Closed; correction feedback stays distinct; `generate.ts` narrow fix preserves `ownerDecisionInteractions`; no new data model | `docs/launch/STUDIO-MASTER-LAUNCH-LIST.md` (docs only) · sealed evidence: focused Vitest **50/50 PASS** · browser cert **116/116 PASS** · `scripts/smoke-issue-entry-1.mjs` · protected product tip `727c8311` | Readiness stays 4/23 · Refund UI (Gate #13) unresolved · update history (Hierarchy C #12/E7) unresolved · highlighter/compare not opened · Materials waiting | Await Tagia review; do not stage or commit without approval |

---

## 1. Launch Goal

- Tagia is **Customer One**
- Prove The Studio can grow Tagia's business
- Prove deadlines, quality, communication, review, and delivery **before** outside customers

## 2. Launch Gate

> Is this required for Tagia to submit, track, review, resolve issues with, and receive a real project successfully?

If no → **Parking Lot**.

## 3. Timeline

| Phase | Target |
|---|---|
| **August** | Finish customer-facing experience and define Studio Voice |
| **Early September** | Connect production and team |
| **Mid-to-Late September** | Intensive end-to-end testing |
| **Late September / Early October** | Tagia Customer-One trial |
| **Mid-to-Late October** | Controlled external soft opening |

---

# Hierarchy A — Protected and completed foundation

Keep crossed out. Evidence beneath each. Separate packages stay separate.

### Customer entry

- [x] ~~**Studio Lobby**~~ — **COMPLETE WITH LIMITS**
  - Status: Visual V1 **LOCKED** (`docs/studio-lobby-v1-locked.md`)
  - Limits: Lobby WIP dirty locally; migration Lobby↔CR round-trip cert pending; Lobby `sourceHref` uncommitted
  - Launch-ready: **not yet** (integration + dirty WIP + Voice round-trip)
  - Evidence not yet pinned for every Lobby commit; Entry Film commits below

- [x] ~~**Lobby Entry Film + returning-client flow**~~ — **COMPLETE WITH LIMITS**
  - Commit: `4be13de93c5ebb0230ccc39fb035d89aa8a59d29` — `feat: lock Lobby Entry Film and certify auth spine to Studio Board`
  - Commit: `e5902a367fe1d2f48c27ca37950221659a546451` — `fix: keep Lobby Entry Film reopen after dismiss`
  - Certification: live-cert slices referenced in Conversation Room preservation docs (Evidence not fully re-pinned this pass)
  - Limits: Dirty Lobby WIP; timeout reopens film by design
  - Launch-ready: **near** for entry; full journey still open

### Account and auth (Packages 1–4)

- [x] ~~**Sign Up / Account Creation Foundation**~~ — **COMPLETE WITH LIMITS**
  - Auth ledger Package 1: **Cold-certified PASS** (2026-07-19)
  - Limits: Project Claim (Auth Package 5) not started; purchased-room page gates closed under Hierarchy C #6 @ `e7688ef`
  - Launch-ready: **account creation yes**; **Project Claim still open**

- [x] ~~**Email Verification**~~ — **COMPLETE**
  - Auth ledger Package 2: **Cold-certified PASS** + live-delivery PASS 2026-07-19
  - Launch-ready: **yes for verification path**

- [x] ~~**Sign In / Session Hardening**~~ — **COMPLETE WITH LIMITS**
  - Auth ledger Package 3: **Cold-certified PASS** (2026-07-19)
  - Limits: Purchased-room Route/Data Protection **COMPLETE WITH LIMITS** @ `e7688ef`; Project Claim / email hard-before-Board still separate
  - Launch-ready: **sign-in yes**; **purchased-room session gates yes**; **Project Claim no**

- [x] ~~**Password Recovery**~~ — **COMPLETE**
  - Commit: `2d2be73419e66b7d62a8abc8aad1151b990f754d` — `feat(auth): Password Recovery Package 4 PASS`
  - Auth ledger Package 4: **Cold-certified PASS** (2026-07-20)
  - Launch-ready: **yes for recovery path**

- [x] ~~**Password visibility controls**~~ — **COMPLETE WITH LIMITS**
  - Implementation: `src/components/auth/UtilityPasswordField.tsx` (show/hide password)
  - Evidence not yet pinned to a dedicated commit subject
  - No dedicated certification recorded
  - Launch-ready: **built**; treat as present on auth forms

- [x] ~~**Inactivity timeout**~~ — **COMPLETE WITH LIMITS**
  - Commit: `17a7a6b4bb40e5afc796a326528d99be8c2d368b` — `feat(auth): add client inactivity timeout with live countdown`
  - Limits: Timeout files currently dirty WIP; must not absorb into unrelated packages
  - Launch-ready: **function exists**; re-cert after dirty WIP settles

### Conversation Room foundation

- [x] ~~**Conversation Room framework (hardware + controllers)**~~ — **COMPLETE WITH LIMITS**
  - Architecture locked: `docs/studio-conversation-framework-v1-locked.md`
  - Limits: Package 3 visual cert + Tagia commit pending; Package 4 Voice Host **DISCONTINUED**; substantial dirty WIP
  - Launch-ready: **framework yes**; **full customer journey no**

- [x] ~~**Lobby round-trip state preservation (session snapshot)**~~ — **COMPLETE WITH LIMITS**
  - Contract: `studioConversationSession` preserves phase/step; working draft required for answers/services
  - Evidence not yet pinned as a single commit this pass
  - Limits: Session snapshot alone is insufficient for project data
  - Launch-ready: **partial** until cross-room proof closes

- [x] ~~**Voice preference before first speech + Voice On/Off persistence**~~ — **COMPLETE WITH LIMITS**
  - Commit: `b13fe75fc9a77a0f7553dbe0a721075465c63e83` — `feat: gate Conversation Room narration with Voice On/Off`
  - Commit: `0f35fdb29880f0727b5357e31080cec416e494f7` — `fix: persist Studio browser voice selection`
  - Limits: Studio Voice doctrine not yet defined; Host character discontinued
  - Launch-ready: **preference yes**; **Voice doctrine no**

- [x] ~~**Signed-out Intake handoff**~~ — **COMPLETE WITH LIMITS**
  - Commit: `edb3a9eb301ada87565de6cfad9f825bc36add23` — `feat: lock signed-out Intake handoff to Sign In`
  - Launch-ready: **handoff path yes**; Auth P6 still required later

- [x] ~~**Signed-in / dual-path account handoff after Intake**~~ — **COMPLETE WITH LIMITS**
  - Commit: `3e28e17ba54daf5cb486ce1ba5360dbb1d9f1cd4` — `feat: dual-path account handoff after Intake`
  - Launch-ready: **handoff path yes**; Board auth gate still missing

- [x] ~~**Studio Board welcome handoff**~~ — **COMPLETE WITH LIMITS**
  - Protected in branch history with Entry Film / auth spine work (`4be13de` family)
  - Limits: Board customer truth incomplete; no server auth gate
  - Launch-ready: **no**

### Review and Delivery foundation

- [x] ~~**Package 7A — Review & Delivery Stage Truth Contract**~~ — **COMPLETE**
  - Commit: `ea81b7df36073ed16d828c3f2b952a4f8b5613c9` — `feat: add Review & Delivery stage truth contract`
  - Launch-ready: **contract yes**; rooms still separate

- [x] ~~**Package 7B1 — Review Room Stage Shell**~~ — **COMPLETE WITH LIMITS**
  - Commit: `13baf50a668f1db362ee5d723225b5f1fcc911ac` — `feat: add Review Room stage shell`
  - Certification: **44/44** (re-verified during 7B2)
  - Limits: Session proxy gate present under Hierarchy C #6 @ `e7688ef`; C8a/C8b handoff panel work browser-certified with limits @ `508bddf`; C8c correction accounting browser-certified with limits @ `cebe713a` / `ed5e1d0`; C8d unified Delivery state merge browser-certified with limits @ `956f4d8` (see Hierarchy C #8); C8e Lobby visual continuity browser-certified @ `167979e`; highlighter/compare still outside; Voice migration not started; Project Claim still separate
  - Launch-ready: **shell yes**; **purchased-room session gate yes**; **C8a/C8b/C8c/C8d/C8e with limits**

- [x] ~~**Package 7B2 — Legacy Concept Review Customer-Path Retirement**~~ — **COMPLETE**
  - Commit: `5b95e1218d79325a3234c9f5daeb345a5933ad1e` — `fix: retire legacy concept review from customer path`
  - Package cert: **125/125** · 7B1 regression **44/44** · Honest Final Files **67/67** · production build green · pushed · 0/0 at time
  - Deferred: legacy concept components retained (deletion parked)
  - Launch-ready: **retirement yes**

- [x] ~~**Production build type-safety cleanup**~~ — **COMPLETE**
  - Commit: `41d9ffe7f8b3a5998c99d1f33d468bfe4bf8719f` — `fix: restore production build type safety`
  - Launch-ready: **build unblock yes**

- [x] ~~**Honest Final Files**~~ — **COMPLETE WITH LIMITS**
  - Commit: `7d1f9099cca34f85b828fa0990741463b87855b3` — `fix: make final file delivery truthful`
  - Certification: **67/67** production (`next start`)
  - Limits: purchased-room session proxy under Hierarchy C #6 @ `e7688ef`; C8d embeds Honest Final Files inside the unified `/feedback-studio` room and redirects `/deliverables` into Delivery state @ `956f4d8` without changing HFF release-rule authority; Project Claim / email hard-before-Board still separate Auth sequence
  - Launch-ready: **truthfulness yes**; **purchased-room session gate yes**; **embedded in unified room with limits (C8d)**

### Help and process

- [x] ~~**Help Center V1**~~ — **COMPLETE**
  - Locked 2026-07-05 (`docs/help-center-v1-locked.md`)
  - Commit family includes `5e7180a` — `Lock Help Center V1 policies and founder-approved documentation`
  - Do not polish without Tagia
  - Launch-ready: **yes for Help Center page** (CR Help overlay remains scaffold)

- [x] ~~**Studio Launch Working Protocol**~~ — **COMPLETE**
  - Commit: `e68ccbde4f6b08ae77410f2fec5370a41c06cb1b` — `docs: add Studio launch working protocol`

- [x] ~~**Studio Master Launch List (initial)**~~ — **COMPLETE**
  - Commit: `50915da9af39cbfad6cd1cd089649271fb37baf1` — `docs: add Studio master launch list`
  - Note: This control-tower rewrite is a later documentation update (pending protection)

- [x] ~~**Temporary owner Launch Tracker**~~ — **COMPLETE**
  - Commit: `28bc218d0bf0ef294be69eb8ba24c2be88011bcd` — `feat: add temporary owner launch tracker`
  - Certification: **18/18** · Unit tests: **11/11** · Production build: pass · Route: `/file-room/launch-tracker` · owner-only

- [x] ~~**Customer-Facing Room Inventory and Gap Classification**~~ — **COMPLETE**
  - Commit: `65f11c6476b7b618d7950e9b2c44948c5e37f39d` — `docs: lock customer-facing room inventory`
  - Evidence: `docs/launch/CUSTOMER-FACING-ROOM-INVENTORY.md`
  - Owner acceptance: 2026-07-26 · no product code changed · classifications accepted
  - Launch-ready: **documentation complete**

### Also protected (supporting)

- [x] ~~**Seal legacy Host doors into Conversation Room**~~ — **COMPLETE**
  - Commit: `1d86bea47e8af1dd2a45169e9456da7a696fb439` — `fix: seal legacy Host doors into Conversation Room`
- [x] ~~**Soften Conversation Room route recommendation copy for honesty**~~ — **COMPLETE WITH LIMITS**
  - Commit: `fc110ec9d67ef1503fc290fdbcb2666bc885f7ed` — `fix: soften Conversation Room route recommendation copy for honesty`
  - Limits: Recommendation engine still discontinued for launch; remaining keyword/badge surfaces need audit during CR completion

**Completed-item count (foundation list above):** 24 crossed-off packages/surfaces with evidence or explicit limits.

---

# Hierarchy B — Current active item

## Conversation Room Completion — COMPLETE THROUGH ARCHIVE-1 BOUNDARY

**Status:** **COMPLETE WITH LIMITS** — CR-4 certified; CR-5 / CR-5B1 / CR-5B2 / ARCHIVE-1 boundary protected; **archive move deferred until after Customer-One**; no CR construction package currently open
**Current protected tip:** `eaf3c2390d4cb5a2e1775ec29615d1c7c86a3dba`
**Certification record:** `docs/launch/CR-4-CONVERSATION-ROOM-CERTIFICATION.md`
**Certified product tip (CR-4):** `02657aa1edc8e73c6b04d9a7ef843509a50dba3a`
**Plan:** `docs/launch/CONVERSATION-ROOM-COMPLETION-PLAN.md`
**Protected package tips:**

| Package | Tip | Subject (short) |
|---|---|---|
| CR-1A | `d778e7e` | journey-begin recovery helpers |
| CR-1B | `62fa506` | restore Conversation Room journey state |
| CR-1C | `7ad3876` | refine Conversation Room presence |
| CR-2 | `26f136d` | clean Conversation Room misleading wording |
| CR-3 | `fb1ad24` | attribute Intake in working-draft history |
| CR-4R1 | `5c719ab` | guard Conversation Room route draft |
| CR-4R2 | `3f89c80` | align Intake continuity with Conversation Room |
| CR-4R3 | `318d89d` | keep Voice preference controls interactive |
| CR-4R4 | `f0a122c` | keep Session controls clear of activity scrim |
| CR-4R5 | `02657aa` | keep tablet clear of activity scrim |
| CR-4 cert docs | `79ed2ce` | certify Conversation Room end-to-end |
| CR-5 | `c69b669` | audit Conversation Room obsolete paths |
| CR-5B1 | `dd8f5a3` | remove Host wording from Intake CTA |
| CR-5B2 | `cd1f631` | decouple legacy discovery UI |
| ARCHIVE-1 boundary | `eaf3c239` | define legacy discovery UI archive boundary |

**CR-4 certification summary:**

- [x] Production build PASS (sandbox bake-in; clean cert worktree)
- [x] All **30** required certification rows PASS (0 FAIL · 0 BLOCKED)
- [x] Complete signed-in Board handoff PASS
- [x] Complete signed-out Create Account → Studio Board continuation PASS (Row 25; same campaign)
- [x] Desktop 1440 · phone 390 · narrow phone 360 PASS
- [x] Voice On · Voice Off PASS
- [x] Intake attribution PASS
- [x] Lobby return and fresh-start PASS
- [x] No Studio Review customer navigation
- [x] **CR-5** obsolete-path dependency + archive-candidate audit — **COMPLETE** (`c69b669` · `docs/launch/CR-5-OBSOLETE-PATH-DEPENDENCY-AUDIT.md`)
- [x] **CR-5B1** Host Intake CTA truth repair — **COMPLETE** (`dd8f5a3` · `Open Host Project Intake` → `Open Project Intake`; destination unchanged)
- [x] **CR-5B2** discovery dependency repair — **COMPLETE** (`cd1f631` · framework owns presentation payload; ledger corrected; discovery UI present/unwired)
- [x] **ARCHIVE-1 boundary** — **COMPLETE** (`eaf3c239` · Option A · destination `src/archive/studio-conversation-discovery-ui/`)
- [ ] **ARCHIVE-1 execute** — **DEFERRED until after Customer-One** (do not mark the archive move complete)

**Accepted non-blocking deferrals (do not mark complete):**

- Audible Voice quality not certified by `speechSynthesis.speak()` probe
- Materials dual-UX deferred to Studio Board package
- Checkout cancellation unsupported → NOT APPLICABLE
- 66 unrelated repository TypeScript errors outside Conversation Room boundary
- Real integrated payment remains a mandatory external-launch gate
- ARCHIVE-1 physical move deferred until after Customer-One

**Reusable harnesses (committed; regenerate evidence locally):** `scripts/cert-conversation-room-journey.mjs` · `scripts/cert-cr4r-interaction-proof.mjs` · `scripts/cert-cr4r5-tablet-scrim.mjs`
**Generated artifacts:** intentionally not committed.
**Next launch-critical item:** **TEXT-COMMENT-1** — defined · construction **not authorized** (`docs/launch/TEXT-COMMENT-1.md`). Proof-version-bound written comment · no geometry in first slice · PAGE-TABS-1 deferred. Then proof/cert limits · UR-ROOM-CERT-1. Hierarchy C #7 remains **DESIGN APPROVED / COMPLETE WITH LIMITS**. Hierarchy C #8 is **PARTIAL / COMPLETE WITH LIMITS** for C8a `04bd9ba` + C8b `77f6835` + C8-CERT-1 `508bddf` + C8c `cebe713a` + C8C-CERT-1 `ed5e1d0` + C8d `956f4d8` + C8e `167979e` + UPDATE-HISTORY-1 @ `1e1308e` + VERSION-COMPARE-1 @ `b0bd5e5` + HIGHLIGHTER-1 @ `96b6a39` + REVIEW-TEXT-TOOLS-INSPECT-1 **COMPLETE / CLOSED**. C #5 Board @ `48ae3f6` · C #6 Auth @ `e7688ef`. Materials dual UX remains waiting (Board limit).

### ✅ Previous active item — Studio Voice Definition and Customer-Presence Doctrine (complete)

- [x] ~~Voice identity, presence, On/Off, silence, channels, authority, truthfulness, accessibility, presence states, room matrix~~
- [x] ~~V1/V2/V3 answered~~
- [x] ~~No recommendation engine / no Package 4 Host / no product code in doctrine package~~
- [x] ~~Doctrine protected~~ — subject `docs: lock Studio Voice doctrine` · full hash in return report A

Evidence: `docs/launch/STUDIO-VOICE-DEFINITION-AND-CUSTOMER-PRESENCE-DOCTRINE.md` · V1 future account persistence vs current sessionStorage · V2 quiet Board/Review/Delivery · V3 careful sensitive intake · governing principle locked.

---

# Hierarchy C — Immediate launch-critical work (priority order)

1. [x] ~~**Protect Master Launch List control-tower rewrite**~~ — `9e823ca` · 0/0
2. [x] ~~**Studio Voice Definition and Customer-Presence Doctrine**~~ — subject `docs: lock Studio Voice doctrine` · V1/V2/V3 locked · full hash in return report
3. [x] ~~**Conversation Room completion without recommendation engine**~~ — **CR-4 CERTIFIED** @ `02657aa` · 30/30 rows PASS · CR-5 `c69b669` · CR-5B1 `dd8f5a3` · CR-5B2 `cd1f631` · ARCHIVE-1 boundary `eaf3c239` (move deferred post–Customer-One) · non-blocking deferrals listed in Hierarchy B
4. [x] ~~**Customer communication and follow-up access**~~ — **COMPLETE WITH LIMITS** — COMM-2…COMM-5 protected · COMM-CERT-1 `257456c` · `docs/launch/COMMUNICATION-FULL-LOOP-CERTIFICATION.md` · **36/36** focused Vitest · **67/67** full-loop browser · in-product Studio Board + File Room only · campaign-scoped · authenticated ownership · **no** email / SMS / push / browser notifications · **no** attachments · **no** read / delivered / seen receipts · **no** live chat or response-time promises
5. [x] ~~**Studio Board customer truth and completeness**~~ — **COMPLETE WITH LIMITS** — BOARD-TRUTH-1 decision · BOARD-TRUTH-2 `48ae3f6` · `docs/launch/BOARD-TRUTH-2-PROJECT-SNAPSHOT-DELIVERABLES-HONESTY.md` · **10/10** snapshot · **37/37** Board truth regression · desktop ~1440 / phone ~390 · Project Snapshot no longer invents Social Posts / fake completion · Materials dual UX still **waiting** (Intake + Board) · purchased-room page Auth gate closed under Hierarchy C #6 @ `e7688ef` · Review/Final Delivery nav not stage-gated (destinations carry preparing / unavailable / no-files) · Package 7A not wired to Board · COMM remains in-product only under certified limits
6. [x] ~~**Purchased-room Auth Route/Data Protection**~~ — **COMPLETE WITH LIMITS** — AUTH-TRUTH-1 · AUTH-GATE-1 `e7688ef` · `docs/launch/AUTH-GATE-1-PROJECT-RECORD-PAGE-AUTHENTICATION.md` · **8/8** focused Auth Vitest · Board · Project Record · Review · Delivery under purchased-room session proxy · `/campaign-details` safe return allowlisted · truthful Project Record access states · campaign APIs retain session + ownership (401/403) · **Limits:** Project Claim / email hard-before-Board still separate Auth sequence · inactivity timeout remains client-driven · ownership remains API-enforced by design · internal/dev tools (`/studio`, textures, decision-learner) remain outside Customer-One purchased-room spine · do not absorb timeout/sign-out WIP
7. [x] ~~**Unified Review / Final / Delivery design approval**~~ — **DESIGN APPROVED / COMPLETE WITH LIMITS** — `docs/launch/UNIFIED-REVIEW-FINAL-DELIVERY-ROOM-CONTRACT-V1-LOCKED.md` · Lobby persistent environmental background across customer rooms · one room with Review / Final / Delivery as states · work visibly central · labeled **REVIEW TOOLS** + **PROJECT COMMUNICATION** · version-linked finite correction rounds (no silent reset) · clear Studio↔customer submit/receive/return · submitted feedback packages lock as permanent project records · **Limits:** contract approved · C8c now supplies authoritative finite correction-round accounting (included corrections remain finite and version-linked · owner-authorized extras remain separate · see #8) · no fake deliverables/submission/receipt/correction balance · C8e supplies Lobby visual continuity for the unified `/feedback-studio` room @ `167979e` · remaining construction (highlighter / version comparison, subject to launch-gate review) still incomplete · unified-room program not fully closed · C8a/C8b/C8c/C8d/C8e construction completed afterward with explicit limits (see #8)
8. [x] ~~**Unified Review / Final / Delivery construction — C8a + C8b + C8c + C8d + C8e**~~ — **PARTIAL / COMPLETE WITH LIMITS** — C8a `04bd9ba` (`docs/launch/C8A-REVIEW-ROOM-PANEL-CHROME.md`) · C8b `77f6835` (`docs/launch/C8B-REVIEW-HANDOFF-RECEIPTS-LOCKED-SUBMISSIONS.md`) · C8-CERT-1 `508bddf` **BROWSER-CERTIFIED WITH EXPLICIT LIMITS** (`docs/launch/C8-CERT-1-CUSTOMER-ONE-REVIEW-ROOM-BROWSER-CERTIFICATION.md`) · C8c `cebe713a5397dd4b57858892612a45aa4a7fcbba` (`docs/launch/C8C-FINITE-CORRECTION-ROUND-LEDGER.md`) · C8C-CERT-1 `ed5e1d06d87d94e3ea5977fb850222d86b087f41` **BROWSER-CERTIFIED WITH EXPLICIT LIMITS** (`docs/launch/C8C-CERT-1-CUSTOMER-ONE-CORRECTION-ACCOUNTING-BROWSER-CERTIFICATION.md`) · C8d `956f4d88f2bb8edb690427bd1dcd3472b7fcbdb6` — `feat: merge Final and Delivery into unified room` **BROWSER-CERTIFIED WITH EXPLICIT LIMITS** (`scripts/cert-c8d-unified-delivery-state-merge.mjs` · focused unit **14/14 PASS** · browser **56/56 PASS**) · C8e `167979ef08203ad69811309abcfa7e763a7bc076` — `feat: add Lobby continuity to unified delivery room` **BROWSER-CERTIFIED** (`scripts/cert-c8e-lobby-visual-continuity.mjs` · browser **31/31 PASS**) · REVIEW TOOLS + PROJECT COMMUNICATION · Studio submission / authorized receipt / customer reviewing / feedback returned / locked package · finite version-linked correction-round ledger · included allowances remain finite · used corrections do not silently reset · owner-authorized extras recorded separately · original included allowance unchanged when owner extra granted · resulting accounting and UI browser-verified · `/feedback-studio` current canonical unified room · `/deliverables` redirects into Delivery state of that same room · Review / Final / Delivery remain distinct states · Honest Final Files embedded in the unified room · Review `?jobId=` preserved · 7A stage-navigation authority preserved · Honest Final Files released-file and delivery-language authority preserved · no invented files / statuses / completion / version labels · version labels scoped to released files for the focused job · focused-job delivery availability distinguished from other project files · stale/unavailable requested jobId does not silently substitute another named job · Auth · COMM · C8a · C8b · C8c · C8d · correction accounting · locked feedback packages preserved · C8e route-scoped Lobby lounge-plate continuity on `/feedback-studio` (Review / Final / Delivery) without UtilityPageFrame or standards/config drift · **C8C-CERT-1 Scenario E = PASS WITH AN EXPLICIT EXECUTION LIMIT:** owner-authorized extra use was granted · original included allowance stayed unchanged · resulting accounting and UI were browser-verified · formal consumption used the supported API because browser auto-submit was blocked · Scenario E was **not** fully browser-executed · **C8d explicit cert limits:** (1) Interactive MCP login screenshots were not completed. (2) Released-file Delivery verification used route mocks. (3) Locked-package immutability proof covered navigation stability, not a fresh submit-and-lock ceremony. (4) Final version labels appear only when released-file authority supplies them for the focused job. (5) Multi-job Final truth used mocked stages and mocked delivery data, not a live dual-job production campaign. (6) Stale-job proof checked neutral fallback and absence of substitute naming or authorization-oracle wording, not a full cross-tenant fixture-denial UX. · **Other prior cert limits:** C8-CERT-1 voice-note flow not exercised · drawn-stroke inventory depth not certified · C8-CERT-1 approval certified on a separate prepared job · **C8e disclosure:** focused Vitest **95/97** with **2 pre-existing** unrelated owner-qa WIP failures left untouched · **Still outside / not a full unified-room close:** highlighter / version comparison (subject to launch-gate review) · new COMM model · second stage system · Materials / Project Claim / timeout/Auth reopen · do **not** reopen C8a/C8b/C8c/C8d/C8e construction
9. [ ] **Remaining Unified Review construction slices** — **IN SEQUENCE / NOT FULLY OPENED** · HIGHLIGHTER-1 **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `96b6a39` (`proof_markup_board_v1`; not source-proof pixels) · VERSION-COMPARE-1 **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `b0bd5e5` (metadata compare only) · REVIEW-TEXT-TOOLS-INSPECT-1 **COMPLETE / CLOSED** · **TEXT-COMMENT-1** defined · construction **not authorized** (`docs/launch/TEXT-COMMENT-1.md`) · PAGE-TABS-1 **deferred** · then proof-rendering depth + prior cert limits · then **UR-ROOM-CERT-1** · HIGHLIGHTER-COMPARE-INSPECT-1 **COMPLETE / CLOSED** · do **not** reopen C8a/C8b/C8c/C8d/C8e · Lobby visual continuity sealed at C8e `167979e` · Update History sealed at UPDATE-HISTORY-1 `1e1308e`
10. [x] ~~**Complaint and issue entry**~~ — **COMPLETE WITH LIMITS** — ISSUE-ENTRY-1 `727c8311cf90184067d353fcd9f913bc48a597eb` — `feat: add customer problem reporting to project communication` · focused Vitest **50/50 PASS** · browser certification **116/116 PASS** (`scripts/smoke-issue-entry-1.mjs`) · customer choice of **Ask a question** / **Report a problem** in the shared Project Communication composer reused across Studio Board · Review · Final · Delivery · ordinary Project Communication remains available · problem reports use the existing complaint and `OwnerDecisionInteractionRecord` authority, connected to the authorized customer and project/job context · customers receive **system-receipt confirmation only** — no claimed human review, assignment, escalation, investigation, or response deadline · supported customer-visible statuses: **Received** · **Additional information requested** · **Closed** · composer returns to Ask a question after submission · existing communication history remains intact · correction feedback remains distinct · narrow `src/lib/campaign-tasks/generate.ts` correction preserves `ownerDecisionInteractions` for task-less campaign envelopes during read and refresh · no new data model created · **Limits:** no ticketing platform, ticket numbers, departments, agents, priorities, or SLAs; no team assignment/escalation/investigation workflow; Refund UI **not** added by this package (see item 11)
11. [ ] **Refund request entry** — MISSING customer UI (API/intake gate exists; Owner Desk internal) · waits room completion then Payment-room authorization
12. [x] ~~**Customer update history**~~ — **COMPLETE WITH LIMITS** — UPDATE-HISTORY-1 `1e1308e9f0e4c8b5728a605e4c930198fc2d17e6` — `feat: add customer update history to unified review room` · customer-safe projection over persisted `jobActivityEvents` only · Review / Final / Delivery rail · Final/Delivery need `jobId` · COMM / project-activity not merged · browser cert with temporary harness removed · **Limits:** job-scoped · no highlighter/compare · no Refund UI · do not conflate with Gate #12 (issue reporting)
13. [ ] **Cross-room persistence and recovery proof** — PARTIAL (working-draft contract locked; proof bar open)
14. [ ] **Desktop, phone, and 360px certification** — PARTIAL by package; full journey not closed
15. [ ] **Team and production connection** — DEFERRED Early September
16. [ ] **Repeated full-system testing** — DEFERRED Mid-to-Late September
17. [ ] **Tagia Customer-One trial** — DEFERRED Late September / Early October
18. [ ] **Corrections discovered during Customer One** — DEFERRED
19. [ ] **Controlled external soft opening** — DEFERRED Mid-to-Late October

### Auth lock (item 6) — COMPLETE WITH LIMITS @ `e7688ef`

Purchased-room authentication and data protection for Customer-One purchased rooms is **COMPLETE WITH LIMITS** (AUTH-GATE-1).

Protected surfaces: Studio Board · Project Record · Review · Job Review · Final Delivery · Deliverables — session proxy + safe return where applicable; campaign APIs retain ownership checks.

**Explicit limits (do not invent a second Auth page-gate package):**

- Project Claim / email hard-before-Board — separate Auth sequence; not started
- Inactivity timeout — client-driven
- Ownership — API-enforced by design (pages are session gates)
- Internal/dev tools (`/studio` · `/studio-board/textures` · `/decision-learner`) — outside Customer-One purchased-room spine; remain Auth-audit items, not C #6 reopen
- Timeout / sign-out dirty WIP — do not absorb

**Not Parking Lot.** Do not mark C #6 MISSING again without Tagia authority.

---

# Hierarchy D — Discontinued Product Directions

## Live Host / Voice Host — DISCONTINUED

- The Studio will **not** use a live host character
- The Studio will **not** use a mascot standing in customer rooms
- The Studio will **not** build Package 4 Voice Host
- The Studio will **not** create a hovering or constantly present character
- **Studio Voice remains** as the Studio Representative — not a character or mascot
- Studio Voice may use communication waves, indicators, controls, or presence signals
- Studio Voice should orient briefly, remain available, and avoid hovering
- Host terminology, Host Guide routes, Host components, and Host-era flows → legacy / redirect / internal-only / archive candidates
- Do **not** delete Host-era code until Tagia approves a later deletion package

Related protected seal: `1d86bea` — legacy Host doors sealed into Conversation Room.

## Recommendation Engine — DISCONTINUED FOR LAUNCH

- Live launch journey will **not** include a recommendation engine
- The Studio will **not** claim intelligent service recommendations from answers when that system does not exist
- Studio Voice may clarify needs, explain real services, and compare truthful options
- Customer may select, add, remove, or change services
- No recommendation badge, route suggestion, or service suggestion may be presented as “intelligent” if it is only a keyword rule or static mapping
- Existing recommendation-engine code, route badges, keyword maps, concept-picker logic, and experiments → classify live-truthful / internal-only / obsolete / archive candidate / future research
- Do **not** delete during this documentation pass
- Advanced recommendation work remains **PARKED** unless Tagia reopens it

Related honesty commit: `fc110ec` — softened CR route recommendation copy.

## Other superseded directions (supported by locks / inventory)

| Direction | Status | Notes |
|---|---|---|
| Mascot / Host-based Lobby behavior | DISCONTINUED | Lobby locked as guide + podium; Host character standard is art identity, not Live Host product |
| Standalone Route Map journey | OBSOLETE | Redirect → Conversation Room |
| Standalone Project Builder journey | OBSOLETE | Redirect → Conversation Room |
| Standalone Checkout / Payment / Intake journeys | OBSOLETE | Redirect → CR stages |
| Legacy concept picker A/B/C | OBSOLETE | Retired 7B2; components parked |
| Dual CR phase vs stage models | PARTIAL / consolidation debt | Address during CR completion — do not invent a third model |
| Advertising scaffold routes as live | DISALLOWED | Coming-soon decision answered |

---

# Hierarchy E — Legacy Page Archive and Retirement Policy

**Locked rule:** Old pages will **not** be deleted immediately. They will first be removed from the live customer journey and customer navigation, then archived or quarantined until Tagia approves permanent deletion.

| Lifecycle | Meaning |
|---|---|
| **LIVE** | Current customer journey; truthful; approved navigation |
| **REDIRECT** | Old URL kept temporarily; sends customers to the correct live destination; not a separate nav room |
| **INTERNAL-ONLY** | Owner/staff/dev/test/migration; inaccessible to normal customers |
| **SCAFFOLD** | Incomplete; not advertised |
| **ARCHIVE CANDIDATE** | Leave approved journey; later move to archive/quarantine; retain for reference |
| **ARCHIVED** | Physically separated from live route ownership; not exposed as customer route where feasible |
| **DELETE CANDIDATE** | Archived, proven unnecessary, no remaining dependencies — still needs Tagia approval |
| **DELETED** | Only after dedicated inspection, proof, backup/checkpoint, and Tagia approval |

**Hard rules:**

1. **Archive first. Delete only after Tagia explicitly approves deletion.**
2. **Cleanup gate:** Legacy-page archiving occurs only after the replacement live path is verified, tested, and protected.
3. **Deletion gate:** No legacy page or Host/recommendation code is deleted without a separate dependency audit and Tagia approval.
4. **Advertisement gate:** No obsolete or scaffold page may be advertised as a working customer destination.

---

# Hierarchy F — Current Approved Customer Page Count

**Do not** count every React component, overlay, or Conversation Room stage as a separate page. Counts verified 2026-07-26 from `src/app/**/page.tsx` (**53** route files total) + accepted inventory.

### Official page-count lock (Tagia 2026-07-26)

| Milestone | Count | Meaning |
|---|---|---|
| **Current repository reality** | **16** | Current verified live customer-facing routed pages found in the repository |
| **Customer-One target** | **15** | Official approved target for the Customer-One trial — **not** 14 or 13 |
| **Possible intermediate** | **14** | Only if Lobby aliases are consolidated **before** the unified Review/Final/Delivery room. Not the official Customer-One target unless Tagia later changes the launch order and explicitly approves that count |
| **Later unified-room target** | **13** | After Studio Voice definition · Conversation Room completion · customer communication access · Studio Board truth/completeness · Tagia unified-room design approval · unified-room construction and certification. Not the current count and not the immediate Customer-One target |

> **Page-count reductions are architectural milestones, not permission to remove or archive routes before their replacement paths are verified, tested, protected, and approved.**

### Route-list arithmetic (16 → 15 → 14 → 13)

| Step | From → To | Exact change | Supporting routes |
|---|---|---|---|
| Current | **16** | Repository live routed pages | See E1 list below |
| Customer-One | **16 → 15** | `/verify-email/pending` leaves the **approved live-room target** and is counted as a verification **state** of `/verify-email` (same pattern as Job Review under `/feedback-studio`). The route file may remain until a later consolidation; it is not a separate Customer-One journey room | Remove from target count: `/verify-email/pending` · Keep: `/verify-email` |
| Optional intermediate | **15 → 14** | Lobby alias consolidation | `/studio-lobby` → **REDIRECT** to canonical `/` · Keep `/` as Lobby |
| Later unified room | **14 → 13** | Review + Final Delivery become one room | `/feedback-studio` + `/deliverables` → one unified Review/Final/Delivery route · C8d `956f4d8` makes `/feedback-studio` canonical and redirects `/deliverables` into Delivery state; official page-count flip to 13 still awaits Tagia consolidation approval |

**Redirect / compatibility dependencies that prevent immediate consolidation:** `/studio-lobby` bookmarks and Lobby Entry Film links · `/verify-email/pending` email deep links · `/review-room` and other Host/commerce redirects · Auth and delivery certs that assert current URLs · dirty WIP on some redirect shells. Do not collapse until owning packages verify replacements.

### Summary counts (current repository)

| Count type | Number |
|---|---|
| Current verified **live customer-facing routed pages** | **16** |
| Approved **Customer-One** live routed-page target | **15** |
| Possible intermediate (Lobby alias consolidation only) | **14** |
| Expected later target after Review/Final/Delivery consolidation | **13** |
| Current verified **customer-facing states** inside live pages | **16** (includes Final / Delivery room states under C8d `956f4d8`) |
| Current verified **redirect-only legacy routes** | **19** |
| Current verified **customer-facing scaffolds** | **3** |
| Current verified **internal-only routes** | **15** |
| Current verified **archive candidates** (redirect shells first) | **19** |
| **Missing** approved customer-facing pages or surfaces | **5** |

### E1. Live customer-facing routed pages (16)

| Route | Name | Notes |
|---|---|---|
| `/` | Studio Lobby | Canonical entrance |
| `/studio-lobby` | Studio Lobby | Same scene; live alias |
| `/studio-conversation-room` | Conversation Room | Live front door for Discovery→Checkout→Intake |
| `/sign-in` | Sign In | |
| `/sign-up` | Sign Up | |
| `/forgot-password` | Forgot Password | |
| `/reset-password` | Reset Password | |
| `/verify-email` | Verify Email | |
| `/verify-email/pending` | Verify Email Pending | |
| `/account-handoff` | Account Handoff | |
| `/access-denied` | Access Denied | |
| `/studio-board` | Studio Board | **Session proxy gate** (Hierarchy C #6 @ `e7688ef`) |
| `/campaign-details` | Project Record | **Session proxy gate** + safe return (AUTH-GATE-1 @ `e7688ef`) |
| `/feedback-studio` | Unified Review / Final / Delivery room (canonical) | **Session proxy gate** (Hierarchy C #6 @ `e7688ef`); Review default · `?jobId=` = Job Review · `?roomState=final\|delivery` = Final / Delivery states (C8d `956f4d8`) |
| `/deliverables` | Final Delivery (compatibility redirect) | **Session proxy gate** (Hierarchy C #6 @ `e7688ef`); redirects into `/feedback-studio?roomState=delivery` (C8d `956f4d8`) — not a separate live room authority |
| `/help-center` | Help Center | Locked complete |

### E2. Customer-facing states inside live pages (16) — not separate pages

Lobby Entry Film · Returning-client choice · Voice preference · CR opening · CR route · CR services · CR plan · CR checkout · CR intake · CR complete · CR Help overlay · Job Review (`?jobId=`) · Final (`?roomState=final`) · Delivery (`?roomState=delivery`) · Board Materials We Still Need card · Session timeout → Lobby film reopen

### E3. Redirect-only legacy routes (19)

`/route-map` · `/project-builder` · `/checkout` · `/payment` · `/intake` · `/draft-room` · `/draft-room/begin` · `/project-details` · `/project-summary` · `/welcome-hall` · `/studio-tablet` · `/studio-guide` · `/studio-guide-prototype` · `/studio-plan-review` · `/discovery-summary` · `/review-room` → `/feedback-studio` · `/business-discovery-studio` · `/business_discovery_studio` · `/project-discovery`

**Handling:** Remain **REDIRECT** temporarily for bookmarks. Hide from customer navigation. Archive candidates after live path proof. Do not delete now.

### E4. Customer-facing scaffolds (3)

`/account` · `/past-campaigns` · `/creative-room` — JourneyComingSoon; must not be advertised as available.

### E5. Internal-only routes (15)

| Route | Gate today |
|---|---|
| `/file-room` (+ 7 child pages including launch-tracker, owner-console, studio-self-test, campaign workspaces) | Staff/owner (Launch Tracker owner-only) |
| `/studio-kitchen` · `/studio-kitchen/[campaignId]` | Staff/owner |
| `/dev/studio-voice` · `/dev/voice-audition` | Dev `notFound()` outside development |
| `/studio` · `/studio-board/textures` · `/decision-learner` | **Ungated — must enter Auth audit** |

### E6. Archive candidates (19+)

Primary: the **19 redirect-only** Host/commerce shells. Later: Host-era components, recommendation-era experiments, retired concept-picker UI (already customer-unreachable after 7B2). Physical archive = future approved package only.

### E7. Missing approved customer-facing surfaces (3)

1. Refund request entry (customer UI)
2. Customer update history (dedicated truthful surface)
3. Unified Review / Final / Delivery room (after design approval)

Customer communication / follow-up access is **no longer missing** — **COMPLETE WITH LIMITS** as in-product Studio Board + File Room panels (`257456c`). Complaint / issue entry is **no longer missing** — **COMPLETE WITH LIMITS** as the Ask a question / Report a problem choice in the shared Project Communication composer (ISSUE-ENTRY-1 `727c831`). Final form for the remaining three may be **page or panel** — not decided. Do not inflate page count until Tagia approves form.

### E8. Official Customer-One live routed-page target: 15

**Official Customer-One target = 15.** Do not present 14 or 13 as competing Customer-One targets.

Approved Customer-One live destinations (**15** = current 16 minus `/verify-email/pending` as a separate journey room):

1. `/` — Studio Lobby (canonical)
2. `/studio-lobby` — Studio Lobby (live alias; optional later collapse to redirect)
3. `/studio-conversation-room` — Conversation Room
4. `/sign-in`
5. `/sign-up`
6. `/forgot-password`
7. `/reset-password`
8. `/verify-email` — Verify Email (`/verify-email/pending` counted as a **state**, not a 16th/separate target room)
9. `/account-handoff`
10. `/access-denied`
11. `/studio-board`
12. `/campaign-details` — Project Record
13. `/feedback-studio` — Unified Review / Final / Delivery room (canonical; C8d `956f4d8`)
14. `/deliverables` — Final Delivery compatibility redirect into Delivery state (C8d `956f4d8`; official page-count consolidation to 13 still a later milestone)
15. `/help-center`

**Arithmetic check:**

| Step | Count | Change |
|---|---|---|
| Current repository | **16** | E1 list |
| Customer-One target | **15** | Drop `/verify-email/pending` from approved live-room target (remains allowable as verify state / deep link until later consolidation) |
| Optional intermediate | **14** | `/studio-lobby` → REDIRECT to `/` |
| Later unified room | **13** | `/feedback-studio` + `/deliverables` → one unified room · C8d route merge construction protected @ `956f4d8`; official count flip still awaits Tagia consolidation approval |

If unified-room construction happens **before** Lobby alias collapse: 15 − 1 = **14**, then Lobby collapse → **13**. Order may vary; official Customer-One remains **15**.

Complaint/refund/communication/update history: prefer panels inside Board/Review/Help unless Tagia requires dedicated routes.

### Consolidation principle

- Conversation Room contains Discovery, Route clarification, Services, Plan, Checkout, and Intake as **states in one live room**
- Standalone Route Map, Project Builder, Checkout, Payment, and Intake are **not** separate live rooms
- Review, Final, and Delivery become **one unified room** only after Tagia approves design
- Help overlays and Voice-preference states are **not** separate physical rooms
- Complaint, refund, and communication may be panels or pages — form not yet approved

---

# Hierarchy G — Partial / scaffold / missing (launch-critical)

| Item | Status | Notes |
|---|---|---|
| Conversation Room commerce journey | COMPLETE WITH LIMITS | CR-4 certified Lobby→Board via CR (`79ed2ce`); Voice Host discontinued; no fake engine; ARCHIVE-1 move deferred; Auth / real payment remain launch limits |
| Secure Checkout (CR stage) | PARTIAL | Local campaign bridge; not production processor cert |
| Production Intake / Materials (CR) | PARTIAL | Dual location with Board |
| Studio Board truth | COMPLETE WITH LIMITS | BOARD-TRUTH-2 `48ae3f6` · Materials dual UX waiting · purchased-room Auth = C #6 @ `e7688ef` · 7A not on Board |
| Project Record | PARTIAL / COMPLETE WITH LIMITS | AUTH-GATE-1 session gate @ `e7688ef`; stage truth not fully wired |
| Review + Job Review | PARTIAL / COMPLETE WITH LIMITS | 7B1/7B2 · Auth @ `e7688ef` · C8a `04bd9ba` · C8b `77f6835` · C8-CERT-1 `508bddf` · C8c `cebe713a` · C8C-CERT-1 `ed5e1d0` · C8d `956f4d8` · C8e `167979e` BROWSER-CERTIFIED · highlighter/compare still open |
| Final Delivery | PARTIAL / COMPLETE WITH LIMITS | HFF 67/67 · session proxy gate @ `e7688ef` · C8d embeds Delivery in `/feedback-studio` and redirects `/deliverables` @ `956f4d8` · C8e Lobby continuity @ `167979e` |
| Working draft cross-room proof | PARTIAL | Contract locked; Master List proof bar open |
| CR Help overlay | SCAFFOLD | Links to Help Center |
| Account / Past Campaigns / Creative Room | SCAFFOLD | Not advertised |
| Customer communication | COMPLETE WITH LIMITS | COMM-CERT-1 `257456c` · Board + File Room · no external notification |
| Complaint entry | COMPLETE WITH LIMITS | ISSUE-ENTRY-1 `727c831` · Ask a question / Report a problem in shared Project Communication composer (Board/Review/Final/Delivery) · system-receipt only · Received / Additional information requested / Closed · no ticketing platform |
| Refund entry UI | MISSING | Backend/Owner exist |
| Update history | MISSING | |
| Unified Review/Final/Delivery | DESIGN APPROVED (C #7) · construction **PARTIAL / COMPLETE WITH LIMITS** (C8a/C8b/C8c/C8d/C8e) | Contract locked · C8a `04bd9ba` · C8b `77f6835` · C8-CERT-1 `508bddf` · C8c `cebe713a` · C8C-CERT-1 `ed5e1d0` · C8d `956f4d8` · C8e `167979e` · highlighter/compare not opened |
| Auth Route/Data Protection (purchased rooms) | COMPLETE WITH LIMITS | AUTH-GATE-1 `e7688ef` · **8/8** · Board · Project Record · Review · Delivery |
| Auth Project Claim | MISSING / not started | Separate Auth sequence · email hard-before-Board · do not absorb into C #6 |

---

# Hierarchy H — Customer-One Readiness Gate

Must be fully satisfied before Tagia begins the Customer-One trial.

| # | Gate | Status |
|---|---|---|
| 1 | Customer journey works from Lobby to final delivery | **PARTIAL** — CR-4 certifies Lobby → Conversation Room → Board handoff @ `02657aa` / `79ed2ce`; Review / Final Delivery / full purchased journey not closed by CR-4 |
| 2 | No false service promises | PARTIAL |
| 3 | No recommendation engine pretending to be intelligent | **PARTIAL** — direction **DISCONTINUED** (Tagia 2026-07-26); CR-5 residual audit complete (`c69b669`); ARCHIVE-1 boundary parks discovery UI move until after Customer-One (`eaf3c239`); engine archive remains post–Customer-One |
| 4 | Purchased routes are protected | **COMPLETE WITH LIMITS** — AUTH-GATE-1 `e7688ef` · `docs/launch/AUTH-GATE-1-PROJECT-RECORD-PAGE-AUTHENTICATION.md` · **8/8** focused Auth · Board · Project Record · Review · Delivery under session proxy · Project Claim / email hard-before-Board still separate · internal/dev tools outside spine |
| 5 | Project data is protected | **COMPLETE WITH LIMITS** — campaign APIs session + ownership (401/403) · wrong-customer proof under AUTH-GATE-1 · ownership remains API-enforced by design · Project Claim still separate |
| 6 | Progress survives navigation and return | **PARTIAL** — CR-4 Lobby return + fresh-start PASS (`79ed2ce`); full cross-room proof bar still open |
| 7 | Customer can communicate with The Studio | **COMPLETE WITH LIMITS** — COMM-CERT-1 `257456c` · `docs/launch/COMMUNICATION-FULL-LOOP-CERTIFICATION.md` · in-product Studio Board + File Room · campaign-scoped · authenticated ownership · **no** email / SMS / push / browser notifications · **no** attachments · **no** read / delivered / seen · **no** live chat or response-time promises |
| 8 | Customer can see what is needed | PARTIAL |
| 9 | Customer can review work | **COMPLETE WITH LIMITS** — C8a `04bd9ba` · C8b `77f6835` · C8-CERT-1 `508bddf` · C8c `cebe713a` · C8C-CERT-1 `ed5e1d0` · C8d `956f4d8` · C8e `167979e` · `docs/launch/C8-CERT-1-CUSTOMER-ONE-REVIEW-ROOM-BROWSER-CERTIFICATION.md` · `docs/launch/C8C-CERT-1-CUSTOMER-ONE-CORRECTION-ACCOUNTING-BROWSER-CERTIFICATION.md` · `scripts/cert-c8d-unified-delivery-state-merge.mjs` · `scripts/cert-c8e-lobby-visual-continuity.mjs` · authorized Job Review · Studio submission receipt · customer receipt · customer reviewing · finite correction accounting visible · Final / Delivery states in same `/feedback-studio` room · Lobby lounge-plate continuity on the unified room · desktop ~1440 / phone ~390 · **Limits:** C8-CERT-1 voice-note flow not exercised · drawn-stroke inventory depth not certified · C8d six explicit browser-cert limits (mocked Delivery / no MCP login screenshots / navigation-only locked-package proof / focused-job version labels / mocked multi-job Final / stale-job neutral fallback) · highlighter/compare still open |
| 10 | Customer can request revisions | **COMPLETE WITH LIMITS** — C8b + C8-CERT-1 Scenario D · C8c `cebe713a` · C8C-CERT-1 `ed5e1d0` · pre-submit summary · `request_revision` · locked feedback package · double-submit blocked · PROJECT COMMUNICATION remains usable after lock · finite version-linked correction ledger · included allowance does not silently reset · exhausted gate + truthful wording · owner-authorized extras recorded separately · **C8C-CERT-1 Scenario E = PASS WITH AN EXPLICIT EXECUTION LIMIT:** owner extra granted · included allowance unchanged · resulting accounting/UI browser-verified · formal consumption used the supported API because browser auto-submit was blocked · not fully browser-executed · **Other limits:** C8-CERT-1 voice/draw depth as above |
| 11 | Customer can approve | **COMPLETE WITH LIMITS** — C8b + C8-CERT-1 Scenario E (approval path) · `approve_for_delivery` · locked approval receipt · repeat blocked · **Limit:** approval certified on a separate prepared job (Scenario D package not mutated) · *(Do not confuse with C8C-CERT-1 Scenario E = owner-extra accounting limit)* |
| 12 | Customer can report an issue | **COMPLETE WITH LIMITS** — ISSUE-ENTRY-1 `727c8311cf90184067d353fcd9f913bc48a597eb` — `feat: add customer problem reporting to project communication` · focused Vitest **50/50 PASS** · browser certification **116/116 PASS** (`scripts/smoke-issue-entry-1.mjs`) · Ask a question / Report a problem choice in the shared Project Communication composer across Board · Review · Final · Delivery · problem reports use existing complaint + `OwnerDecisionInteractionRecord` authority, tied to authorized customer and project/job context · **Limits:** system-receipt confirmation only — no human-review/assignment/escalation/investigation/response-deadline claim; customer-visible statuses limited to Received / Additional information requested / Closed; no ticketing platform, ticket numbers, departments, agents, priorities, or SLAs; not counted toward the numbered complete total (#9/#10/#11 pattern) |
| 13 | Customer can request a refund | **MISSING** UI |
| 14 | Deadlines and risks are visible | PARTIAL / Evidence not yet pinned |
| 15 | Team ownership is visible internally | DEFERRED (team phase) |
| 16 | Final files are truthful | **COMPLETE** (HFF 67/67) — purchased-room access gate closed under #4 @ `e7688ef` · C8d embeds Honest Final Files in the unified room @ `956f4d8` without changing HFF release-rule authority |
| 17 | Mobile and desktop are certified | **PARTIAL** — CR journey certified desktop 1440 / phone 390 / narrow 360 (`79ed2ce`); full-system mobile/desktop cert not closed |
| 18 | Voice behavior is defined and implemented where required | **COMPLETE WITH LIMITS** — Voice = Studio Representative communication system; no Host; Lobby silent; CR asks preference before first speech; Voice On/Off certified in CR-4 (`79ed2ce`); doctrine protected (`docs/launch/STUDIO-VOICE-DEFINITION-AND-CUSTOMER-PRESENCE-DOCTRINE.md`); **audible Voice quality remains non-blocking deferred** (not certified) |
| 19 | Voice Off works without punishment or broken flow | **COMPLETE WITH LIMITS** — CR-4 Voice Off PASS (`79ed2ce`); account-level preference persistence still future construction (V1) |
| 20 | Help remains available | **COMPLETE** |
| 21 | No unfinished route is advertised as complete | PARTIAL (decision answered; audit remains) |
| 22 | Production build passes | **COMPLETE** (verified during Launch Tracker / recent packages; CR-4 production build PASS) |
| 23 | Full E2E testing passes | **MISSING** — CR-4 closes Conversation Room E2E only, not full Customer-One E2E |

**Customer-One readiness: 4 of 23 gates complete** (#16, #18, #20, #22). Gates **#4**, **#5**, **#7**, **#9**, **#10**, **#11**, **#12**, and **#19** are COMPLETE WITH LIMITS and not counted in the complete total. Hierarchy C #5 Board @ `48ae3f6`, C #6 Auth @ `e7688ef`, C #7 unified-room **design**, C #8 **C8a/C8b/C8c/C8d/C8e** slices (C8-CERT-1 @ `508bddf` · C8c @ `cebe713a` · C8C-CERT-1 @ `ed5e1d0` · C8d @ `956f4d8` · C8e @ `167979e` BROWSER-CERTIFIED), and C #10 **ISSUE-ENTRY-1** @ `727c831` (`feat: add customer problem reporting to project communication` · Vitest 50/50 · browser cert 116/116) are COMPLETE WITH LIMITS / PARTIAL WITH LIMITS — numbered readiness-gate complete total stays **4 of 23** because these gates carry explicit, accepted scope limits (system-receipt only, no team workflow, no ticketing, no full unified-room close, etc.) rather than a fully closed launch-ready workflow, consistent with the existing #9/#10/#11 COMPLETE WITH LIMITS pattern; C8e does not by itself complete the entire unified-room program; remaining C #8 slice (highlighter / version comparison, subject to launch-gate review) remains outside; Gate #13 (refund) and the update-history surface (Hierarchy C #12) remain unresolved.

---

# Hierarchy I — External Soft-Opening Gate

May follow Customer One; must precede outside customers.

- [ ] Customer-One defects resolved
- [ ] **Real, integrated, tested, and certified payment path in place** (CR-D3, 2026-07-26) — sandbox checkout is approved **for Customer-One only** and must not silently carry into external launch
- [ ] Repeated clean E2E runs
- [ ] External account isolation verified
- [ ] Customer data separation verified
- [ ] Team workflow proven
- [ ] Update and escalation workflow proven
- [ ] Refund and complaint handling proven
- [ ] Support ownership defined
- [ ] Deadline-risk handling proven
- [ ] Production monitoring adequate for launch
- [ ] Backup and recovery expectations documented
- [ ] Launch copy literally truthful
- [ ] Visual Quality Queue blockers resolved
- [ ] All “Before External Soft Opening” items resolved

**Soft-opening readiness: 0 of 15 gates complete.**

---

# Hierarchy J — Testing and Certification Ledger

| Surface / package | Command / artifact (where known) | Result | Date | Commit | Rerun after later integration? |
|---|---|---|---|---|---|
| Honest Final Files (production) | `scripts/cert-honest-final-files.mjs` · `test-artifacts/honest-final-files-production/` | **67/67** | 2026-07-25 | `7d1f909` | Yes if delivery/auth changes |
| Package 7B2 concept retirement | `scripts/cert-legacy-concept-retirement-7b2.mjs` | **125/125** | with `5b95e12` | `5b95e12` | Yes if Review Room changes |
| Package 7B1 Review shell | `scripts/cert-review-delivery-room-shell.mjs` | **44/44** (re-verified in 7B2) | with 7B2 | `13baf50` | Yes if shell changes |
| Launch Tracker | `scripts/cert-launch-tracker.mjs` | **18/18** | 2026-07-26 | `28bc218` | Yes if auth/nav changes |
| Launch Tracker unit | `vitest` `src/lib/launch-tracker/launch-tracker.test.ts` | **11/11** | 2026-07-26 | `28bc218` | Yes if renderer changes |
| Auth Packages 1–4 | Auth evidence ledger | Cold PASS | 2026-07-19/20 | Package commits + `2d2be73` | Yes after P5–P6 |
| Production build | `npm run build` | pass | Launch Tracker / inventory era | tip family | Always before protect of product packages |
| Conversation Room Package 3 visual | — | **Superseded for launch control** by CR-4 end-to-end cert (Package 3 visual cert was never a separate closed record) | — | — | Historical gap; do not reopen as CR rewrite |
| Conversation Room CR-4 E2E | `docs/launch/CR-4-CONVERSATION-ROOM-CERTIFICATION.md` · three `scripts/cert-*.mjs` | **30/30 PASS** | 2026-07-26 | product `02657aa` · docs `79ed2ce` | Rerun if CR journey changes |
| Full Customer-One E2E | — | **Not started** | — | — | Required before trial |
| Purchased-room access control | — | **Not started** | — | — | Required before Customer-One |
| ISSUE-ENTRY-1 customer problem reporting | `scripts/smoke-issue-entry-1.mjs` | Focused Vitest **50/50 PASS** · Browser certification **116/116 PASS** | 2026-07-31 | `727c831` | Yes if Project Communication composer changes |

**Rule:** A prior package test does not automatically certify later integrated behavior.

---

# Hierarchy K — Visual Quality Queue

| Level | Entries |
|---|---|
| Blockers | No visual issues entered yet |
| Before Customer-One Trial | No visual issues entered yet |
| Before External Soft Opening | No visual issues entered yet |
| Post-Launch Polish | No visual issues entered yet |
| Quality | No open visual issues entered — see Closed / Not Reproduced below |
| Closed / Not Reproduced | **VQ-C8E-HEADER-1** — Unified Review / Final / Delivery room (`/feedback-studio`) · Final / Delivery header band · desktop/tablet widths · originally reported as a possible pre-existing header navigation-pill / subtitle overlap. Static inspection identified possible breakpoint fragility involving utility header styles; static suspicion alone was **not** accepted as evidence for a product change. A dedicated live-browser reproduction pass was completed: Review, Final, and Delivery tested across **15 viewports each** — **45** total tested combinations. **No overlap was reproduced.** The navigation pill and subtitle maintained an approximately **13.6px** gap; `getBoundingClientRect` evidence found **zero intersections**. **Disposition: NOT REPRODUCED — NO PRODUCT CHANGE JUSTIFIED.** No product files were changed; no CSS fix was authorized or implemented. Protected product tip remains `17b46bd4997b6e87c5a5d2c0762cc1d273bc169c`. Evidence remains untracked at `test-artifacts/vq-c8e-header-1-repro/`. **Reopen condition:** may be reopened only if new reproducible evidence identifies a specific condition — browser and version, operating system, viewport, browser zoom, operating-system text scaling, fixture or job state, font-loading condition, or screenshot/recording. Closed 2026-07-31 |

Tagia may add issues anytime. Each entry needs: surface · device · problem · priority · usability vs polish · owner decision · status. Scout must not invent fonts/colors/backgrounds without approval.

---

# Hierarchy L — Obsolete and duplicate paths

| Path / pattern | Classification | Handling |
|---|---|---|
| Standalone Route Map | OBSOLETE REDIRECT | Keep redirect; hide from nav; archive later |
| Standalone Project Builder | OBSOLETE REDIRECT | Same |
| Standalone Checkout / Payment | OBSOLETE REDIRECT | Same → CR `?stage=checkout` |
| Standalone Intake / draft-room / project-details | OBSOLETE REDIRECT | Same → CR `?stage=intake` |
| Host Guide URLs | OBSOLETE REDIRECT | Same; Host direction discontinued |
| Retired concept picker | OBSOLETE (customer-unreachable) | Components parked; delete only with Tagia approval |
| Duplicate Materials locations | PARTIAL duplication | Decision waiting — Board limit (not next engineering package) |
| Dual CR phase/stage models | Consolidation debt | Address in CR completion |

---

# Hierarchy M — Team, testing phases, Owner Console

### Team and production — DEFERRED (Early September)

Roles · permissions · assignment · ownership · deadlines · internal review · customer review handoff · revisions · release authority · machine action tracking · Studio Voice coordination · escalation · deadline risk

### Intensive testing — DEFERRED (Mid-to-Late September)

Signed in/out · Voice On/Off · Desktop/phone/360 · missing materials · multiple jobs · revisions · approvals · partial/final delivery · complaint · refund · machine failure · team delay · interrupted session · returning customer · bad job link · deadline risk

### Customer-One trial — DEFERRED (Late September / Early October)

Real Tagia project · deadline · team · production · updates · review · revisions · delivery · issue handling

### Owner Console — DEFERRED

Deferred until customer rooms complete · Studio Voice defined · team/production connected · testing complete · Customer-One reveals actual needs. Temporary Launch Tracker is **not** the Owner Console.

---

# Hierarchy N — Parking Lot

- Advanced recommendation engine (also **DISCONTINUED FOR LAUNCH**)
- Legacy concept component deletion
- Broad CSS cleanup
- Non-launch automation
- Optional dashboard features
- Advanced Owner Console features
- Route consolidation not required for launch
- Account / Past Campaigns / Creative Room builds
- Unrelated visual polish
- Package 4 Voice Host / Live Host character (**DISCONTINUED** — not merely parked)

---

# Hierarchy O — Dirty WIP Protection

Do **not** clean, restore, stage, commit, absorb, or rewrite without an approved package boundary:

- Conversation Room WIP
- Lobby WIP + untracked `MobileStudioEntry`
- Owner QA WIP
- Auth timeout WIP
- Migration ledger + Lobby `sourceHref` (`/studio-lobby?lobbyEntry=reset`)
- Package files
- Test artifacts
- All other pre-existing modifications

---

## Dependencies quick view (active + near-term)

| Item | Prerequisites | Blocked by | Unlocks | Decision? |
|---|---|---|---|---|
| Voice definition | Inventory complete | — | CR completion | **COMPLETE** (doctrine protected; audible quality deferred) |
| CR completion | Voice definition | — | Comms, Board truth inputs | **COMPLETE WITH LIMITS** through ARCHIVE-1 boundary @ `eaf3c239` |
| Customer communication | Voice + CR complete | — | Customer-One gate #7 (**COMPLETE WITH LIMITS** @ `257456c`) | In-product Board + File Room · external channels deferred |
| Board truth | CR + materials decision | — | Customer-One gate support · Auth timing | **COMPLETE WITH LIMITS** @ `48ae3f6` · Materials dual UX waiting (limit) |
| Auth Route/Data Protection | Board truth (default) | — | Customer-One purchased-room gates | **COMPLETE WITH LIMITS** @ `e7688ef` · Project Claim separate |
| Unified room design | Voice, CR, comms, Board, Auth C #6 | — | Construction (C #8) | **C #7 DESIGN APPROVED / COMPLETE WITH LIMITS** · contract locked |
| Unified room construction (C #8) | C #7 design approval | Remaining highlighter/compare slice waits Tagia package auth | Customer Review/Final/Delivery in one Lobby-continuous room | **PARTIAL / COMPLETE WITH LIMITS** — C8a `04bd9ba` · C8b `77f6835` · C8-CERT-1 `508bddf` · C8c `cebe713a` · C8C-CERT-1 `ed5e1d0` · C8d `956f4d8` · C8e `167979e` BROWSER-CERTIFIED · highlighter/compare **not opened** |
| ARCHIVE-1 execute | After Customer-One (default) | Early-start only if build/security/truth/dependency obstructs | Clean archive of discovery UI | Option A locked · move **not** started |
| Complaint / issue entry (Hierarchy C #10) | Project Communication (COMM-CERT-1 `257456c`) | — | Customer-One gate #12 | **COMPLETE WITH LIMITS** @ `727c831` — ISSUE-ENTRY-1; system-receipt only; refund/update-history not included |

---

**Document status:** MLL-ISSUE-ENTRY-1 truth refresh (2026-07-31) · documentation only · **no product code** · ISSUE-ENTRY-1 `727c8311cf90184067d353fcd9f913bc48a597eb` — `feat: add customer problem reporting to project communication` = Customer Problem Reporting **SEALED**: focused Vitest **50/50 PASS** · browser certification **116/116 PASS** (`scripts/smoke-issue-entry-1.mjs`) · Ask a question / Report a problem choice in the shared Project Communication composer across Studio Board · Review · Final · Delivery · ordinary Project Communication remains available · problem reports use existing complaint + `OwnerDecisionInteractionRecord` authority tied to authorized customer and project/job context · system-receipt confirmation only (no human-review/assignment/escalation/investigation/response-deadline claim) · customer-visible statuses Received / Additional information requested / Closed · composer returns to Ask a question after submission · existing communication history intact · correction feedback remains distinct · narrow `generate.ts` correction preserves `ownerDecisionInteractions` for task-less campaign envelopes during read and refresh · no new data model · Hierarchy C #10 → **COMPLETE WITH LIMITS** · Gate #12 → **COMPLETE WITH LIMITS** (not counted toward numbered complete total, #9/#10/#11 pattern) · **Refund UI (Gate #13) not added · update history (Hierarchy C #12/E7) unresolved · highlighter/version comparison (remaining C #8 slice) unresolved** · no ticketing platform, ticket numbers, departments, agents, priorities, or SLAs added · prior checkpoint preserved: MLL-C8E-1 (2026-07-31) · VQ-C8E-HEADER-1 docs-only disposition (2026-07-31) · C8e `167979ef08203ad69811309abcfa7e763a7bc076` Lobby Visual Continuity **BROWSER-CERTIFIED** (31/31) · C8d `956f4d8` · C8c `cebe713a` · C8C-CERT-1 `ed5e1d0` · C8a `04bd9ba` · C8b `77f6835` · C8-CERT-1 `508bddf` · Hierarchy C #8 remains **PARTIAL / COMPLETE WITH LIMITS** (not a full unified-room close) · readiness math remains **4 of 23** complete · artifacts and local certification data remain untracked · Materials dual UX still waiting · no next construction package opened.
