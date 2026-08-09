/**
 * KITCHEN-PRODUCTION-CERT-VOICE-1 — synthetic listening certification fixture.
 * CERTIFICATION FIXTURE / INTERNAL TEST / NOT CUSTOMER DELIVERABLE
 */

export const CERT_VOICE_PACKAGE_ID = "KITCHEN-PRODUCTION-CERT-VOICE-1" as const;

export const CERT_VOICE_FIXTURE_LABEL =
  "CERTIFICATION FIXTURE / INTERNAL TEST / NOT CUSTOMER DELIVERABLE" as const;

export const CERT_VOICE_CAMPAIGN_ID = "cert-voice-1-cedar-lane" as const;

export const CERT_VOICE_SCRIPT_VERSION_ID = "cert-voice-script-v1" as const;

export const CERT_VOICE_TESTED_SKUS = ["ap-001", "v2-rtu-voice"] as const;

export const CERT_VOICE_ARTIFACT_ROOT =
  "docs/launch/kitchen-production-cert-voice-1/artifacts" as const;

export const CERT_VOICE_PROVIDER = {
  provider: "elevenlabs" as const,
  modelId: "eleven_multilingual_v2",
  outputFormat: "mp3_44100_128" as const,
  /** Deterministic approved candidate — not quality-certified by ID alone. */
  voiceId: "21m00Tcm4TlvDq8ikWAM",
};

/**
 * Customer-facing approved script (conventional writing).
 * Word count must stay ≤300.
 */
export const CERT_VOICE_APPROVED_SCRIPT = [
  "CERTIFICATION FIXTURE / INTERNAL TEST / NOT CUSTOMER DELIVERABLE.",
  "Hello — this is Mira Chen at Cedar Lane Studio.",
  "Book your Portrait Refresh for ninety-nine dollars before May third, twenty twenty-six.",
  "Sessions begin at ten thirty in the morning.",
  "Call five five five, zero one eight, four four two one,",
  "or visit cedar-lane-studio.example/book.",
  "Ask for the HVAC Quinoa Lighting Add-On if you need the pronunciation check.",
  "Please — don’t wait until the last weekend.",
  "Reserve your Portrait Refresh today.",
].join(" ");

/**
 * Exact generation script — production-safe pronunciation treatment.
 * Differs from approved script only where spoken form must be locked.
 */
export const CERT_VOICE_GENERATION_SCRIPT = [
  "CERTIFICATION FIXTURE / INTERNAL TEST / NOT CUSTOMER DELIVERABLE.",
  "Hello — this is Mira Chen at Cedar Lane Studio.",
  "Book your Portrait Refresh for ninety-nine dollars before May third, twenty twenty-six.",
  "Sessions begin at ten thirty in the morning.",
  "Call five five five, zero one eight, four four two one,",
  "or visit cedar lane studio dot example slash book.",
  "Ask for the H V A C keen-wah Lighting Add-On if you need the pronunciation check.",
  "Please — don’t wait until the last weekend.",
  "Reserve your Portrait Refresh today.",
].join(" ");

export const CERT_VOICE_PRONUNCIATION_NOTES = {
  businessName: "Cedar Lane Studio — natural stress on Cedar",
  personName: "Mira Chen — MEER-uh Chen",
  serviceName: "Portrait Refresh — natural compound stress",
  price: "ninety-nine dollars (spoken; not '99')",
  date: "May third, twenty twenty-six",
  time: "ten thirty in the morning",
  phoneSpoken: "five five five, zero one eight, four four two one",
  phoneDisplay: "(555) 018-4421",
  urlSpoken: "cedar lane studio dot example slash book",
  urlDisplay: "cedar-lane-studio.example/book",
  acronym: "HVAC → spoken as H V A C (letters)",
  sensitiveWord: "Quinoa → keen-wah",
  emphasisSentence: "Please — don’t wait until the last weekend.",
  cta: "Reserve your Portrait Refresh today.",
} as const;

export function countScriptWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function certVoiceScriptDiffSummary(): {
  identical: false;
  differences: readonly string[];
} {
  return {
    identical: false,
    differences: [
      "URL: approved uses 'cedar-lane-studio.example/book'; generation speaks 'cedar lane studio dot example slash book'",
      "Acronym: approved uses 'HVAC'; generation speaks 'H V A C'",
      "Sensitive word: approved uses 'Quinoa'; generation speaks 'keen-wah'",
    ],
  };
}
