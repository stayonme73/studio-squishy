/**
 * KITCHEN-VOICE-PRODUCTION-1 — honest inventory of audio generation/export capability.
 * Studio Voice browser TTS ≠ customer voice-over deliverable production.
 */

export type AudioCapabilityClass =
  | "present_and_usable"
  | "present_but_not_exportable"
  | "integration_required"
  | "unsupported";

export type AudioCapabilityFinding = {
  id: string;
  label: string;
  classification: AudioCapabilityClass;
  evidencePaths: readonly string[];
  notes: string;
};

/** Inventory at KITCHEN-VOICE-PRODUCTION-1 control tip (design seal 664af4c). */
export const VOICE_AUDIO_CAPABILITY_INVENTORY: readonly AudioCapabilityFinding[] = [
  {
    id: "browser_speech_synthesis",
    label: "Browser speechSynthesis (Studio Voice / Conversation Room / Lobby guidance)",
    classification: "present_but_not_exportable",
    evidencePaths: [
      "src/lib/studio-conversation-speech.ts",
      "src/config/studio-browser-voice-v1.ts",
      "src/lib/studio-lobby-podium-guidance.ts",
    ],
    notes:
      "Free browser TTS for customer-facing Studio presence playback. Does not export MP3/WAV deliverables. Tagia direction: stay on browser voices for launch Studio Voice — not a production vendor chain.",
  },
  {
    id: "ai_voice_tool_contract",
    label: "Production contract primaryTool ai_voice_tool",
    classification: "integration_required",
    evidencePaths: [
      "src/lib/studio-kitchen-production/family-baselines.ts",
      "src/lib/studio-kitchen-production/sku-overrides.ts",
    ],
    notes:
      "Named as required for ap-001 / v2-rtu-voice. integrationState=not_integrated. No Kitchen vendor chain wired. Do not invent a vendor.",
  },
  {
    id: "elevenlabs_or_cloud_tts_sdk",
    label: "Cloud TTS / ElevenLabs / OpenAI audio SDK in repo",
    classification: "unsupported",
    evidencePaths: [],
    notes:
      "No ElevenLabs, OpenAI /v1/audio, or equivalent production TTS SDK/credentials path found for customer deliverable export.",
  },
  {
    id: "materials_audio_upload_accept",
    label: "Materials intake accepts .mp3/.wav upload types",
    classification: "present_but_not_exportable",
    evidencePaths: [
      "src/components/materials/MaterialsIntakePanel.tsx",
      "src/components/project-details/ProjectDetailsFileUpload.tsx",
    ],
    notes:
      "UI can accept audio files as materials. That is storage/intake acceptance — not Studio generation or production export.",
  },
  {
    id: "capcut_named_for_video",
    label: "CapCut (named for short video, not audio-only)",
    classification: "integration_required",
    evidencePaths: ["src/lib/studio-kitchen-production/sku-overrides.ts"],
    notes:
      "CapCut is the named short-video tool and is not integrated. Capability package forbids claiming CapCut for audio-only voice SKUs.",
  },
] as const;

export function summarizeVoiceAudioInventory(): {
  canGenerateCustomerDeliverableAudio: false;
  canExportMp3OrWavFromStudioStack: false;
  studioVoiceUntouched: true;
  blockingGap: string;
  findings: readonly AudioCapabilityFinding[];
} {
  return {
    canGenerateCustomerDeliverableAudio: false,
    canExportMp3OrWavFromStudioStack: false,
    studioVoiceUntouched: true,
    blockingGap:
      "No approved, wired AI voice generation → MP3/WAV export chain exists in The Studio stack. Voice SKUs remain contract_ready_integration_required until a Tagia-approved vendor/path is integrated or an explicit manual-operational production SOP is authorized without inventing a vendor.",
    findings: VOICE_AUDIO_CAPABILITY_INVENTORY,
  };
}
