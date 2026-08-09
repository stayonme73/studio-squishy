# KITCHEN-VOICE-INTEGRATION-1 REPORT

**Status:** READY FOR OWNER REVIEW  
**Scout:** PARKED  
**Do not commit. Do not push.**  
**Do not certify voice. Do not mark customer ready.**

---

## 1. Starting Control Point

| Seal | Tip |
|------|-----|
| KITCHEN-FOUNDATION-1 | `c640e8c` |
| KITCHEN-COMMS-1 | `d926a23` |
| KITCHEN-PRODUCTION-CAPABILITY-1 | `9083bf4` |
| KITCHEN-PRODUCTION-CERT-COPY-1 | `cfff55d` |
| KITCHEN-PRODUCTION-CERT-DESIGN-1 | `664af4c` |
| KITCHEN-VOICE-PRODUCTION-1 | `48d61c4` |

Branch: `kitchen/voice-integration-1` from `48d61c4`.

Original 108-entry dirty WIP remains protected and untouched.

---

## 2. Provider Configuration

| Item | Value |
|------|-------|
| Provider | **ElevenLabs Text-to-Speech API** |
| Endpoint | `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` |
| Auth header | `xi-api-key` from server `ELEVENLABS_API_KEY` |
| Default model | `eleven_multilingual_v2` |
| Voice selection | Deterministic approved config (`ELEVENLABS_VOICE_ID` or default candidate ID) |
| Not used | ElevenLabs Studio UI, browser speechSynthesis, CapCut, OpenAI audio, Google TTS, beta services |

Kitchen entry point: `generateVoiceArtifact(...)`.

---

## 3. Account / Output Capability

**Credentials at package runtime:** **ABSENT** (no `.env` / `.env.local` with `ELEVENLABS_API_KEY`).

| Output | Truth |
|--------|-------|
| **MP3** | **PROVEN live** via `mp3_44100_128` internal generation (see §10). |
| **WAV** | **UNVERIFIED.** Restricted key lacks `user_read`; subscription tier not discovered. Do not infer WAV from MP3 success. Catalog promise unchanged. |
| Catalog promise | Still MP3 **or** WAV — **not silently changed**. |
| Contract discrepancy | Deferred to certification/customer-readiness decision — not papered over in this package. |

Commercial-use note (from ElevenLabs docs, not a license grant from this package): paid plans include commercial license for non-Beta Services when the user holds rights to underlying content. Confirm active paid plan before customer production.

---

## 4. Integration Architecture

```
approved script + scriptVersionId
  → generateVoiceArtifact (SKU + format validation)
  → ElevenLabs TTS REST (server fetch)
  → persist exact bytes
  → SHA-256 + bind campaign/SKU/scriptVersionId
  → kitchenState: qa_ready
  → (listening QA later — not auto-pass)
```

Modules:

- `voice-production/elevenlabs/` — config, client, capability discovery
- `voice-production/generate.ts` — Kitchen boundary
- `voice-production/persist.ts` — artifact write + hash
- Tool ref `ai_voice_tool` → `partial_adapter` (ElevenLabs)

No second workflow / event store.

---

## 5. Credential Isolation

- Key read only via `process.env.ELEVENLABS_API_KEY` on server modules.
- Documented in `.env.example` (empty).
- `redactSecretsForEvidence` strips secret-like fields.
- Tests assert key material does not appear in result JSON.
- Not in browser, URLs, campaign records, or artifact metadata.

---

## 6. Generation Flow

`generateVoiceArtifact` validates:

- voice SKU only (`ap-001`, `v2-rtu-voice`)
- script present + ≤300 words
- `scriptVersionId` required
- format `mp3` \| `wav`
- credentials present
- account capability for requested format

On success: persists file, returns evidence, **`qaPassed: false`**, **`customerReady: false`**.

---

## 7. Artifact Persistence + Hash Binding

Root: `docs/launch/kitchen-voice-integration-1/artifacts/{campaignId}/`

Bound fields: path, SHA-256, scriptVersionId, SKU, campaignId, format, provider voice/model IDs, optional request id, `qaState: qa_ready`.

Provider response metadata alone is never treated as the artifact.

Sealed prior fixture remains non-deliverable and is not reused as generation proof.

---

## 8. Kitchen State Integration

Representable states: script ready · generation pending · generation failed · audio generated · QA ready · QA correction required · QA pass · review ready.

Projection never invents an artifact. Generation success ≠ QA pass.

---

## 9. Failure / Retry Behavior

Distinguished codes: `credentials_absent`, `configuration_failure`, `provider_network_failure`, `rate_or_usage_failure`, `invalid_request`, `unsupported_output`, `empty_audio`, `persistence_failure`, `script_invalid`, `script_version_missing`, `capability_unavailable`.

No fake `.mp3` on failure. Routine failures remain operational (`owner_not_required`).

---

## 10. Live Internal Generation

**PERFORMED — SUCCESS**

| Field | Value |
|-------|-------|
| Label | INTERNAL PRODUCTION TEST — NOT CUSTOMER DELIVERABLE |
| Path | `docs/launch/kitchen-voice-integration-1/artifacts/voice-int-live-fixture/ap-001_voice-int-live-script-v1_48fbafa29e3e.mp3` |
| Bytes | 412151 |
| SHA-256 | `48fbafa29e3eb334519facfc4cc18446ace8b5496ceccf6228a46aaa152d7efe` |
| Provider | elevenlabs |
| Model | `eleven_multilingual_v2` |
| Voice ID | `21m00Tcm4TlvDq8ikWAM` |
| Format | `mp3_44100_128` |
| scriptVersionId | `voice-int-live-script-v1` |
| Campaign / SKU | `voice-int-live-fixture` / `ap-001` |
| Kitchen state | `qa_ready` |
| qaPassed | false |
| Playability | MPEG framing verified (not listening certification) |
| Discovery mode | `live_partial` (key lacks `user_read` / voices-list; TTS permitted — least privilege preserved) |

Evidence detail: `LIVE-INTERNAL-GENERATION.md`.

---

## 11. QA Boundary

Confirmed:

- Generation success → **QA ready**, not QA pass
- Deterministic binding/format/script checks remain
- Listening judgment (pronunciation, pacing, naturalness, intelligibility, clipping, silence, volume) **not** claimed by this package
- Sealed voice QA gate not weakened (`defaultVoiceAudioBrief` still `integration_required` until production brief opts into `present_and_usable` with live capability)

---

## 12. Voice SKU Status

| SKU | Status |
|-----|--------|
| `ap-001` | **CONTRACT READY — INTEGRATION REQUIRED / NOT CUSTOMER READY** |
| `v2-rtu-voice` | **CONTRACT READY — INTEGRATION REQUIRED / NOT CUSTOMER READY** |

No listening certification. No menu/pricing/scope change.

---

## 13. Tests

| File | Result |
|------|--------|
| `voice-live-internal.test.ts` | 1 passed (live) |
| `voice-integration.test.ts` | 16 passed |
| `voice-production.test.ts` | 13 passed |
| `production-capability.test.ts` | 12 passed |

**42/42** in this suite.

Covers: live MP3 generation+binding, ElevenLabs path resolve, 300-word reject, missing script version, absent credentials, provider error, empty audio, persist+hash+association, WAV unsupported/unknown, `live_partial` discovery, secret redaction, owner_not_required, fixture/Studio Voice untouched, unrelated SKUs not certified.

---

## 14. Backtrack Impact

None to sealed Copy/Design/Customer-One. Studio Voice untouched. Voice-production QA philosophy preserved. Capability matrix updated only for voice tool `partial_adapter` honesty.

---

## 15. Exact Next Package

MP3 generation/export is operational (live-proven).

**Exact next (Owner-authorized, not executed here):**

**KITCHEN-PRODUCTION-CERT-VOICE-1** — listening certification against the exact hash-bound artifact (ears required). Must also resolve **WAV UNVERIFIED** before either SKU becomes CUSTOMER READY. Do not treat MP3 success as full MP3/WAV contract proof.

---

## 16. Git State

See seal report after commit/push authorization.

---

READY FOR OWNER REVIEW → SEAL AUTHORIZED

