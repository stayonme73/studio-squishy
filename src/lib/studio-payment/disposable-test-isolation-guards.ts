import type { CampaignRecord } from "@/config/studio-board";
import { DESIGN_RENDERER_PROMO_SKU } from "@/lib/studio-design-renderer/promo-types";
import { DESIGN_RENDERER_SOCIAL_POSTS_SKU } from "@/lib/studio-design-renderer/social-posts-types";
import {
  disposableKitTestMustStayIsolated,
  skipsProductionForDisposableKitTest,
} from "./disposable-kit-test-isolation";
import {
  disposableSocialPromoCertBlocksBillableProviders,
  disposableSocialPromoCertBlocksOperatingChain,
  isDisposableSocialPromoCert,
  parseSocialPromoCertIsolation,
} from "./disposable-social-promo-cert-isolation";

export const DISPOSABLE_SP_CERT_RENDERER_LANE_BLOCKED =
  "disposable_sp_cert_renderer_lane_blocked" as const;

export function disposableTestCampaignCarriesMarker(campaign: CampaignRecord): boolean {
  return (
    disposableKitTestMustStayIsolated(campaign) || isDisposableSocialPromoCert(campaign)
  );
}

export function disposableTestOperatingChainBlocked(
  campaign: CampaignRecord,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (disposableKitTestMustStayIsolated(campaign)) return true;
  return disposableSocialPromoCertBlocksOperatingChain(campaign, env);
}

export function disposableTestCampaignBlocksCustomerEmails(
  campaign: CampaignRecord,
): boolean {
  if (disposableKitTestMustStayIsolated(campaign)) return true;
  const parsed = parseSocialPromoCertIsolation(campaign);
  return parsed.kind === "prepared" || parsed.kind === "armed" || parsed.kind === "invalid";
}

export type DispatchIsolationBlock = {
  error: "disposable_test_isolation";
  message: string;
};

export function resolveDispatchExecutionIsolationBlock(
  campaign: CampaignRecord,
  env: NodeJS.ProcessEnv = process.env,
): DispatchIsolationBlock | null {
  if (disposableKitTestMustStayIsolated(campaign)) {
    return {
      error: "disposable_test_isolation",
      message: "Disposable Campaign Launch Kit test projects stay isolated from dispatch.",
    };
  }
  if (skipsProductionForDisposableKitTest(campaign, env)) {
    return {
      error: "disposable_test_isolation",
      message: "Disposable Campaign Launch Kit test projects stay isolated from dispatch.",
    };
  }
  const parsed = parseSocialPromoCertIsolation(campaign);
  if (parsed.kind === "invalid") {
    return {
      error: "disposable_test_isolation",
      message:
        "Social & Promo cert isolation is missing or invalid — dispatch is blocked.",
    };
  }
  if (parsed.kind === "prepared") {
    return {
      error: "disposable_test_isolation",
      message:
        "Social & Promo cert project is prepared only — dispatch stays blocked until Owner arms it.",
    };
  }
  if (parsed.kind === "armed" && disposableSocialPromoCertBlocksOperatingChain(campaign, env)) {
    return {
      error: "disposable_test_isolation",
      message: "Social & Promo cert project cannot dispatch in this environment.",
    };
  }
  return null;
}

export function resolveDesignRendererPreferAnthropic(
  campaign: CampaignRecord,
  wouldPrefer: boolean,
): boolean {
  if (disposableSocialPromoCertBlocksBillableProviders(campaign)) return false;
  return wouldPrefer;
}

export const DISPOSABLE_SP_CERT_BILLABLE_BLOCKED = "DISPOSABLE_SP_CERT_BILLABLE_BLOCKED" as const;

const DISPOSABLE_SP_CERT_ALLOWED_RENDERER_SKUS = new Set<string>([
  DESIGN_RENDERER_SOCIAL_POSTS_SKU,
  DESIGN_RENDERER_PROMO_SKU,
]);

/**
 * Central design-renderer observer boundary for Social & Promo cert campaigns.
 * Only social-posts and promotion-graphics hooks may invoke; all other SKUs skip.
 */
export function disposableSpCertDesignRendererSkuGate(
  campaign: CampaignRecord,
  skuId: string,
): { allowed: true } | { allowed: false; skipReason: typeof DISPOSABLE_SP_CERT_RENDERER_LANE_BLOCKED } {
  if (!disposableSocialPromoCertBlocksBillableProviders(campaign)) {
    return { allowed: true };
  }
  if (DISPOSABLE_SP_CERT_ALLOWED_RENDERER_SKUS.has(skuId)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    skipReason: DISPOSABLE_SP_CERT_RENDERER_LANE_BLOCKED,
  };
}

export function disposableSpCertBillableHookRefusal(campaign: CampaignRecord):
  | { blocked: false }
  | {
      blocked: true;
      failureCode: typeof DISPOSABLE_SP_CERT_BILLABLE_BLOCKED;
      message: string;
    } {
  if (!disposableSocialPromoCertBlocksBillableProviders(campaign)) {
    return { blocked: false };
  }
  return {
    blocked: true,
    failureCode: DISPOSABLE_SP_CERT_BILLABLE_BLOCKED,
    message:
      "Billable external production is blocked for the disposable Social & Promo cert project.",
  };
}
