# Customer-Facing Room Inventory and Gap Classification

**Package:** Customer-Facing Room Inventory and Gap Classification  
**Mode:** Inspection and classification only — no product construction  
**Opened:** 2026-07-26  
**Status: COMPLETE — accepted by Tagia 2026-07-26**  
**Protected tip at open:** `28bc218d0bf0ef294be69eb8ba24c2be88011bcd`  
**Branch:** `fix/discovery-responsive-layout` · sync 0 ahead / 0 behind  
**Next active item:** Studio Voice Definition and Customer-Presence Doctrine  

---

## Owner acceptance (2026-07-26)

Tagia accepts these classifications and the recommended completion order.

**Accepted headline:**

- The live customer front door is the **Conversation Room**.
- Standalone Route Map, Project Builder, Checkout, Payment, Intake, and Host Guide routes are **obsolete redirects**, not separate launch rooms.
- **Lobby and Help Center are locked complete.**
- **Review and Final Delivery are certified but remain separate rooms.**
- Complaint/refund entry, two-way customer communication, update history, unified Review/Final/Delivery, and purchased-room route/data protection remain launch work.

### LOCKED launch requirement — purchased-room protection

> Hey Tagia, Scout and I found something we need to fix before moving on.

**Purchased-room authentication and data protection must be completed and certified before Tagia begins the Customer-One trial.**

**Clarification of "before moving on":** this means before the **Customer-One trial** and before exposing purchased rooms to real customers — **not** before the approved Studio Voice documentation package. Studio Voice definition proceeds now.

Affected surfaces: Studio Board · Project Record · Review · Job Review · Final Delivery / Deliverables · any route exposing purchased-project data · ungated internal tooling routes.

This is a required launch-order insertion. It **must not** move to the Parking Lot and **cannot** slip beyond Customer-One.

**Authority companions:**

- [`STUDIO-LAUNCH-WORKING-PROTOCOL.md`](./STUDIO-LAUNCH-WORKING-PROTOCOL.md)
- [`STUDIO-MASTER-LAUNCH-LIST.md`](./STUDIO-MASTER-LAUNCH-LIST.md) — overall source of truth
- Temporary owner view: `/file-room/launch-tracker`

**Launch gate (every surface):**  
Is this required for Tagia to submit, track, review, resolve issues with, and receive a real project successfully?  
If no → Parking Lot.

**Product locks respected:** Tagia is Customer One · no recommendation engine at launch · Studio Voice defined before Voice-affecting construction · unified Review/Final/Delivery room needs Tagia approval before physical construction · important Chat guidance recorded in the Communication Notebook.

**Dirty WIP:** Substantial unrelated WIP exists (Conversation Room, Lobby, Owner QA, auth timeout, migration ledger, Lobby `sourceHref`, package files, artifacts). This inventory did **not** clean, restore, stage, commit, absorb, or rewrite any of it.

---

## Status legend

| Status | Meaning |
|---|---|
| **complete** | Locked or fully protected for V1 launch purpose; remaining polish is not required to use the surface |
| **partial** | Customer-reachable and partly truthful; gaps remain before Customer-One |
| **scaffold** | Shell or placeholder exists; not a finished customer path |
| **missing** | Launch-critical need with no customer UI |
| **obsolete** | Former customer path; redirects or retired; keep for bookmarks only |
| **internal-only** | Staff/owner/dev — not a customer launch room |

Desktop / phone / 360 columns use: **pass** · **partial** · **unknown** · **n/a** based on available certification evidence (not a new cert run during this inventory).

Voice role uses: **defined** · **partial** · **must-define-before-construction** · **not-required**

---

## A. Complete customer-facing surface list

Surfaces are listed as the customer experiences them. Many legacy URLs are not separate rooms — they redirect into the Conversation Room.

### Live customer rooms and states

1. Studio Lobby (`/` · `/studio-lobby`)
2. Lobby Entry Film + returning-client choice (Lobby state)
3. Sign In (`/sign-in`)
4. Sign Up (`/sign-up`)
5. Forgot Password (`/forgot-password`)
6. Reset Password (`/reset-password`)
7. Verify Email (`/verify-email` · `/verify-email/pending`)
8. Account Handoff (`/account-handoff`)
9. Access Denied (`/access-denied`)
10. Studio Conversation Room (`/studio-conversation-room`) — live front door for Discovery → Route → Services → Plan → Checkout → Intake → Complete
11. Voice preference state (Conversation Room)
12. Conversation Help overlay (Conversation Room)
13. Secure Checkout stage (`?stage=checkout` inside Conversation Room)
14. Production Intake / Materials we still need stage (`?stage=intake` inside Conversation Room)
15. Studio Board (`/studio-board`)
16. Materials We Still Need card (Studio Board)
17. Project Record (`/campaign-details`)
18. Review Room shell (`/feedback-studio`)
19. Job Review workspace (`/feedback-studio?jobId=`)
20. Final Delivery (`/deliverables`)
21. Help Center (`/help-center`)
22. Session timeout → Lobby film reopen (cross-cutting)
23. Customer sign-out → Lobby (cross-cutting)
24. Working draft / progress preservation (cross-cutting)

### Obsolete / redirect shells (customer bookmarks)

25. `/route-map`, `/project-builder`, `/checkout`, `/payment`, `/intake`, `/draft-room`, `/project-details`, `/project-summary`, `/studio-tablet`, `/studio-guide`, `/studio-guide-prototype`, `/welcome-hall`, `/project-discovery`, `/business-discovery-studio`, `/business_discovery_studio`, `/discovery-summary`, `/studio-plan-review`, `/review-room` → Conversation Room or Feedback Studio per quarantine / page redirect

### Scaffold / coming-soon customer URLs

26. `/account` — JourneyComingSoon  
27. `/past-campaigns` — JourneyComingSoon  
28. `/creative-room` — JourneyComingSoon  

### Missing launch-critical surfaces

29. Customer complaint / issue entry UI  
30. Customer refund request entry UI  
31. Customer communication / follow-up inbox (two-way)  
32. Unified Review + Final + Delivery room (planned; design approval required)  
33. Slide-out tool panel + separate communication panel (planned; approval required)  
34. Customer update history room (as a dedicated customer surface)

### Internal-only (not customer launch rooms)

35. File Room / Owner Console / Launch Tracker / Studio Self-Test  
36. Studio Kitchen  
37. Studio Review (`?studioReview=1`, localhost + development)  
38. `/dev/studio-voice`, `/dev/voice-audition`  
39. `/studio`, `/studio-board/textures`, `/decision-learner` (ungated internal tooling — see Access gaps)

---

## B. Classification table

| # | Name | Route / state | Purpose | Status | Desktop | Phone | 360 | Voice | Auth | Persistence | Launch gate |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Studio Lobby | `/` · `/studio-lobby` | Entrance | **complete** | pass (locked) | pass (locked) | pass | not-required (silent until CR) | public | visit film choice | required |
| 2 | Lobby Entry Film | Lobby state | New vs returning | **complete** | pass | pass | pass | not-required | public | session + cookie | required |
| 3 | Sign In | `/sign-in` | Authenticate | **partial** | pass (P3) | unknown | unknown | not-required | public | session cookie | required |
| 4 | Sign Up | `/sign-up` | Create account | **partial** | pass (P1) | unknown | unknown | not-required | public | user store | required |
| 5 | Password recovery | `/forgot-password` · `/reset-password` | Recover access | **complete** (P4 cold-cert) | pass | unknown | unknown | not-required | public | reset tokens | required |
| 6 | Verify email | `/verify-email*` | Confirm email | **complete** (P2) | pass | unknown | unknown | not-required | public | user store | required |
| 7 | Account handoff | `/account-handoff` | Intake → Board bridge | **partial** | pass (impl) | unknown | unknown | partial | session | handoff params | required |
| 8 | Access denied | `/access-denied` | Honest deny | **partial** | pass | unknown | unknown | not-required | public | n/a | required |
| 9 | Conversation Room | `/studio-conversation-room` | Pre-purchase journey | **partial** | partial | partial | unknown | **must-define-before-construction** | public draft | working draft + session snapshot | required |
| 10 | Voice preference | CR control | On/Off before speech | **partial** | pass (Slice 3) | pass | unknown | partial | public | preference store | required |
| 11 | CR Help overlay | CR overlay | Open Help | **scaffold** | partial | unknown | unknown | must-define | public | n/a | required |
| 12 | Discovery / route / services / plan | CR stages | Build plan without fake engine | **partial** | partial | partial | unknown | **must-define-before-construction** | public | working draft | required |
| 13 | Secure Checkout | CR `?stage=checkout` | Confirm + pay | **partial** | partial | partial | unknown | **must-define-before-construction** | public → purchase | working draft → purchased | required |
| 14 | Production Intake | CR `?stage=intake` | Materials we still need | **partial** | partial | partial | unknown | must-define | signed-in preferred | campaign + draft | required |
| 15 | Studio Board | `/studio-board` | Track project | **partial** | partial | partial | unknown | partial | **no server gate** | campaign record | required |
| 16 | Materials We Still Need (Board) | Board card | Post-purchase materials | **partial** | partial | partial | unknown | not-required | client UI | campaign materials | required |
| 17 | Project Record | `/campaign-details` | Project summary | **partial** | partial | unknown | unknown | not-required | **no server gate** | campaign | helpful / launch-useful |
| 18 | Review Room shell | `/feedback-studio` | What is ready | **partial** (7B1/7B2 strong) | pass | pass | pass | must-define (later) | **no server gate** | campaign + jobs | required |
| 19 | Job Review | `?jobId=` | Comment / revise / approve | **partial** | pass | pass | unknown | must-define (later) | **no server gate** | review data | required |
| 20 | Final Delivery | `/deliverables` | Honest final files | **partial** (HFF 67/67) | pass | pass | pass | must-define (later) | **no server gate** | released files | required |
| 21 | Help Center | `/help-center` | Policies / FAQ | **complete** (locked) | pass | pass | unknown | not-required | public | static | required |
| 22 | Complaint / issue entry | — | Raise issue | **missing** | n/a | n/a | n/a | must-define | would require auth | would need record | required |
| 23 | Refund request entry | — | Request refund review | **missing** UI (API/intake gate exists) | n/a | n/a | n/a | must-define | would require auth | refund tasks | required |
| 24 | Customer communication / follow-up | — | Two-way Studio contact | **missing** | n/a | n/a | n/a | **must-define-before-construction** | would require auth | messages | required |
| 25 | Customer update history | — | See Studio updates | **missing** / Board notes partial | n/a | n/a | n/a | partial | auth | timeline | required |
| 26 | Working draft preservation | cross-cutting | Never erase pre-pay work | **partial** | partial | partial | n/a | not-required | public | `working-draft:v1` | required |
| 27 | Session timeout / return | cross-cutting | Safe timeout | **partial** (dirty WIP on timeout files) | partial | unknown | unknown | not-required | session | draft preserved | required |
| 28 | Unified Review/Final/Delivery | planned | One room | **missing** (planned) | n/a | n/a | n/a | must-define | auth | stages | required later (design first) |
| 29 | Account / Past Campaigns / Creative Room | `/account` etc. | Coming soon | **scaffold** | n/a | n/a | n/a | not-required | public shells | n/a | **Parking Lot** until needed |
| 30 | Legacy Host URLs | `/route-map` etc. | Bookmarks | **obsolete** | n/a | n/a | n/a | n/a | public redirects | n/a | keep redirects |

---

## C. Per-surface detail (launch-critical)

### 1–2. Studio Lobby + Entry Film + returning client

| Field | Finding |
|---|---|
| Files | `src/components/entrance/WelcomeHallWelcomeScene.tsx`, `src/config/studio-lobby-entry-v1.ts`, Lobby locked docs |
| Truthful | Locked composition; film for new/returning; returning → Sign In or Board |
| Incomplete | Migration ledger Lobby↔CR round-trip cert still pending; Lobby WIP dirty (`WelcomeHallWelcomeScene`, untracked `MobileStudioEntry`) |
| Voice | not-required until Conversation Room |
| Definition of done | Already locked for visual V1; preserve; do not redesign |
| Order | Protected — do not reopen |

### 3–8. Auth family

| Field | Finding |
|---|---|
| Files | `src/app/sign-in|sign-up|forgot-password|reset-password|verify-email/**`, `src/lib/auth/*`, timeout guard |
| Truthful | P1–P4 cold-certified; password recovery + verify email protected |
| Incomplete | Auth Packages **5 Project Claim**, **6 Route/Data Protection**, **8 Production Auth** = Not started (`docs/auth-implementation-evidence-ledger.md`). Board/Review/Deliverables/Project Record have **no server-side auth layout gate** (`src/app/(studio)/layout.tsx` is pass-through). Timeout + sign-out files are dirty WIP. |
| Voice | not-required |
| Launch blocker status | **Launch-critical gap** for Customer-One data protection — see Decisions Needed #1. Does **not** block finishing this inventory document. |
| Definition of done | Hard route/data protection for purchased customer rooms; project claim; production auth cert |

### 9–14. Conversation Room spine (Discovery → Checkout → Intake)

| Field | Finding |
|---|---|
| Files | `src/app/studio-conversation-room/page.tsx`, `src/components/studio-conversation-room/**`, `src/config/conversation-room-stage-v1.ts`, `src/config/studio-conversation-framework-v1.ts`, working-draft lib |
| Truthful | One-tablet hardware; stage machine live; working-draft contract locked; Voice preference persists; no fake recommendation engine wired (correct for build order) |
| Incomplete | Package 3 visual cert pending; Package 4 Voice Host not authorized; Help overlay scaffold; dual phase vs stage models; substantial dirty WIP across CR components; checkout is local campaign bridge not production processor cert; dual “Materials we still need” (CR intake + Board card) |
| Voice | **must-define-before-construction** for further Voice-led room work |
| Definition of done | Customer can complete Discovery→Plan→Checkout→Intake→Board handoff without fake engine; Voice defined; desktop+phone certified; dirty WIP either protected or excluded |

### 15–16. Studio Board + Materials We Still Need

| Field | Finding |
|---|---|
| Files | `src/components/studio-board/**`, `src/config/studio-board.ts`, `StudioBoardMaterialsWorkflow` |
| Truthful | Next-action / materials / review CTAs exist; concept wording retired (7B2) |
| Incomplete | Customer truth completeness still on Master List §7.5; auth gate incomplete; update history / two-way communication absent |
| Voice | partial (handoff welcome only) |
| Definition of done | Customer sees truthful status, materials owed, next action, review/delivery links; auth-safe |

### 17. Project Record

| Field | Finding |
|---|---|
| Route | `/campaign-details` |
| Status | **partial** — page exists; stage-truth contract not fully wired into Record UI |
| Launch gate | Useful for Customer One; not a substitute for Board |

### 18–20. Review Room + Job Review + Final Delivery

| Field | Finding |
|---|---|
| Truthful | 7A stage contract · 7B1 shell 44/44 · 7B2 concept retirement 125/125 · Honest Final Files 67/67 |
| Incomplete | Still **two rooms**; unified room is planned only; Voice migration not started; auth gate missing; customer complaint/refund entry not on these surfaces |
| Voice | must-define before unified-room construction |
| Room lock | Do **not** physically merge rooms without Tagia design approval |

### 21. Help Center

| Field | Finding |
|---|---|
| Status | **complete** — locked 2026-07-05; do not polish |
| Caveat | Some workflow copy may still name older Route Map → Checkout chain; locked content — do not edit without Tagia |

### 22–24. Complaint / refund / communication

| Field | Finding |
|---|---|
| Customer UI | **missing** |
| Backend | Refund intake gate + API + Owner Desk decision folders exist (`refund-request-*`, `REFUND_REQUEST_CHANNELS`) |
| Channels named | Squishy chat, Board help, Review message, Final Delivery help, structured form — **customer front doors for those channels are not inventory-complete** |
| Launch gate | Required before Customer-One can resolve money/trust issues without Owner-only workarounds |

### 25–27. Persistence / timeout / return

| Field | Finding |
|---|---|
| Working draft | Locked contract + library + tests; full nav proof bar not fully ledger-certified |
| Timeout | Reopens Lobby film; draft preserved by design — timeout files are dirty WIP |
| Gap | Master List §7.12 still open |

### 28. Unified Review / Final / Delivery

| Field | Finding |
|---|---|
| Status | **missing** as one room; **partial** as three truthful separate rooms |
| Next | Design approval only (Master List §7.6) — no construction |

### 29–30. Scaffold / obsolete

Coming-soon pages and legacy redirects are **not** launch rooms. Keep redirects. Park Account / Past Campaigns / Creative Room unless Tagia needs them for Customer One.

---

## D. Missing launch-critical surfaces

1. Customer complaint / issue entry  
2. Customer refund request entry (UI)  
3. Customer communication / follow-up access (two-way)  
4. Customer update history (dedicated truthful surface)  
5. Unified Review+Final+Delivery room (after design approval)  
6. Slide-out tool panel + separate communication panel (after approval)  
7. Auth Project Claim + Route/Data Protection for purchased rooms  

---

## E. Partial surfaces

Conversation Room (all commerce stages) · Voice preference (exists; Voice Host not defined) · Auth handoff · Studio Board · Materials (dual location) · Project Record · Review Room / Job Review · Final Delivery · Working draft cross-room proof · Session timeout return · CR Help overlay (scaffold-leaning)

---

## F. Complete and protected surfaces

| Surface | Evidence |
|---|---|
| Studio Lobby visual + Entry Film | Locked docs + live-cert slices |
| Help Center V1 | Locked 2026-07-05 |
| Password recovery + email verification (cold) | Auth ledger P2/P4 |
| Review Room stage shell | 7B1 44/44 |
| Legacy concept path retired | 7B2 125/125 |
| Honest Final Files truth | 67/67 production |
| Launch Working Protocol | `e68ccbd` |
| Master Launch List | `50915da` |
| Temporary Launch Tracker | `28bc218` · cert 18/18 |

---

## G. Obsolete or duplicate customer paths

| Path | Classification |
|---|---|
| `/route-map`, `/project-builder`, Host Studio Guide URLs | **obsolete** standalone — redirect to Conversation Room |
| `/checkout`, `/payment` | **obsolete** standalone — CR `?stage=checkout` |
| `/intake`, `/draft-room`, `/project-details` | **obsolete** standalone — CR `?stage=intake` |
| `/review-room` | alias → `/feedback-studio` |
| Legacy Concept A/B/C customer UI | **retired** (7B2); components parked |
| Dual Materials We Still Need | CR intake + Board card — intentional phases but easy to confuse |
| Dual CR phase vs stage models | Internal duplication risk during construction |

---

## H. Studio Voice dependencies

| Surface | Voice mark |
|---|---|
| Lobby / Entry Film / Help Center / Auth forms | Voice not required |
| Conversation Room Discovery → Plan → Checkout → Intake | **must-define-before-construction** |
| Voice preference control | Voice behavior partially defined (preference only) |
| Board handoff welcome | partially defined |
| Review / Final / Delivery / Complaint / Refund / Comms panel | **must-define-before-construction** (before those packages) |
| Unified room | **must-define-before-construction** |

**Do not invent Voice behavior in this inventory.** Unanswered Voice decisions are listed under Decisions Needed.

---

## I. Communication gaps

- No customer inbox / follow-up room  
- CR Help is a scaffold link to Help Center, not Studio conversation  
- Refund channels name Squishy chat / Board help / Review message — front doors incomplete  
- Board notes ≠ two-way Studio communication  
- Slide-out communication panel is planned and locked behind Tagia approval  

---

## J. Persistence gaps

- Working draft contract exists; full proof bar (Back, Lobby, Help, Learn More, refresh, Voice edit, Reset confirmation) not fully closed on Master List §7.12  
- `studioConversationSession` alone is insufficient (documented)  
- Owner QA seeds can overwrite shared browser stores during cert — collision risk  
- Timeout preserves draft but reopens Lobby film — can feel like loss if resume is unclear  

---

## K. Mobile and desktop gaps

- Lobby locked across devices  
- Review shell + Honest Final Files certified desktop/phone/360 in their packages  
- Conversation Room Package 3 visual cert + many migration desktop/mobile gates still pending  
- Auth pages: cold-certified functionally; full phone/360 journey cert incomplete  
- Board / Project Record phone fold and primary-task-first-fold not inventory-certified here  

---

## L. Access-control gaps

Hey Tagia, Scout and I found something we need to fix before moving on — **not as a stop to this inventory document**, but as a **launch-order insertion** before Customer-One:

**What was found:** Studio Board, Campaign Details, Feedback Studio, and Deliverables have no server-side auth gate. `(studio)` layout is a pass-through. Auth Packages 5–6–8 are Not started. Internal pages `/studio`, `/studio-board/textures`, `/decision-learner` are also ungated.

**Why it matters:** A signed-out or wrong-user visitor may reach purchased-project surfaces by URL. That breaks submit/track/review/receive trust for Customer One.

**Smallest correction (future package):** Implement Auth Package 6 route/data protection for purchased customer rooms; leave File Room and Help Center behavior untouched; do not redesign Review/Delivery rooms.

**Affected package:** Auth Route/Data Protection (insert into ordered launch work).  

**What remains untouched now:** All product code — inventory only.  

**Where work returns:** Finish inventory documentation → Studio Voice definition → Conversation Room completion, with Auth protection scheduled before Customer-One (recommend after or with Board truth).

Also: Launch Tracker remains correctly owner-only (layout staff + page owner).

---

## M. Dirty-WIP collision risks

| Area | Risk |
|---|---|
| Conversation Room components + CSS | Heavy dirty WIP — any CR construction needs selective staging |
| Lobby `WelcomeHallWelcomeScene` + untracked `MobileStudioEntry` | Lobby WIP + possible mobile entry experiment |
| Lobby `sourceHref` in migration ledger | Uncommitted `/studio-lobby?lobbyEntry=reset` |
| Owner QA panel/campaign | Can overwrite customer draft/campaign stores |
| Auth timeout guard + config | Dirty — do not absorb into unrelated packages |
| `checkout/page.tsx`, `draft-room/page.tsx` | Dirty redirect shells — quarantine already redirects; verify before touching |
| package.json / lockfile | Unrelated dependency WIP |

---

## N. Truth audit (cross-cutting)

| Question | Current answer |
|---|---|
| Does the button do what it says? | Mostly on Lobby, Help, Review/Delivery after 7B2; CR/Board still have migration and coming-soon risks |
| Does the customer know what happens next? | Partial — Board next-action helps; Voice Host not defined |
| Is progress preserved? | Working draft yes by contract; full proof bar open |
| Can the customer return safely? | Lobby round-trip designed; timeout reopens film |
| Correct info before payment? | Pre-checkout flexibility locked; CR plan/checkout partial |
| Communicate with The Studio? | **No** dedicated customer path |
| See what is needed from them? | Materials on Intake + Board — dual |
| Understand project status? | Board + Review stages partial |
| Review / revision / approval / files truthful? | Job review + Honest Final Files yes; unified room no |
| Signed-in vs signed-out correct? | Auth forms yes; purchased rooms ungated |
| Mobile primary task first fold? | Lobby/Help/Review packages stronger; CR/Board incomplete |
| Voice only when appropriate? | Preference exists; Host doctrine incomplete |
| Pretend to offer what does not exist? | Concept picker retired; Account/Past Campaigns coming-soon if linked; no fake recommendation engine (good) |

---

## O. Owner decisions (recorded 2026-07-26)

1. **Auth route/data protection timing** — **answered.** Schedule Auth Route/Data Protection **after** Studio Board truth/completeness and **before** the Customer-One trial. May be pulled earlier if a preceding package needs safe purchased-room access for certification. Cannot slip beyond Customer-One.

2. **Materials We Still Need dual UX** — **waiting.** Not resolved during inventory protection. Carried into the Studio Board truth/completeness package. This inventory identifies both current locations (Conversation Room intake panel and the Studio Board materials card) and the duplication risk **without** selecting a redesign.

3. **Coming-soon URLs** (`/account`, `/past-campaigns`, `/creative-room`) — **answered.** Customer-facing navigation must not advertise unfinished or scaffold routes as available services. Direct placeholder routes may remain internally for development only if they are not exposed as real customer destinations. The truthfulness audit belongs to the relevant customer-room package.

4. **Ungated internal tooling** (`/studio`, `/studio-board/textures`, `/decision-learner`) — **answered.** Internal tools must remain inaccessible to signed-out and normal customer users. Include these routes in the Auth Route/Data Protection audit. Do not broaden this into a full Owner Console package.

5. **Studio Voice definition scope** — **answered.** The next package is documentation and behavior definition only. It must define: customer orientation · availability without hovering · speaking boundaries · listening boundaries · silence and waiting behavior · customer control · escalation rules · communication with customer, machine, Chat, team, and Tagia · truthfulness boundaries · handoff behavior · Voice On / Voice Off behavior · accessibility behavior · where Voice is required, optional, or absent. It must **not** build Package 4 Voice Host, add a recommendation engine, redesign rooms, change TTS/STT architecture, or modify product code unless Tagia separately approves a later construction package.

6. **Unified-room design kickoff** — **answered.** Design approval occurs after Studio Voice definition, Conversation Room completion, customer communication access, and Studio Board truth/completeness. Do not construct or redesign the unified Review/Final/Delivery room before Tagia approves its physical layout and behavior. Slide-out tools panel and separate communication panel remain locked future requirements.

---

## P. Recommended completion order (evidence-locked)

Aligns with Master Launch List §7; inserts Auth protection as newly discovered required work:

1. ~~**Finish this inventory**~~ — complete and accepted 2026-07-26  
2. **Studio Voice definition and customer-presence doctrine** ← *next active item*  
3. **Conversation Room completion without recommendation engine**  
4. **Customer communication and follow-up access** (minimal truthful entry)  
5. **Studio Board customer truth and completeness**  
6. **Auth Project Claim + Route/Data Protection** ← newly discovered; **locked before Customer-One**  
7. **Unified Review/Final/Delivery design approval** (Tagia)  
8. Unified room construction (after approval)  
9. Slide-out tool panel  
10. Separate slide-out communication panel  
11. Complaints, requests, refunds, and issue entry (customer UI on top of existing intake gate)  
12. Customer update history  
13. Cross-room progress preservation proof close  
14. Desktop and mobile certification  
15. Team/production → intensive testing → Customer-One trial  

Parking Lot remains: recommendation engine, legacy concept deletion, broad CSS cleanup, Account/Past Campaigns/Creative Room, advanced Owner Console.

---

## Q. Recommended first construction package

After this inventory is reviewed and protected as documentation:

### **Package: Studio Voice Definition and Customer-Presence Doctrine**

**Why first:** Master List §7.2; Conversation Room and later rooms are blocked from honest Voice construction until doctrine exists. Inventory confirms Voice is **must-define-before-construction** for the live front door.

**Boundary (docs/config only unless Tagia expands):**

- Define when Voice speaks / stays quiet  
- Presence cues vs narration  
- Escalation rules (money, deadlines, complaints, refunds, trust)  
- Explicit: no fake recommendation engine  
- Record unanswered product decisions in Communication Notebook  

**Must not:** Build Package 4 Voice Host · redesign Lobby · merge Review/Delivery · absorb dirty WIP · invent recommendation scoring  

**Then:** Conversation Room completion package (construction), with selective staging around dirty CR WIP.

---

## R. Files inspected (representative; not exhaustive)

### Config / journey

- `src/config/customer-journey-v1.ts`
- `src/config/legacy-route-quarantine-v1.ts`
- `src/config/conversation-room-stage-v1.ts`
- `src/config/studio-conversation-framework-v1.ts`
- `src/config/studio-lobby-entry-v1.ts`
- `src/config/studio-working-draft-v1.ts`
- `src/config/studio-board.ts`
- `src/config/materials.ts`
- `src/config/help-center.ts`
- `src/config/refund-request-channels.ts`
- `src/config/studio-review-voice-tablet-migration-v1.ts` (**dirty WIP — read only**)
- `next.config.ts` redirects

### App routes

- `src/app/page.tsx`, `studio-lobby`, `studio-conversation-room`, `studio-board`, `campaign-details`, `feedback-studio`, `deliverables`, `help-center`
- Auth pages under `src/app/sign-in|sign-up|forgot-password|reset-password|verify-email|account-handoff|access-denied`
- Redirect shells: `route-map`, `project-builder`, `checkout`, `payment`, `intake`, `draft-room`, etc.
- `src/app/(studio)/layout.tsx`
- `src/app/file-room/layout.tsx`, `launch-tracker/page.tsx`
- Coming soon: `account`, `past-campaigns`, `creative-room`

### Docs

- `docs/launch/STUDIO-MASTER-LAUNCH-LIST.md`
- `docs/launch/STUDIO-LAUNCH-WORKING-PROTOCOL.md`
- `docs/customer-journey-v1-locked.md`
- `docs/auth-implementation-evidence-ledger.md`
- `docs/help-center-v1-locked.md`
- `docs/studio-working-draft-persistence-v1-locked.md`
- Review/Delivery and refund docs as cited above

### Components / libs (sampled)

- Conversation Room runtime/panels · FeedbackStudioScene path (post-7B2) · DeliverablesScene · Board materials · auth session timeout · refund-request intake

---

## S. Documentation files created or modified by this package

| File | Action |
|---|---|
| `docs/launch/CUSTOMER-FACING-ROOM-INVENTORY.md` | **Created** (this document) |
| `docs/launch/STUDIO-MASTER-LAUNCH-LIST.md` | **Updated** Communication Notebook + checkpoint + daily area only |

**No product code changed.**

---

## T. Inventory completion checklist (package definition of done)

- [x] Every customer-facing room listed  
- [x] Each classified complete / partial / scaffold / missing / obsolete / internal-only  
- [x] Exact completion order locked — accepted by Tagia 2026-07-26  
- [x] Studio Voice placed before further Voice-affecting construction  
- [x] First construction package selected (Studio Voice definition)  
- [x] No product code changed  
- [x] Tagia review of inventory — accepted  
- [x] Marked complete on the Master Launch List  

---

---

## U. Discontinued Product Directions (owner-locked 2026-07-26)

### Live Host / Voice Host — DISCONTINUED

- No live host character · no mascot in rooms · no Package 4 Voice Host · no hovering constantly present character
- **Studio Voice remains** as Studio Representative (not character/mascot)
- Presence may use waves, indicators, controls — brief orientation, available without hovering
- Host-era routes/components → redirect / internal-only / archive candidates
- Do not delete Host-era code until Tagia approves a deletion package

### Recommendation Engine — DISCONTINUED FOR LAUNCH

- No intelligent recommendation claims from answers
- Voice may clarify needs, explain real services, compare truthful options
- Customer selects/adds/removes/changes services
- Keyword/static mappings must not be presented as intelligent recommendations
- Recommendation-era code → classify; do not delete in this pass
- Advanced recommendation work remains parked unless Tagia reopens it

### Other superseded directions

Standalone Route Map / Project Builder / Checkout / Payment / Intake · Host Guide URLs · legacy concept picker · advertising scaffolds as live · Live Host Lobby behavior

---

## V. Legacy Page Archive and Retirement Policy

**Archive first. Delete only after Tagia explicitly approves deletion.**

Lifecycle: LIVE → REDIRECT → INTERNAL-ONLY → SCAFFOLD → ARCHIVE CANDIDATE → ARCHIVED → DELETE CANDIDATE → DELETED (Tagia approval required).

Cleanup gate: archive only after replacement live path is verified, tested, and protected.  
Deletion gate: dependency audit + Tagia approval.  
Advertisement gate: no obsolete or scaffold page advertised as working.

---

## W. Verified page and route counts (2026-07-26)

Source: `src/app/**/page.tsx` (**53** route files) + this inventory. Numbers are not guesses.

### Official page-count lock (Tagia 2026-07-26)

| Milestone | Count | Meaning |
|---|---|---|
| **Current repository reality** | **16** | Current verified live customer-facing routed pages |
| **Customer-One target** | **15** | Official approved target for the Customer-One trial — **not** 14 or 13 |
| **Possible intermediate** | **14** | Only if Lobby aliases are consolidated before the unified Review/Final/Delivery room. Not the official Customer-One target unless Tagia later changes the launch order and explicitly approves that count |
| **Later unified-room target** | **13** | After Voice definition · CR completion · communication access · Board truth · Tagia unified-room design approval · construction and certification |

> **Page-count reductions are architectural milestones, not permission to remove or archive routes before their replacement paths are verified, tested, protected, and approved.**

### Route-list arithmetic (16 → 15 → 14 → 13)

| Step | Change | Routes |
|---|---|---|
| **16 → 15** (Customer-One) | `/verify-email/pending` leaves the approved live-room **target** and is counted as a verification **state** of `/verify-email` | Keep `/verify-email` |
| **15 → 14** (optional intermediate) | Lobby alias consolidation | `/studio-lobby` → REDIRECT to `/` |
| **14 → 13** (later) | Unified Review/Final/Delivery | `/feedback-studio` + `/deliverables` → one room |

Compatibility blockers for immediate consolidation: Lobby bookmarks · email verify-pending deep links · Host/commerce redirects · certs asserting current URLs · dirty WIP on some redirect shells.

### Summary counts

| Count type | Number |
|---|---|
| Live customer-facing routed pages (current) | **16** |
| Approved Customer-One live routed-page target | **15** |
| Possible intermediate (Lobby aliases only) | **14** |
| Later unified-room target | **13** |
| Customer-facing states inside live pages | **14** |
| Redirect-only legacy routes | **19** |
| Customer-facing scaffolds | **3** |
| Internal-only routes | **15** |
| Archive candidates (redirect shells first) | **19** |
| Missing approved customer-facing surfaces | **5** |

### Supporting lists

**Live current (16):** `/` · `/studio-lobby` · `/studio-conversation-room` · `/sign-in` · `/sign-up` · `/forgot-password` · `/reset-password` · `/verify-email` · `/verify-email/pending` · `/account-handoff` · `/access-denied` · `/studio-board` · `/campaign-details` · `/feedback-studio` · `/deliverables` · `/help-center`

**Customer-One target (15):** same as live 16 **except** `/verify-email/pending` is not a separate approved journey room (verification state of `/verify-email`).

**States (14):** Lobby Entry Film · returning-client choice · Voice preference · CR opening/route/services/plan/checkout/intake/complete · CR Help overlay · Job Review (`?jobId=`) · Board Materials card · session-timeout film reopen · *(verify-email pending treated as verify state for target counting)*

**Redirects (19):** `/route-map` · `/project-builder` · `/checkout` · `/payment` · `/intake` · `/draft-room` · `/draft-room/begin` · `/project-details` · `/project-summary` · `/welcome-hall` · `/studio-tablet` · `/studio-guide` · `/studio-guide-prototype` · `/studio-plan-review` · `/discovery-summary` · `/review-room` · `/business-discovery-studio` · `/business_discovery_studio` · `/project-discovery`

**Scaffolds (3):** `/account` · `/past-campaigns` · `/creative-room`

**Internal (15):** File Room family (8) · Studio Kitchen (2) · `/dev/studio-voice` · `/dev/voice-audition` · ungated `/studio` · `/studio-board/textures` · `/decision-learner`

**Missing (5):** complaint entry · refund entry UI · customer communication · update history · unified Review/Final/Delivery

### Proposed archive order (documentation only — not executed)

1. Keep redirects until bookmark migration is proven against Conversation Room / Review Room  
2. Hide scaffolds from customer navigation (decision answered)  
3. Gate ungated internal tooling in Auth package  
4. Later approved package: move Host/commerce redirect shells to archive structure  
5. Later: Host/recommendation/concept-picker code dependency audit → DELETE CANDIDATE only with Tagia approval  

### Routes that must remain redirects temporarily

All 19 redirect-only legacy routes — bookmark safety and quarantine config.

### Routes that cannot yet be archived and why

- Live 16 — still the customer journey  
- File Room / Kitchen / Launch Tracker — internal operations  
- Dirty-WIP-touched redirect shells (`checkout`, `draft-room`, etc.) — selective staging risk; archive package must not absorb unrelated WIP  
- Concept-picker components — historical/Owner QA fixtures; 7B2 kept them intentionally  

### Deletion dependency / risk

Tests, Owner QA seeds, migration ledger Host URLs, recommendation keyword maps, and dirty CR WIP may still reference Host-era and recommendation-era surfaces. Premature deletion can break cert scripts and developer fixtures.

---

**Last updated:** 2026-07-26 · Inventory complete · page counts locked (16 current · 15 Customer-One · 14 Lobby intermediate only · 13 later unified) · Host/recommendation discontinued · archive-before-delete locked · awaiting control-tower protect · no product code changed · Studio Voice construction not started

