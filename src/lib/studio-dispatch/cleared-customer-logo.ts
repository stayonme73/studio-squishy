/**
 * Build a customer logo the way the live File Room path clears production:
 * certifyCustomerMaterialUpload → CLEARED_FOR_PRODUCTION.
 * Certification scripts may call this; it does not bypass the rights gate.
 */

import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  certifyCustomerMaterialUpload,
  SYNTHETIC_PNG_1X1_BYTES,
} from "@/lib/studio-customer-content-intake";

export const GENERIC_CUSTOMER_LOGO_PNG_BYTES = SYNTHETIC_PNG_1X1_BYTES;

export function stageGenericCustomerLogoPng(input: {
  repoRoot: string;
  campaignId: string;
  bytes?: Buffer;
}): string {
  const bytes = input.bytes ?? GENERIC_CUSTOMER_LOGO_PNG_BYTES;
  const relativePath = `data/campaign-design-artifacts/${input.campaignId}/materials/logo.png`;
  const abs = path.join(input.repoRoot, relativePath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, bytes);
  return relativePath;
}

export function buildClearedCustomerLogoMaterial(input: {
  campaignId: string;
  skuId: string;
  bytes?: Buffer;
  fileName?: string;
  stagedRelativePath: string;
}): CampaignMaterialItem {
  const now = new Date().toISOString();
  const bytes = input.bytes ?? GENERIC_CUSTOMER_LOGO_PNG_BYTES;
  const fileName = input.fileName ?? "customer-mark.png";
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const certified = certifyCustomerMaterialUpload({
    category: "logo-brand",
    bytes,
    fileName,
    mimeType: "image/png",
    checksumSha256,
    rightsInput: {
      useAuthorizationBasis: "customer_owns",
      commercialUsePermitted: true,
      cropAdaptPermitted: true,
      recognizablePeoplePresent: false,
      thirdPartyMaterialPresent: false,
    },
    evaluatedAt: now,
  });
  if (!certified.ok) {
    throw new Error(
      `CLEARED_LOGO_CERT_FAILED: ${certified.error} (${certified.status})`,
    );
  }

  return {
    id: `logo-${input.campaignId}`,
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus: "approved_for_use",
    contentKind: "file-metadata",
    label: "Logo",
    reason: "Brand mark",
    relatedServiceIds: [input.skuId as never],
    uploadStatus: "stored",
    fileName,
    mimeType: "image/png",
    sizeBytes: bytes.byteLength,
    url: input.stagedRelativePath,
    submittedAt: now,
    useAuthorization: { basis: "customer_owns", attestedAt: now },
    contentCertification: certified.certification,
  };
}
