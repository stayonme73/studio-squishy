/**
 * Pack fingerprint — composition + member content bindings (not filenames).
 */

import { createHash } from "crypto";

import { MA_001_PACK_ORCHESTRATOR_VERSION } from "./ma-001-types";
import type { Ma001PackProjectTruth } from "./ma-001-types";

export function fingerprintMa001Pack(truth: Ma001PackProjectTruth): string {
  const members = [...truth.plannedPackMembers]
    .sort((a, b) => a.order - b.order)
    .map((m) => {
      const payload = truth.memberTruthById[m.memberId];
      let contentKey: unknown = null;
      if (payload?.kind === "flyer") {
        const t = payload.truth;
        contentKey = {
          kind: "flyer",
          offerName: t.offerName,
          priceDisplay: t.priceDisplay,
          businessName: t.businessName,
          materials: t.materials.map((x) => x.contentSha256),
        };
      } else if (payload?.kind === "business_card") {
        const t = payload.truth;
        contentKey = {
          kind: "business_card",
          personName: t.personName,
          phone: t.phone,
          email: t.email,
          businessName: t.businessName,
          materials: t.materials.map((x) => x.contentSha256),
        };
      } else if (payload?.kind === "service_sheet") {
        const t = payload.truth;
        contentKey = {
          kind: "service_sheet",
          listHeading: t.listHeading,
          services: t.services.map((s) => ({
            id: s.serviceId,
            name: s.name,
            priceMode: s.priceMode,
          })),
          materials: t.materials.map((x) => x.contentSha256),
        };
      } else if (payload?.kind === "promotion_graphic") {
        const t = payload.truth;
        contentKey = {
          kind: "promotion_graphic",
          assetId: t.assetId,
          plateId: t.plateId,
          purpose: t.authorizedPurpose,
          offerName: t.offerName,
          priceDisplay: t.priceDisplay,
          materials: t.materials.map((x) => x.contentSha256),
        };
      }
      return {
        memberId: m.memberId,
        kind: m.kind,
        order: m.order,
        memberPurpose: m.memberPurpose,
        producerFamily: m.producerFamily,
        agreedPlateId: m.agreedPlateId ?? null,
        contentKey,
      };
    });

  return createHash("sha256")
    .update(
      JSON.stringify({
        skuId: truth.skuId,
        campaignId: truth.campaignId,
        lockedPackMemberCount: truth.lockedPackMemberCount,
        campaignFocus: truth.campaignFocus,
        businessName: truth.businessName,
        offerName: truth.offerName,
        priceDisplay: truth.priceDisplay,
        members,
        orchestratorVersion: MA_001_PACK_ORCHESTRATOR_VERSION,
      }),
    )
    .digest("hex");
}
