/**
 * Session-limited Studio Voice conversation.
 * The model may phrase a reply. It may not invent a Studio fact.
 */

export const STUDIO_VOICE_DISCLOSURE =
  "I'm Studio Voice, The Studio's AI assistant.";

/** Twelve customer lines, each with the verified reply. */
export const STUDIO_VOICE_EXCHANGE_LIMIT = 12;

export const STUDIO_VOICE_QUESTION_LIMIT = 800;

export const STUDIO_VOICE_TURN_TEXT_LIMIT = 600;

export type StudioVoiceSessionTurn = {
  role: "customer" | "studio";
  text: string;
};

export type StudioVoiceIntent =
  | "answer"
  | "follow_up"
  | "confusion"
  | "frustration"
  | "topic_change"
  | "off_topic"
  | "complaint"
  | "refund";

export type StudioVoiceClaim =
  | {
      type: "package_price";
      packageId: string;
      listCents: number;
      dueCents: number;
    }
  | { type: "no_delivery_promise" }
  | { type: "files_after_checkout" }
  | { type: "production_requires_acceptance" }
  | { type: "revision_rounds"; rounds: number }
  | { type: "extras_included" }
  | { type: "no_performance_guarantee" }
  | { type: "refund_not_decided" }
  | { type: "outside_studio_knowledge" };

export type StudioVoiceDraft = {
  say: string;
  intent: StudioVoiceIntent;
  claims: StudioVoiceClaim[];
};
