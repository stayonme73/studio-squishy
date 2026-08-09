# KITCHEN-VOICE-PRODUCTION-1 — Evidence

**Status:** Production-path readiness (NOT voice quality certification)  
**Label:** PRODUCTION PATH FIXTURE / INTERNAL TEST — NOT CERTIFIED  
**Base tip:** KITCHEN-PRODUCTION-CERT-DESIGN-1 (`664af4c`)

---

## In-scope SKUs (no certification)

`ap-001`, `v2-rtu-voice`

Do **not** treat this package as CUSTOMER READY for voice.

---

## Inventory finding (tool truth)

| Capability | Classification |
|------------|----------------|
| Browser `speechSynthesis` (Studio Voice) | PRESENT BUT NOT EXPORTABLE |
| Contract `ai_voice_tool` | INTEGRATION REQUIRED |
| Cloud TTS / ElevenLabs / OpenAI audio SDK | UNSUPPORTED |
| Materials `.mp3`/`.wav` upload accept | PRESENT BUT NOT EXPORTABLE |
| CapCut (video) | INTEGRATION REQUIRED — not for audio-only |

**What generates the audio today:** Nothing wired in The Studio stack for customer deliverable MP3/WAV.

Studio Voice browser playback ≠ customer voice-over production.

---

## Artifact binding fixture

Root: `docs/launch/kitchen-voice-production-1/artifacts/`

**Label:** INTERNAL TEST / NOT A CUSTOMER DELIVERABLE

| File | Role |
|------|------|
| `binding-fixture-not-a-deliverable.bin.mp3` | Bytes-only binding proof for path + SHA-256 + scriptVersionId. **INTERNAL TEST / NOT A CUSTOMER DELIVERABLE.** Not listening-quality proof. Not Studio-generated speech. Must never be surfaced as production proof that The Studio can generate audio. |

---

## Runtime audio QA gate

`src/lib/studio-kitchen-production/voice-production/`

For voice SKUs on `video_audio` creative/qa phases:

checklist alone is **not** sufficient.

Requires: approved script + bound artifact evidence + deterministic checks + recorded listening judgment notes.

While `generationCapability=integration_required`, QA pass fails honestly.

---

## Studio Voice boundary

No changes to Conversation Room / Lobby browser TTS. This package does not wire Studio Voice into deliverable production.
