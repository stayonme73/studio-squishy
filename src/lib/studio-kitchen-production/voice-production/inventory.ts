/**
 * KITCHEN-VOICE-INTEGRATION-1 — audio capability inventory after ElevenLabs adapter.
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

/** Inventory at KITCHEN-VOICE-INTEGRATION-1 (base seal voice-production 48d61c4). */
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
      "Free browser TTS for customer-facing Studio presence playback. Does not export MP3/WAV deliverables. Untouched by voice integration.",
  },
  {
    id: "ai_voice_tool_contract",
    label: "Production contract primaryTool ai_voice_tool → ElevenLabs TTS",
    classification: "integration_required",
    evidencePaths: [
      "src/lib/studio-kitchen-production/family-baselines.ts",
      "src/lib/studio-kitchen-production/sku-overrides.ts",
      "src/lib/studio-kitchen-production/voice-production/generate.ts",
    ],
    notes:
      "partial_adapter wired to ElevenLabs Text-to-Speech API. MP3 path CUSTOMER READY WITH LIMITS after listening cert; WAV UNVERIFIED. Runtime requires ELEVENLABS_API_KEY.",
  },
  {
    id: "elevenlabs_tts_api",
    label: "ElevenLabs Text-to-Speech REST adapter",
    classification: "present_and_usable",
    evidencePaths: [
      "src/lib/studio-kitchen-production/voice-production/elevenlabs/",
      "src/lib/studio-kitchen-production/voice-production/generate.ts",
      "docs/launch/kitchen-production-cert-voice-1/",
    ],
    notes:
      "MP3 generation/export live-proven and listening-certified. WAV capability still unverified. Not ElevenLabs Studio product. Not beta services.",
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
    id: "shotstack_named_for_video",
    label: "Shotstack (active short-video tool; CapCut CLOSED historical)",
    classification: "present_but_not_exportable",
    evidencePaths: ["src/lib/studio-kitchen-production/sku-overrides.ts"],
    notes:
      "Shotstack is the active short-video producer. CapCut is CLOSED / historical only. Neither path is used for audio-only voice SKUs.",
  },
] as const;

export function summarizeVoiceAudioInventory(): {
  canGenerateCustomerDeliverableAudio: boolean;
  canExportMp3OrWavFromStudioStack: boolean;
  studioVoiceUntouched: true;
  provider: "elevenlabs";
  blockingGap: string;
  findings: readonly AudioCapabilityFinding[];
} {
  const keyPresent = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  return {
    canGenerateCustomerDeliverableAudio: keyPresent,
    canExportMp3OrWavFromStudioStack: keyPresent,
    studioVoiceUntouched: true,
    provider: "elevenlabs",
    blockingGap: keyPresent
      ? "MP3 path certified with limits; WAV remains UNVERIFIED / not currently offered (post-launch enhancement)."
      : "ELEVENLABS_API_KEY absent. Adapter is built; live generation blocked until server-side key is configured (never paste into chat).",
    findings: VOICE_AUDIO_CAPABILITY_INVENTORY,
  };
}
