/**
 * Harbor & Oak fixtures for RM-J002 PROOF-1.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";

import { HARBOR_OAK_LOGO_SVG } from "./fixtures";
import { recipeForPlatform } from "./rm-j002-contracts";
import {
  DESIGN_RENDERER_RM_J002_SKU,
  type RmJ002KitProjectTruth,
  type RmJ002Platform,
} from "./rm-j002-types";

export const RM_J002_PROOF_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-RM-J002-PROOF-1" as const;

export const RM_J002_PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-rm-j002-proof-1/artifacts/rm-j002" as const;

const LOGO_REL =
  `${RM_J002_PROOF_ARTIFACT_ROOT}/materials/harbor-oak-anchor-oak-oval-v1.svg` as const;

export function ensureHarborOakRmJ002LogoMaterial(repoRoot: string): {
  materialId: string;
  role: "logo";
  relativePath: string;
  contentSha256: string;
  approvedIdentitySourceId: string;
} {
  const abs = path.join(repoRoot, LOGO_REL);
  mkdirSync(path.dirname(abs), { recursive: true });
  if (!existsSync(abs) || readFileSync(abs, "utf8") !== HARBOR_OAK_LOGO_SVG) {
    writeFileSync(abs, HARBOR_OAK_LOGO_SVG, "utf8");
  }
  const contentSha256 = createHash("sha256")
    .update(readFileSync(abs))
    .digest("hex");
  return {
    materialId: "mat-harbor-oak-logo-v1",
    role: "logo",
    relativePath: LOGO_REL,
    contentSha256,
    approvedIdentitySourceId: harborOakIdentityLock.approvedLogoVariantIds[0],
  };
}

export function buildRmJ002KitTruth(input: {
  platform: RmJ002Platform;
  campaignId: string;
  overrides?: Partial<
    Pick<
      RmJ002KitProjectTruth,
      | "profileGoal"
      | "currentProfileNotes"
      | "website"
      | "phone"
      | "displayName"
      | "brandNotes"
      | "label"
      | "businessName"
      | "mutationRequested"
    >
  >;
}): RmJ002KitProjectTruth {
  const recipe = recipeForPlatform(input.platform);
  const o = input.overrides ?? {};
  return {
    skuId: DESIGN_RENDERER_RM_J002_SKU,
    campaignId: input.campaignId,
    jobId: `${input.campaignId}::rm-j002`,
    dispatchId: `dispatch-${input.campaignId}`,
    platform: input.platform,
    lockedKitMemberCount: recipe.lockedKitMemberCount,
    plannedKitMembers: recipe.plannedKitMembers,
    businessName: o.businessName ?? "Harbor & Oak Studio",
    profileGoal:
      o.profileGoal ??
      "Show a calm portrait photography studio that books discovery calls.",
    currentProfileNotes:
      o.currentProfileNotes ??
      "New professional profile. Emphasize downtown sessions and clear booking link.",
    website: o.website ?? "https://harbor-and-oak.example",
    phone: o.phone ?? "(555) 014-2200",
    displayName: o.displayName ?? "Harbor & Oak Studio",
    brandNotes: o.brandNotes ?? "Warm oak + soft harbor blue. Circular logo safe.",
    label: o.label ?? `Harbor & Oak — rm-j002 ${input.platform} kit`,
    credentialsPresent: false,
    mutationRequested: o.mutationRequested ?? false,
  };
}

/** Instagram composition illegally including a cover member. */
export function buildRmJ002UnsupportedInstagramCoverTruth(input: {
  campaignId: string;
}): RmJ002KitProjectTruth {
  const base = buildRmJ002KitTruth({
    platform: "instagram",
    campaignId: input.campaignId,
  });
  return {
    ...base,
    lockedKitMemberCount: 4,
    plannedKitMembers: [
      ...base.plannedKitMembers,
      {
        memberId: "page_cover",
        kind: "design_page_cover",
        order: 4,
        memberPurpose: "Illegal Instagram cover",
        agreedPlateId: "facebook-page-cover-851x315",
      },
    ],
  };
}
