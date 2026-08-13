/**
 * Set-level consistency for the sm-001 Launch Set.
 * Proves N/N members, anti-clone layout variety, bound captions, a publishable
 * posting order, and a schedule manifest that matches the set — not a partial
 * set dressed up as success.
 */

import { SM_001_BRAND_ONLY_TEMPLATE } from "./sm-001-reason";
import type {
  Sm001AssetSpec,
  Sm001CalendarManifest,
  Sm001Caption,
  Sm001PostingOrderEntry,
  Sm001ProjectTruth,
  Sm001SetSpec,
} from "./sm-001-types";

export type Sm001SetQaResult =
  | { ok: true; summary: string }
  | {
      ok: false;
      code:
        | "SET_CONSISTENCY_FAILURE"
        | "CAPTION_FAILURE"
        | "ORDER_FAILURE"
        | "BINDING_FAILURE"
        | "CALENDAR_FAILURE"
        | "COUNT_MISMATCH"
        | "FIXTURE_LEAKAGE";
      message: string;
    };

/** Templates that must carry the campaign price on-asset and in caption. */
const PRICE_BEARING_TEMPLATES = new Set([
  "offer_lead",
  "cta_book",
  "dates_window",
  "proof_point",
]);

function layoutFingerprint(asset: Sm001AssetSpec): string {
  return asset.layers
    .map((l) =>
      l.type === "text"
        ? `${l.role}:${l.x},${l.y},${l.fontSizePx},${l.fontWeight},${l.align}`
        : `${l.role}:${l.x},${l.y},${l.width}x${l.height}`,
    )
    .join("|");
}

export function evaluateSm001SetConsistency(input: {
  truth: Sm001ProjectTruth;
  spec: Sm001SetSpec;
  declaredTextByAsset: Record<string, string>;
  captions: readonly Sm001Caption[];
  postingOrder: readonly Sm001PostingOrderEntry[];
  calendar: Sm001CalendarManifest;
}): Sm001SetQaResult {
  const { truth, spec, declaredTextByAsset, captions, postingOrder, calendar } =
    input;
  const n = truth.plannedPostCount;

  if (spec.plannedPostCount !== n) {
    return {
      ok: false,
      code: "COUNT_MISMATCH",
      message: `Set declares plannedPostCount ${spec.plannedPostCount} but the job locked ${n}`,
    };
  }
  if (spec.assets.length !== n) {
    return {
      ok: false,
      code: "COUNT_MISMATCH",
      message: `Set must contain exactly ${n} posts, found ${spec.assets.length}`,
    };
  }

  const plateIds = new Set(spec.assets.map((a) => a.plateId));
  if (plateIds.size !== 1) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: "All Launch Set posts must share the same square plate",
    };
  }
  for (const asset of spec.assets) {
    if (asset.canvas.widthPx !== asset.canvas.heightPx) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} is not square`,
      };
    }
  }

  const expectedPositions = Array.from({ length: n }, (_, i) => i + 1).join(",");
  const positions = spec.assets.map((a) => a.orderIndex).sort((a, b) => a - b);
  if (positions.join(",") !== expectedPositions) {
    return {
      ok: false,
      code: "ORDER_FAILURE",
      message: `Posting positions must be 1-${n} exactly once, found ${positions.join(",")}`,
    };
  }

  const templates = new Set(spec.assets.map((a) => a.layoutTemplate));
  if (templates.size !== n) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: "Each Launch Set post must carry a distinct layout template",
    };
  }

  // Anti-clone: no two posts may share a layout fingerprint.
  const fingerprints = spec.assets.map((a) => ({
    assetId: a.assetId,
    fingerprint: layoutFingerprint(a),
  }));
  for (let i = 0; i < fingerprints.length; i++) {
    for (let j = i + 1; j < fingerprints.length; j++) {
      if (fingerprints[i]!.fingerprint === fingerprints[j]!.fingerprint) {
        return {
          ok: false,
          code: "SET_CONSISTENCY_FAILURE",
          message: `Posts ${fingerprints[i]!.assetId} and ${fingerprints[j]!.assetId} appear cloned (identical layout fingerprints) — the set must vary hierarchy`,
        };
      }
    }
  }

  for (const asset of spec.assets) {
    const text = declaredTextByAsset[asset.assetId] ?? "";
    if (!asset.authorizedPurpose.trim()) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Missing purpose for ${asset.assetId}`,
      };
    }
    if (!text.includes(asset.authorizedPurpose)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} does not surface its authorized purpose`,
      };
    }
    if (!text.includes(asset.layoutTemplate)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} does not surface its layout template (set variety must be visible)`,
      };
    }
    if (!text.includes(`Post ${asset.orderIndex} of ${n}`)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} does not declare its position in the ${n}-post Launch Set`,
      };
    }
    if (!text.includes(truth.wordmark)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} missing shared brand wordmark`,
      };
    }

    if (asset.layoutTemplate === SM_001_BRAND_ONLY_TEMPLATE) {
      if (text.includes(truth.priceDisplay)) {
        return {
          ok: false,
          code: "SET_CONSISTENCY_FAILURE",
          message: `Brand-trust post ${asset.assetId} carries campaign price but is declared brand-only`,
        };
      }
      continue;
    }

    if (!text.includes(truth.offerName)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} missing shared offer truth`,
      };
    }
    if (!text.includes(truth.priceDisplay)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} missing shared price truth`,
      };
    }
  }

  if (captions.length !== n) {
    return {
      ok: false,
      code: "CAPTION_FAILURE",
      message: `Set requires exactly ${n} captions, found ${captions.length}`,
    };
  }

  const assetById = new Map(spec.assets.map((a) => [a.assetId, a] as const));
  const captionById = new Map(captions.map((c) => [c.captionId, c] as const));

  for (const caption of captions) {
    const asset = assetById.get(caption.assetId);
    if (!asset) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Caption ${caption.captionId} references unknown post ${caption.assetId}`,
      };
    }
    if (asset.orderIndex !== caption.orderIndex) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Caption ${caption.captionId} is bound to position ${caption.orderIndex} but post ${caption.assetId} is position ${asset.orderIndex}`,
      };
    }
    if (!caption.text.trim()) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: `Caption ${caption.captionId} is empty`,
      };
    }
    if (
      !caption.text.includes(truth.businessName) &&
      !caption.text.includes(truth.wordmark)
    ) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: `Caption ${caption.captionId} does not name the business`,
      };
    }
    if (asset.layoutTemplate === SM_001_BRAND_ONLY_TEMPLATE) continue;
    if (!caption.text.includes(truth.offerName)) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: `Caption ${caption.captionId} on offer post ${caption.assetId} omits the campaign offer`,
      };
    }
    if (
      PRICE_BEARING_TEMPLATES.has(asset.layoutTemplate) &&
      !caption.text.includes(truth.priceDisplay)
    ) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: `Caption ${caption.captionId} on offer post ${caption.assetId} omits the campaign price`,
      };
    }
  }

  if (postingOrder.length !== n) {
    return {
      ok: false,
      code: "ORDER_FAILURE",
      message: `Posting order must cover ${n} positions, found ${postingOrder.length}`,
    };
  }

  const seenPositions = new Set<number>();
  const seenOrderAssets = new Set<string>();
  for (const entry of postingOrder) {
    if (seenPositions.has(entry.position)) {
      return {
        ok: false,
        code: "ORDER_FAILURE",
        message: `Duplicate posting position ${entry.position}`,
      };
    }
    seenPositions.add(entry.position);
    const asset = assetById.get(entry.assetId);
    if (!asset) {
      return {
        ok: false,
        code: "ORDER_FAILURE",
        message: `Posting order references unknown post ${entry.assetId}`,
      };
    }
    if (seenOrderAssets.has(entry.assetId)) {
      return {
        ok: false,
        code: "ORDER_FAILURE",
        message: `Post ${entry.assetId} appears more than once in the posting order`,
      };
    }
    seenOrderAssets.add(entry.assetId);
    if (asset.orderIndex !== entry.position) {
      return {
        ok: false,
        code: "ORDER_FAILURE",
        message: `Posting order places ${entry.assetId} at position ${entry.position} but the post declares ${asset.orderIndex}`,
      };
    }
    const caption = captionById.get(entry.captionId);
    if (!caption) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Posting order references unknown caption ${entry.captionId}`,
      };
    }
    if (caption.assetId !== entry.assetId) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Posting order pairs caption ${entry.captionId} with ${entry.assetId} but the caption is bound to ${caption.assetId}`,
      };
    }
  }
  if (seenPositions.size !== n) {
    return {
      ok: false,
      code: "ORDER_FAILURE",
      message: `Posting order does not cover all ${n} positions`,
    };
  }

  if (calendar.kind !== "sm_001_schedule_manifest") {
    return {
      ok: false,
      code: "CALENDAR_FAILURE",
      message: "Schedule manifest kind is not sm_001_schedule_manifest",
    };
  }
  if (calendar.plannedPostCount !== n) {
    return {
      ok: false,
      code: "COUNT_MISMATCH",
      message: `Schedule manifest declares plannedPostCount ${calendar.plannedPostCount} but the job locked ${n}`,
    };
  }
  if (calendar.entries.length !== n) {
    return {
      ok: false,
      code: "CALENDAR_FAILURE",
      message: `Schedule manifest must have exactly ${n} entries, found ${calendar.entries.length}`,
    };
  }
  if (!calendar.advisory || !calendar.publishingExcluded || !calendar.postingTimesExcluded) {
    return {
      ok: false,
      code: "CALENDAR_FAILURE",
      message:
        "Schedule manifest must remain advisory with publishing and posting times excluded",
    };
  }

  const orderByPosition = new Map(
    postingOrder.map((e) => [e.position, e] as const),
  );
  const seenCalendarPositions = new Set<number>();
  for (const entry of calendar.entries) {
    if (seenCalendarPositions.has(entry.orderIndex)) {
      return {
        ok: false,
        code: "CALENDAR_FAILURE",
        message: `Duplicate schedule entry for position ${entry.orderIndex}`,
      };
    }
    seenCalendarPositions.add(entry.orderIndex);
    const order = orderByPosition.get(entry.orderIndex);
    if (!order) {
      return {
        ok: false,
        code: "CALENDAR_FAILURE",
        message: `Schedule entry at position ${entry.orderIndex} has no posting-order entry`,
      };
    }
    if (order.assetId !== entry.assetId) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Schedule entry ${entry.orderIndex} references ${entry.assetId} but the posting order has ${order.assetId}`,
      };
    }
    if (order.captionId !== entry.captionId) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Schedule entry ${entry.orderIndex} references caption ${entry.captionId} but the posting order has ${order.captionId}`,
      };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.suggestedDate)) {
      return {
        ok: false,
        code: "CALENDAR_FAILURE",
        message: `Schedule entry ${entry.orderIndex} has a malformed suggested date "${entry.suggestedDate}"`,
      };
    }
    if (
      calendar.campaignSetRenderVersion != null &&
      entry.setVersion != null &&
      entry.setVersion !== calendar.campaignSetRenderVersion
    ) {
      return {
        ok: false,
        code: "CALENDAR_FAILURE",
        message: `Schedule entry ${entry.orderIndex} belongs to set version ${entry.setVersion}, not ${calendar.campaignSetRenderVersion}`,
      };
    }
  }
  if (seenCalendarPositions.size !== n) {
    return {
      ok: false,
      code: "CALENDAR_FAILURE",
      message: `Schedule manifest does not cover all ${n} positions`,
    };
  }

  if (truth.outputMode === "customer") {
    const leak = /CERTIFICATION FIXTURE|INTERNAL TEST|\(CERT\)/i;
    for (const asset of spec.assets) {
      const text = declaredTextByAsset[asset.assetId] ?? "";
      if (leak.test(text)) {
        return {
          ok: false,
          code: "FIXTURE_LEAKAGE",
          message: `Fixture leakage in ${asset.assetId}`,
        };
      }
    }
    for (const caption of captions) {
      if (leak.test(caption.text)) {
        return {
          ok: false,
          code: "FIXTURE_LEAKAGE",
          message: `Fixture leakage in caption ${caption.captionId}`,
        };
      }
    }
  }

  const order = [...postingOrder]
    .sort((a, b) => a.position - b.position)
    .map((e) => `${e.position}:${e.assetId}`)
    .join(" → ");
  const schedule = [...calendar.entries]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((e) => `${e.orderIndex}:${e.suggestedDate}`)
    .join(" → ");
  return {
    ok: true,
    summary: `Set consistency OK: ${n}/${n} square posts on ${spec.assets[0]!.plateId} with distinct layout templates; ${n} captions bound to posts; posting order ${order}; advisory schedule (${calendar.dateGovernance.policy}) ${schedule}.`,
  };
}
