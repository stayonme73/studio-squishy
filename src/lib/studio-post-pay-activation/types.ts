import type {
  PostPayActivationPhase,
  PostPayActivationStatus,
} from "@/config/studio-post-pay-activation-v1";
import type { CampaignRecord } from "@/config/studio-board";

/**
 * Durable post-pay activation truth on the Campaign Record.
 * Written only by server confirm / ensure — never by client sync.
 */
export type PostPayActivationRecord = {
  schemaVersion: 1;
  status: PostPayActivationStatus;
  phase: PostPayActivationPhase;
  /** First successful materialization time (stable across idempotent retries). */
  activatedAt: string;
  lastAttemptAt: string;
  checkoutSessionId: string;
  paymentIntentId?: string | null;
  stripeEventId?: string | null;
  jobIds: readonly string[];
  taskCount: number;
  intakeComplete: boolean;
  blockingRequiredMaterialsCount: number;
  /** Always false for routine payment → activation. */
  ownerActionRequired: false;
  lastError?: string | null;
};

export type PostPayActivationResult =
  | {
      ok: true;
      campaign: CampaignRecord;
      activation: PostPayActivationRecord;
      alreadyActivated: boolean;
    }
  | {
      ok: false;
      campaign: CampaignRecord;
      activation: PostPayActivationRecord | null;
      error: "payment_not_confirmed" | "activation_failed";
      message: string;
    };
