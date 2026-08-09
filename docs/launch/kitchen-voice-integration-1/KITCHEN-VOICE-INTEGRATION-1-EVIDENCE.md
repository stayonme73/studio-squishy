# KITCHEN-VOICE-INTEGRATION-1 — Evidence

**Status:** Generation/export integration (NOT voice quality certification)  
**Label:** INTERNAL PRODUCTION TEST — NOT CUSTOMER DELIVERABLE  
**Base tip:** KITCHEN-VOICE-PRODUCTION-1 (`48d61c4`)  
**Provider:** ElevenLabs Text-to-Speech API (not ElevenLabs Studio UI)

---

## In-scope SKUs

`ap-001`, `v2-rtu-voice`

Both remain **CONTRACT READY — INTEGRATION REQUIRED / NOT CUSTOMER READY**.

---

## Provider decision

| Decision | Value |
|----------|-------|
| API | `POST /v1/text-to-speech/{voice_id}` |
| Auth | Server-side `ELEVENLABS_API_KEY` (`xi-api-key` header) |
| Default model | `eleven_multilingual_v2` |
| Default voice ID | Candidate only (`21m00Tcm4TlvDq8ikWAM` / env override) — **not certified** |
| Forbidden | Browser speechSynthesis, CapCut, OpenAI audio, Google TTS, ElevenLabs Studio UI dependency, beta services |

---

## Credentials / configuration

Documented in `.env.example` (values never committed):

```
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

Server-side only. Never browser, never campaign records, never artifact metadata, never error responses.

---

## Live internal generation

**PERFORMED — SUCCESS** (MP3 only).

See `LIVE-INTERNAL-GENERATION.md` for path, bytes, SHA-256, provider/model/voice.

**WAV:** UNVERIFIED (restricted key / no subscription discovery). Do not claim WAV from MP3 success.

**Discovery:** `live_partial` — do not expand API-key permissions merely for `user_read` / voices-list.

---

## Sealed binding fixture (prior package)

`docs/launch/kitchen-voice-production-1/artifacts/binding-fixture-not-a-deliverable.bin.mp3`

Remains **INTERNAL TEST / NOT A CUSTOMER DELIVERABLE**. Not reused as generation success proof.

---

## QA boundary

`generateVoiceArtifact` success → `kitchenState: qa_ready`, `qaPassed: false`, `customerReady: false`.

Listening certification is a later package.
