import type { MaterialUseAuthorizationBasis, StudioMaterialUseOutcome } from "@/config/studio-material-use-v1";
import type { MaterialCategory, MaterialSubmittedBy } from "@/lib/materials/types";

export type MaterialUseBlockCode =
  | "not_submitted"
  | "submitted_not_cleared"
  | "clarification_pending"
  | "owner_policy_pending"
  | "blocked"
  | "hard_block_signal"
  | "missing_authorization"
  | "content_replaced";

export type MaterialUseAuthorization = {
  basis: MaterialUseAuthorizationBasis;
  attestedAt: string;
  attestedBy?: MaterialSubmittedBy;
  /** Short operational statement — not a legal affidavit dump. */
  statement?: string;
};

export type MaterialUseDecision = {
  decisionId: string;
  schemaVersion: number;
  packageId: string;
  materialId: string;
  campaignId: string;
  category: MaterialCategory;
  outcome: StudioMaterialUseOutcome;
  authorizationBasis: MaterialUseAuthorizationBasis | null;
  /** Bound content identity — prior approval must not authorize a replaced payload. */
  contentFingerprint: string;
  blockCodes: readonly MaterialUseBlockCode[];
  reasons: readonly string[];
  customerPrompt: string | null;
  escalationTarget: "none" | "owner_policy";
  evaluatedAt: string;
};
