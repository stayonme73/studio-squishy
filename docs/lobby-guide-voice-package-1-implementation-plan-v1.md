# Lobby Guide — Voice Package 1 Implementation Plan

| Field | Value |
|---|---|
| Room | Studio Lobby |
| Status | **APPROVED — Package 1 implementation authorized** |
| Owner | Tagia |
| Date | 2026-07-17 (Approved) |
| Design authority | `docs/lobby-guide-voice-architecture-v1.md` (**APPROVED**) |
| Product lock | `docs/lobby-guide-conversation-v1-locked.md` |

**Gates**

| Gate | Status |
|------|--------|
| Voice Architecture V1 | **APPROVED** |
| This Implementation Plan | **APPROVED** (Tagia 2026-07-17) |
| Voice code | Authorized for Package 1 slice only — certify after Desktop → Samsung → re-certify |
| Lobby complete | **No** — Layer Completion Doctrine |

**Product lock line**

> The microphone is an alternate input method, not an alternate conversation.

---

## 1. Package purpose

Deliver the **first certifiable voice slice** on the existing Lobby Guide conversation:

- Customer can speak an answer into the **same** answer field used for typing.
- Full voice **state machine** + **Listening UX** from the approved architecture.
- Transcript Confidence, Interruption, privacy, secure-context, and typing-first-class rules enforced.
- Existing Samsung-safe GET Continue / Skip / Confirm / Correct path unchanged in behavior.

This package does **not** complete the Lobby or the full finished voice experience (see Out of scope).

---

## 2. Adapter boundary (locked)

**Browser-specific APIs never escape the speech adapter.**

```
GuideConversationPanel / GuideMicControl
        ↓
GuideSpeechAdapter  (studio-guide-speech.ts)
        ↓
Browser STT implementation (only place that may name provider APIs)
```

| Layer | May know |
|-------|----------|
| UI (`GuideConversationPanel`, `GuideMicControl`, CSS) | Adapter methods and speech **state** only (`idle`, `listening`, …). **Never** `SpeechRecognition`, `webkitSpeechRecognition`, or other browser STT types |
| State machine (`studio-guide-speech-state.ts`) | Pure states/events only — **no** browser STT APIs |
| Adapter (`studio-guide-speech.ts`) | **Only** place allowed to feature-detect or call browser STT (`SpeechRecognition` / `webkitSpeechRecognition` or successors) |
| Later packages | May replace the adapter internals without touching UI |

Feature detection for “is dictation available?” is exposed as adapter results (e.g. `isGuideDictationAvailable()`), not by UI importing browser constructors.

---

## 3. Performance Doctrine

**Voice must never make the Lobby feel slower.**

- Starting voice must **not** noticeably delay the existing text workflow.  
- Mic initialization must **never** block the question from rendering.  
- Answer field, Continue, and Skip must be usable on first paint / first interaction **before** any speech work finishes.  
- If speech services are unavailable, the customer can **immediately** continue typing.  
- Text remains the **fastest guaranteed path**.  

Implementation: no await of speech permission or recognition setup before rendering the question form; adapter init is lazy on first mic tap (or idle background probe that cannot block input).

---

## 4. First voice slice only (in scope)

| In Package 1 | Detail |
|--------------|--------|
| Feature detect | Via **adapter only** (secure context + browser STT capability) |
| Mic control | On question steps only (`ask_*`), same form as typed answer |
| State machine | `idle` · `requesting_permission` · `listening` · `processing` · `transcript_ready` · `error` · `unsupported` |
| Listening UX | Exact customer-visible states from architecture |
| Interim preview | Optional non-committing display while listening |
| Final transcript | Writes into editable `#studio-guide-answer` / `name="ganswer"` as draft only |
| Never auto-advance | Customer must Continue / Skip after review |
| Doctrines | Transcript Confidence · Interruption · Performance · human wins · adapter boundary |
| Privacy copy | Complete sentence: browser speech services may process audio |
| Stop conditions | Mic toggle, typing, Continue/Skip, step change, panel close, `visibilitychange` / page hide |
| Permission / unsupported / errors | Per architecture fallback matrix |
| Dev diagnostics | Development-only speech logs (see Observability) |
| HTTPS / tunnel path | Documented runbook for Samsung voice test |
| Tests | Unit tests for pure helpers + checklist for desktop / Samsung |
| Hard-nav cache bump | `gr` → `room-v8` (CTA + `GUIDE_HARD_NAV.gr` + panel marker) |

---

## 5. Out of scope (explicit — later packages)

| Not in Package 1 | Why |
|------------------|-----|
| Summary **TTS** | Separate certifiable slice after dictation PASS (adapter may gain speak later; UI still not browser-TTS-aware) |
| Voice confirm / correct on summary (“yes” / “change…”) | Depends on stable dictation + optional TTS |
| AI understanding / structured extraction | Architecture forbids merging with STT |
| Studio audio upload / storage / backend STT | Forbidden in V1 |
| Route Map, Board, other rooms | Lobby only |
| Lobby completion / commit-as-finished | Layer Completion Doctrine |
| Changing question order, draft schema, or GET hard-nav semantics | Text path already PASS |
| Legacy Studio Guide package UI (`PackageSelectorSidebar`, etc.) | Unrelated |
| Production analytics / telemetry for speech | Dev diagnostics only |

---

## 6. Files to add

| File | Role |
|------|------|
| `src/lib/studio-guide-speech.ts` | **GuideSpeechAdapter** — sole home of browser STT APIs; feature detect, start/stop dictation, secure-context check, dev diagnostics hooks. **No TTS in Package 1.** |
| `src/lib/studio-guide-speech-state.ts` | Explicit state machine + transition helpers (pure; no browser STT imports) |
| `src/lib/studio-guide-speech.test.ts` | Unit tests against adapter surface / mocks — UI tests must not import browser STT globals |
| `src/lib/studio-guide-speech-state.test.ts` | Unit tests: state transitions for mic tap, type-while-listening, hide, stop |
| `src/components/studio-guide/GuideMicControl.tsx` | Mic button + Listening UX chrome — talks to adapter + state only |
| `docs/lobby-guide-voice-package-1-implementation-plan-v1.md` | This plan |

Optional small helper (only if needed to keep panel thin):

| File | Role |
|------|------|
| `src/components/studio-guide/GuideSpeechStatus.tsx` | Status line for speech **states** (no browser APIs) |

---

## 7. Files to modify

| File | Allowed change |
|------|----------------|
| `src/config/studio-guide-conversation-v1.ts` | Mic/privacy/status/error copy (complete sentences); placeholder may mention type or speak; header notes Architecture Approved + Package 1; voice kill-switch helper |
| `src/components/studio-guide/GuideConversationPanel.tsx` | Wire mic control via adapter + state machine; ref to answer input; stop-on-type / Continue / lifecycle; bump `data-guide-boot` to `room-v8`. **No** `webkitSpeechRecognition` / `SpeechRecognition` identifiers in this file |
| `src/components/studio-guide/GuideConversationPanel.module.css` | Mic layout, pulse/glow, status, error, unsupported styles — match existing Guide panel language |
| `src/lib/studio-guide-hard-nav.ts` | `GUIDE_HARD_NAV.gr` → `room-v8` only (no semantic hard-nav changes) |
| `src/components/entrance/WelcomeHallWelcomeScene.tsx` | Mobile Guide CTA `gr=room-v8` only |
| `docs/lobby-guide-conversation-v1-locked.md` | Note Package 1 plan path (no product behavior invent) |
| `package.json` | Add `dev:https` script: `next dev --experimental-https -H 0.0.0.0 -p 3000` |

SSR boot (minimal, no mic in first paint):

| File | Allowed change |
|------|----------------|
| `src/components/studio-guide/GuideSsrBootShell.tsx` | Prefer **zero change**. Must not import or name browser STT APIs. |

---

## 8. Files and systems that must not be touched

| Do not touch | Reason |
|--------------|--------|
| `src/lib/studio-guide-capture.ts` schema / confirm semantics | Text capture already certified |
| Hard-nav interpret/carry logic (beyond `gr` bump) | Samsung Continue/Confirm PASS must not regress |
| `src/lib/studio-guide-lobby-boot.ts` (unless a one-line type-only fix is proven required) | Server boot is text hard-nav |
| `src/app/page.tsx` / `src/app/studio-lobby/page.tsx` structure | Lobby entry wiring stays |
| Lobby plate / host artwork / `docs/studio-lobby-v1-locked.md` visuals | Lobby visual lock |
| Route Map, Project Builder, checkout, Discovery, Board | Wrong room |
| Recommendation Engine / Service Catalog / scoring | Build-order freeze |
| Legacy Guide package components (`PackageSelector*`, `HelpMeChooseModal`, etc.) | Not this conversation |
| Any new API route for audio upload or transcription | Forbidden |
| Cloud STT/TTS vendor SDKs | Out of Package 1 |
| AI / LLM extraction of answers | Out of scope |
| Production analytics pipelines for mic events | Dev diagnostics only |

---

## 9. State-machine implementation

**Source of truth:** Architecture § Voice state machine + Listening UX + Interruption / Transcript Confidence doctrines.

**Implementation rules**

1. Single current state string/enum — no conflicting booleans (`isListening && isUnsupported`).  
2. Pure transition helpers in `studio-guide-speech-state.ts`; panel/adapter apply side effects.  
3. `unsupported` is terminal for mic; typing continues.  
4. Final transcript → field only in transition to `transcript_ready`, and only if Interruption Doctrine allows (no overwrite of customer edits).  
5. Continue / Skip / Close / step change / `document.visibilityState === 'hidden'` → force stop via adapter → `idle` or keep `unsupported`.  
6. UI never constructs or types browser recognition objects.

**Suggested state type**

```ts
type GuideSpeechState =
  | "idle"
  | "requesting_permission"
  | "listening"
  | "processing"
  | "transcript_ready"
  | "error"
  | "unsupported";
```

---

## 10. Customer-visible states (must match architecture)

| State | Customer sees |
|-------|----------------|
| `idle` | Mic button available; field editable; no listening animation |
| `requesting_permission` | Waiting mic; “Waiting for microphone permission.” |
| `listening` | Mic glows/pulses; “Listening.”; interim preview optional |
| `processing` | Small spinner; “Finishing.” |
| `transcript_ready` | Final text in editable answer field; Continue separate; optional review hint |
| `error` | Friendly complete-sentence message + Retry; typing works |
| `unsupported` | Mic hidden/disabled + plain explanation; typing works |

Copy lives in `studio-guide-conversation-v1.ts` — complete sentences, no ellipsis truncation.

---

## 11. Field write policy (Package 1)

1. Interim results → preview only (not `ganswer` value), or ephemeral overlay.  
2. On final from adapter: if customer has **not** edited since listen started → set input value to last final transcript → `transcript_ready`.  
3. If customer **has** edited → do **not** overwrite; stop recognition → `idle` (or `transcript_ready` without field replace); emit dev diagnostic `transcript_rejected_customer_edited`.  
4. Typing during `listening` → stop recognition; keep typed chars; `idle`.  
5. Never call form submit from speech end.

---

## 12. Observability (development diagnostics only — not analytics)

**Goal:** Know where voice failed while debugging. **Not** product telemetry.

During **development only** (`NODE_ENV === "development"`), the adapter (and thin panel hooks if needed) may `console.info` / `console.warn` with a stable prefix, e.g. `[studio-guide-speech]`, for:

| Event key | When |
|-----------|------|
| `unsupported` | Dictation unavailable (API or secure context) |
| `permission_denied` | Mic permission denied |
| `secure_context_missing` | Not a secure context |
| `timeout` | Recognition timed out |
| `provider_error` | Browser/provider recognition error |
| `transcript_received` | Final transcript delivered to UI layer |
| `transcript_rejected_customer_edited` | Final ignored because customer edited |
| `transcript_rejected_customer_typed` | Stopped/rejected because customer typed while listening |
| `recognition_stopped_continue` | Stopped because Continue/Skip |
| `recognition_stopped_close` | Stopped because panel close / leave |
| `recognition_stopped_hidden` | Stopped because tab/page hidden |
| `recognition_stopped_mic_toggle` | Stopped because mic tapped off |

**Rules**

- These logs **must not** ship as customer-facing UI.  
- They **disappear from production** (no-op or stripped when not development).  
- No analytics vendor, no network beacon, no PII beyond what already appears in the answer field locally.  
- Do not log raw audio.

---

## 13. Desktop and Samsung tests

### Desktop (Scout + Tagia)

| # | Check |
|---|--------|
| D1 | Guide opens; type path still works end-to-end through Confirm |
| D2 | Secure context (`https://localhost` or localhost HTTP exception): mic appears when adapter reports available |
| D3 | Tap mic → permission → Listening UX → speak → transcript in field → edit → Continue advances |
| D4 | Never auto-advances on final transcript |
| D5 | Type while listening stops mic; typed text kept |
| D6 | Edit after transcript; second listen does not clobber edits |
| D7 | Continue/Skip while listening stops recognition |
| D8 | Close / navigate away stops recognition |
| D9 | Deny permission → error copy + typing works |
| D10 | Privacy sentence visible near mic |
| D11 | Tab hide stops recognition |
| D12 | `gr=room-v8` CTA still opens Guide |
| D13 | Question + type path usable immediately; mic init does not block typing (Performance Doctrine) |
| D14 | UI source does not reference `webkitSpeechRecognition` / `SpeechRecognition` (adapter only) |

### Samsung (Tagia evidence required for voice slice PASS)

| # | Check |
|---|--------|
| S0 | Open via **secure context** (trusted HTTPS LAN or tunnel) — not plain `http://10.x` |
| S1 | Text path regression: open → answer → Continue → summary → Confirm still works |
| S2 | Mic permission + Listening UX visible |
| S3 | Spoken answer lands in same field; can edit; Continue advances |
| S4 | No auto-advance |
| S5 | Type-while-listening / close-during-listen do not trap the room |
| S6 | Unsupported or deny path leaves typing usable |
| S7 | Conversation still feels like one Guide chat — not a separate “voice mode” (product feel) |

**Voice Package 1 PASS** requires desktop checks + Tagia Samsung evidence on secure context + product acceptance (§16).  
**Lobby complete** still requires later packages (TTS, full finished checklist) + Layer Completion Doctrine.

---

## 14. HTTPS / tunnel testing path

Order (architecture-locked):

1. Run `npm run dev:https` → `next dev --experimental-https -H 0.0.0.0 -p 3000`.  
2. Desktop: `https://localhost:3000/?guide=1&gr=room-v8`.  
3. Samsung: `https://<LAN-IP>:3000/...` — verify device **trusts** the cert.  
4. If Samsung does not trust cleanly → **secure tunnel** to the dev server; do not burn half a day on cert wrestling.  
5. Record which path was used in certification notes (local HTTPS trusted vs tunnel).

Text-path Samsung PASS on HTTP remains historical; **voice slice PASS requires accepted secure context**.

---

## 15. Accessibility checks

| Check | Requirement |
|-------|-------------|
| Typing path | Fully usable without mic |
| Mic control | Named button (`aria-label` from config); state announced via visible text and/or `aria-live` for status changes |
| Keyboard | Continue / Skip / Close remain operable; mic activatable by keyboard where focusable |
| Focus | Starting listen must not trap focus away from the answer field permanently |
| Reduced motion | Prefer CSS that degrades pulse if `prefers-reduced-motion: reduce` (static listening indicator) |
| Errors | Complete sentences; `role="alert"` for error messages |

---

## 16. Error and permission handling

| Situation | State | UI |
|-----------|-------|-----|
| Dictation unavailable (adapter) | `unsupported` | Mic disabled/hidden + explanation |
| Not a secure context | `unsupported` (or error with HTTPS guidance) | Explain HTTPS/tunnel Lobby URL; typing works |
| Permission denied | `error` | How to enable access + Retry; preserve field |
| No-speech / timeout / network | `error` | Friendly message + Retry; field unchanged unless final already applied |
| Provider failure | `error` | Same; never clear prior draft answers in carry/storage |

---

## 17. Rollback method

If Package 1 regresses the text path or traps Samsung:

1. **Feature-flag safe default:** Mic UI only mounts when adapter reports available; failures degrade to typing — do not remove text forms.  
2. **Hard disable:** Voice gated behind `NEXT_PUBLIC_STUDIO_GUIDE_VOICE=1` in addition to existing conversation flag — Package 1 ships voice **off by default** until Tagia enables for cert.  
3. **Code rollback:** Revert only Package 1 touched files listed in §§6–7; do not revert hard-nav carry/Confirm fixes from mobile stability.  
4. **Cache bump:** If a bad client sticks, bump `gr` to `room-v9` after fix and re-certify.

**Locked Package 1 default:** Voice dictation behind `NEXT_PUBLIC_STUDIO_GUIDE_VOICE=1` (conversation flag alone does not enable mic).

---

## 18. Acceptance criteria (Package 1)

Package 1 may be marked **slice PASS** only when **all** engineering **and** product criteria are true.

### Engineering acceptance

1. Architecture doctrines implemented (draft not truth; human wins; same field; no auto-advance; adapter boundary; Performance Doctrine).  
2. Listening UX matches the state table.  
3. Desktop D1–D14 pass.  
4. Samsung S0–S7 pass with owner evidence on secure context.  
5. Unit tests for state helpers pass in CI/`vitest`.  
6. Text Continue/Confirm path shows **no regression**.  
7. No TTS, no AI understanding, no Studio audio backend introduced.  
8. Browser STT APIs exist only inside `studio-guide-speech.ts`.  
9. Voice remains kill-switchable (`NEXT_PUBLIC_STUDIO_GUIDE_VOICE`).  
10. Dev diagnostics present in development and absent in production.  
11. Tagia has **re-certified** after any defect fixes (see §19).  
12. **No** Lobby-complete claim, commit-as-finished, or Route Map work.

### Product acceptance (Lobby conversation doctrine)

Checkboxes alone are not enough. The interaction must still feel like the approved Guide conversation:

1. **One conversation** — speaking does not open a parallel flow, sheet, or “voice mode.”  
2. **One answer field** — typed and spoken answers share the same field and Continue path.  
3. **No alternate voice workflow** — no mode toggle, no separate voice wizard.  
4. **Customer remains in control** — review/edit before Continue; interruptions always win.  
5. **Conversation rhythm preserved** — one natural question at a time; Guide pace not replaced by robotic mic ceremony.  

If engineering checks pass but the experience feels like a disconnected dictation gadget, Package 1 is **not** PASS.

---

## 19. Re-certification procedure

After every defect fix in this package:

1. Re-run affected unit tests.  
2. Re-run desktop D1 (text regression) + any failed voice checks.  
3. If Samsung-facing: re-run S0 + S1 + the specific failed Samsung checks.  
4. Re-check product acceptance (§18) — rhythm and control, not only mechanics.  
5. Record: what broke, what changed, what was re-proven.  
6. Only then mark the slice (or sub-fix) PASS.  

**Fix ≠ finish.** Re-certify is mandatory before locking the Package 1 layer.

---

## 20. Implementation order (after this plan is Approved)

1. Config copy + `NEXT_PUBLIC_STUDIO_GUIDE_VOICE` gate + `dev:https` script.  
2. Pure state machine + unit tests (no browser APIs).  
3. `studio-guide-speech.ts` adapter (sole browser STT home; dev diagnostics; no TTS).  
4. `GuideMicControl` + CSS Listening UX (adapter + state only).  
5. Wire into `GuideConversationPanel` (lazy mic; Performance Doctrine; lifecycle).  
6. Bump `room-v8`.  
7. Desktop verify → Samsung secure-context verify → fix → **re-certify**.  
8. Stop. Do not start TTS package until Tagia opens Package 2.

---

## 21. Certification language (mandatory)

When Package 1 succeeds, certify **only**:

> **Lobby Guide Voice Package 1 (dictation into same field): PASS**

Do **not**:

- declare Lobby complete  
- declare finished Lobby voice experience complete  
- move to Route Map  
- commit as Lobby finished unless Tagia explicitly requests a commit of this slice  

Next layer after Package 1 PASS (separate plan): summary TTS / spoken Guide output as Package 2.

---

## 22. Review checklist for Tagia (this plan)

- [x] Slice scope is small enough (dictation only; TTS deferred)  
- [x] File allow-list / deny-list acceptable  
- [x] Kill-switch default off is acceptable  
- [x] Samsung HTTPS/tunnel path clear  
- [x] Acceptance + re-certify language clear  
- [x] Adapter boundary — browser APIs never escape `studio-guide-speech.ts`  
- [x] Performance Doctrine  
- [x] Dev-only observability (not analytics)  
- [x] Product acceptance criteria (one conversation / one field / customer in control / rhythm)  
- [ ] Nothing quietly expands into AI understanding or a second conversation mode  

**Awaiting Tagia:** upgrade this plan to **Approved** to authorize Package 1 implementation under these exact boundaries.
