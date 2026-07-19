# Studio Review → Voice Tablet — Migration Ledger

**Living ledger.** Statuses in this table must match `src/config/studio-review-voice-tablet-migration-v1.ts`.  
Update both on every Voice-tablet package. Contract: `docs/studio-review-to-voice-tablet-migration-v1-locked.md`.

**Rule:** remove a Studio Review page only after all gates pass for that row.

| Source | Tablet replacement | Presentation view | Data mapping | Persistence | Editing | Attribution | Tests | Desktop | Mobile | Owner approval | Status | Removal |
|--------|--------------------|-------------------|--------------|-------------|---------|-------------|-------|---------|--------|----------------|--------|----------|
| Project Discovery (Discovery Room) | Tablet — Studio follow | Presentation — Speak/Type conversation | working_draft discoveryAnswers.q1+q2 | pending | pending | pending | pending | pending | pending | pending | **in_progress** (Q→A→Got it→Next; live Q1+Q2) | pending |
| Studio Lobby | Lobby entrance + Conversation Room resume | Lobby customer surface | Lobby visit + session + working_draft | pending | n/a | pending | pending | pending | pending | pending | not_started | pending |
| Route Map | Tablet — Route Recommendation + confirm CTA | Presentation — route | routeRecommendation + customerSelectedRoute | verified | pending | pending | pending | pending | pending | pending | **in_progress** (Guidance Pass v1 recommend + confirm) | pending |
| Project Builder | Activity Panel — Build Your Project (`builder`) | Tablet status + guidance; panel = service cards | working_draft route + selectedServices | verified | verified | pending | pending | pending | pending | pending | **in_progress** (Guidance Pass v1; Host page stays) | pending |
| Studio Plan | Tablet — Plan facts + Continue to Checkout | Tablet glass; extras panel for revisions/materials | draft → plan summary; Confirm → checkout panel | verified | verified | pending | pending | pending | pending | pending | **in_progress** (Guidance Pass v1) | pending |
| Checkout | Tablet status + prep; Panel SecureCheckoutGrid | Panel — total, scope lock, Complete Checkout | bridge → approved plan → markPaymentReceived → Intake | verified | pending | pending | pending | pending | pending | pending | **in_progress** (Guidance Pass v1) | pending |
| Project Intake | Tablet production status; Panel multi-service intake | Panel — materials + per-service | intake plan + campaign draft/submit | verified | pending | pending | verified | pending | pending | pending | **in_progress** (Guidance Pass v1) | pending |
| Studio Board | Voice handoff → sign-in → Board welcome | Board customer home | purchased + handoff passport | pending | n/a | pending | pending | pending | pending | pending | **in_progress** (Guidance Pass v1) | pending |
| Production | Tablet / board — production | Presentation — production | purchased + jobs | pending | n/a | pending | pending | pending | pending | pending | not_started | pending |
| Review Room | Tablet — concept review | Presentation — review room | purchased + review | pending | pending | pending | pending | pending | pending | pending | not_started | pending |
| Final Delivery | Tablet — delivery handoff | Presentation — deliverables | purchased + deliverables | pending | n/a | pending | pending | pending | pending | pending | not_started | pending |

Internal Owner QA shortcuts (File Room, Owner Console, etc.) are **not** customer Voice-tablet migration rows; they may remain in Studio Review as internal tools until Tagia says otherwise.
