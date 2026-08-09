# KITCHEN-VOICE-PRODUCTION-1 REPORT

**Status:** READY FOR OWNER REVIEW  
**Scout:** PARKED  
**Do not commit. Do not push.**  
**Do not certify voice.**

---

## 1. Starting Control Point

| Seal | Tip |
|------|-----|
| KITCHEN-FOUNDATION-1 | `c640e8c` |
| KITCHEN-COMMS-1 | `d926a23` |
| KITCHEN-PRODUCTION-CAPABILITY-1 | `9083bf4` |
| KITCHEN-PRODUCTION-CERT-COPY-1 | `cfff55d` |
| KITCHEN-PRODUCTION-CERT-DESIGN-1 | `664af4c` |

Branch: `kitchen/voice-production-1` from design seal `664af4c`.

Original 108-entry dirty WIP remains protected and untouched (separate porcelain).

---

## 2. Existing Audio Capability Inventory

| Finding | Classification |
|---------|----------------|
| Browser `speechSynthesis` (Studio Voice / Conversation Room / Lobby) | **PRESENT BUT NOT EXPORTABLE** |
| Production contract `ai_voice_tool` | **INTEGRATION REQUIRED** (`not_integrated`) |
| ElevenLabs / OpenAI `/v1/audio` / cloud TTS SDK in repo | **UNSUPPORTED** |
| Materials intake accepts `.mp3`/`.wav` | **PRESENT BUT NOT EXPORTABLE** (intake only) |
| CapCut | **INTEGRATION REQUIRED** — video tool; not claimed for audio-only |

**Verdict:** The Studio stack cannot currently generate or export a customer-deliverable MP3/WAV for voice SKUs.

Studio Voice browser speech ≠ customer voice-over production.

---

## 3. Voice SKU Contract Truth

Preserved (not expanded):

| SKU | Script limit | Formats | Outputs | Tool state | Readiness |
|-----|--------------|---------|---------|------------|-----------|
| `ap-001` | ≤300 words | MP3 or WAV | One AI voice-over track (one style, one language); scriptwriting not included | `not_integrated` | `contract_ready_integration_required` |
| `v2-rtu-voice` | ≤300 words | Audio track (+ short script when needed) | Client distributes; Studio QC before delivery | `not_integrated` | `contract_ready_integration_required` |

Revision: one round. Exclusions (cloning, celebrity imitation, human talent, multi-speaker, translations, music/advanced mixing, >300 words) preserved via catalog + overrides.

---

## 4. Proposed/Implemented Production Chain

Defined in `VOICE_PRODUCTION_CHAIN` (existing roles only):

| Step | Owner | Kitchen label | Status |
|------|-------|---------------|--------|
| Script ready | copy | script ready | defined |
| Script validation | qa | script validation | defined |
| Approved final script | creative_production | approved final script | defined |
| Voice generation | creative_production | audio production started | **integration_required** |
| Audio QA | qa | QA ready | ready_when_file_exists |
| Correction / regeneration | creative_production | QA fail / correction | **integration_required** |
| Export | creative_production | audio artifact produced | **integration_required** |
| File registration | system | file registered | defined (binding model) |
| Review / delivery | producer_dispatcher | review ready | ready_when_file_exists |

No second workflow. No new roles.

---

## 5. Production Tool Finding

**What generates the audio:** Nothing approved and wired.

- Contract names `ai_voice_tool` as required.
- Integration state: `not_integrated`.
- No vendor was invented or added.
- CapCut is not used for audio-only voice SKUs.
- Browser TTS remains Studio presence only.

---

## 6. Export / File Capability

**MP3/WAV truth:** Catalog promises MP3 or WAV. The Studio stack has **no export path** that produces those deliverables from an approved script.

Materials UI can *accept* uploads — that is not Studio production export.

---

## 7. Audio QA Model

Runtime gate: `src/lib/studio-kitchen-production/voice-production/`

Wired into `applyQaPass` for voice SKUs on `video_audio` creative/qa phases (`requiresAudioQualityGate`).

**Deterministic (code):**
- script required + ≤300 words
- scriptVersionId present
- generation capability not `integration_required`
- artifact path exists on disk
- extension in `{mp3,wav}`
- contentSha256 matches bytes
- scriptVersionId binding
- refuse phantom / empty files

**Listening judgment (human attestation — required, not metadata-only):**
- exact script fidelity
- pronunciation (names/brands/numbers)
- pacing / naturalness
- intelligibility
- artifacts / clipping / silence
- notes must reference bound hash/path

While generation is unwired, QA pass fails honestly even if a binding fixture file is present.

---

## 8. Artifact Binding

Same philosophy as Design Certification:

production record ↔ audio path ↔ SHA-256 ↔ scriptVersionId ↔ QA evidence

Helpers: `registerBoundAudioArtifact`, `evaluateAudioArtifactBindings`, `sha256AudioFile*`.

Binding fixture (not a deliverable):  
`docs/launch/kitchen-voice-production-1/artifacts/binding-fixture-not-a-deliverable.bin.mp3`

---

## 9. Kitchen / Comms Integration

- Kitchen state labels projected via `projectVoiceKitchenStates` / `resolveClaimableVoiceKitchenLabels`.
- Read-only projection **cannot** claim “audio artifact produced” or invent `.mp3`/`.wav`/hash fields.
- Comms ledger reuse unchanged; routine QA fail remains `owner_not_required`.
- Escalation doctrine updated to name routine audio correction under producer/QA (not Tagia).

---

## 10. Owner Escalation

Routine pronunciation / pacing / regeneration / audio-quality correction:

**Producer → QA → Producer → QA** (`owner_not_required`)

Escalate only genuine owner/business exceptions under existing authority (scope, refund, compliance, revision exhausted, etc.).

---

## 11. Missing Capability

Required before real audio testing / certification:

1. Tagia-approved voice generation vendor **or** explicit manual-operational production SOP (without inventing a silent vendor).
2. Wired generation → MP3/WAV export that produces real files.
3. Credentials/configuration for that approved path.
4. Commercial-use / licensing confirmation for the chosen voice engine.
5. Then: listening certification package against **actual** audio (not metadata, not browser TTS).

---

## 12. Customer-Readiness Status

**NOT CUSTOMER READY.**  
**NOT CERTIFIED.**

Both voice SKUs remain `contract_ready_integration_required`.

No production listening test occurred. No fake readiness claim.

---

## 13. Backtrack Impact

None to sealed packages. Copy/Design certification untouched. Studio Voice untouched. Customer-One untouched. 108 WIP untouched.

Additive: voice-production module + QA wiring + evidence/report docs.

---

## 14. Exact Recommended Next Package

**KITCHEN-VOICE-PRODUCTION-INTEGRATION-1** (or owner-named equivalent): choose and wire a Tagia-approved generation/export path so real MP3/WAV files can be produced.

Only after that path is operational:

**KITCHEN-PRODUCTION-CERT-VOICE-1** — real listening certification against bound audio artifacts (same bar as copy text + design PNGs).

Do **not** execute either next package in this turn.

---

## 15. Tests

`src/lib/studio-kitchen-production/voice-production/voice-production.test.ts` — **13 passed**

Covers: SKU resolve, inventory honesty, word limit, phantom file refusal, artifact binding, integration_required fail, qa_pass requires audioQuality, qa_pass blocked while unwired, owner_not_required correction, read-only projection invents no artifact, Studio Voice files remain present, binding machinery unit path when capability explicitly authorized (not certification).

---

## 16. Git State

- Branch: `kitchen/voice-production-1`
- HEAD: `664af4c` (design seal; uncommitted package on top)
- Modified: `actions.ts`, `qa.ts`, `types.ts`, `studio-kitchen-production/index.ts`, `resolve-contract.ts`
- Untracked: `src/lib/studio-kitchen-production/voice-production/`, `docs/launch/kitchen-voice-production-1/`
- Studio Voice / Conversation Room speech files: **not modified**
- Copy/Design cert trees: **not modified**
- **Do not commit. Do not push.**

---

READY FOR OWNER REVIEW

Scout PARKED.
