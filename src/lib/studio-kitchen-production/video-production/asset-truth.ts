/**
 * Customer asset truth for short video — do not fabricate footage.
 */

import type { VideoAssetInputKind, VideoQualityFinding } from "./types";

export type CustomerAssetTruthOutcome = {
  kind: VideoAssetInputKind;
  productionAllowed: boolean;
  requiresAuthorizedStudioStockSource: boolean;
  findings: readonly VideoQualityFinding[];
  notes: string;
};

export function evaluateCustomerAssetTruth(kind: VideoAssetInputKind): CustomerAssetTruthOutcome {
  switch (kind) {
    case "customer_footage":
      return {
        kind,
        productionAllowed: true,
        requiresAuthorizedStudioStockSource: false,
        findings: [],
        notes: "Customer provided usable footage — proceed with CapCut assembly when path exists.",
      };
    case "customer_photos":
      return {
        kind,
        productionAllowed: true,
        requiresAuthorizedStudioStockSource: false,
        findings: [],
        notes:
          "Photos-only assembly is within RTU scope when photos are usable; still requires CapCut assembly path.",
      };
    case "logo_and_copy_only":
      return {
        kind,
        productionAllowed: false,
        requiresAuthorizedStudioStockSource: true,
        findings: [
          {
            id: "assets_logo_copy_need_stock",
            severity: "fail",
            checkKind: "stock_media",
            message:
              "Logo + copy only requires authorized Studio/stock/AI visuals — source is currently unresolved",
          },
        ],
        notes: "Cannot invent B-roll. Stock/Studio source must be authorized before production.",
      };
    case "no_usable_media":
      return {
        kind,
        productionAllowed: false,
        requiresAuthorizedStudioStockSource: true,
        findings: [
          {
            id: "assets_missing",
            severity: "fail",
            checkKind: "assets_required",
            message: "No usable customer media and no authorized Studio/stock/AI source",
          },
        ],
        notes: "Fail honestly — do not fabricate customer footage.",
      };
    case "insufficient_resolution":
      return {
        kind,
        productionAllowed: false,
        requiresAuthorizedStudioStockSource: false,
        findings: [
          {
            id: "assets_low_res",
            severity: "fail",
            checkKind: "assets_required",
            message: "Customer assets have insufficient resolution for a commercial short-video deliverable",
          },
        ],
        notes: "Request replacement assets or authorized alternatives — do not stretch unusable media.",
      };
    case "requested_unavailable_footage":
      return {
        kind,
        productionAllowed: false,
        requiresAuthorizedStudioStockSource: false,
        findings: [
          {
            id: "assets_unavailable_request",
            severity: "fail",
            checkKind: "assets_required",
            message:
              "Customer requested footage The Studio does not possess — filming/drone/talent are excluded",
          },
        ],
        notes: "Do not imply The Studio filmed something it did not film.",
      };
    case "approved_studio_stock_ai":
      return {
        kind,
        productionAllowed: false,
        requiresAuthorizedStudioStockSource: true,
        findings: [
          {
            id: "stock_source_unresolved",
            severity: "fail",
            checkKind: "stock_media",
            message:
              "Approved Studio/stock/AI visuals are named in catalog but no authorized source/license is established",
          },
        ],
        notes:
          "Until a stock source is approved, this input kind fails honestly even when the customer opts into Studio visuals.",
      };
  }
}
