import { createHash } from "crypto";

import { studioExternalCustomerContentIntakeAndRightsCertificationV1 } from "@/config/studio-external-customer-content-intake-and-rights-certification-v1";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import type { CustomerContentCertification } from "./types";

export const GATE_X_CERTIFICATION_RUNS_DIR =
  studioExternalCustomerContentIntakeAndRightsCertificationV1.evidenceDirs.certificationRuns;

export type GateXCertificationRunManifestEntry = {
  materialItemId: string;
  certificationId: string;
  routingState: string;
  sha256: string;
  originalFileName: string;
  archiveCount: number;
  productionCleared: boolean;
};

export type GateXCertificationRunManifest = {
  schemaVersion: 1;
  packageId: typeof studioExternalCustomerContentIntakeAndRightsCertificationV1.packageId;
  runId: string;
  capturedAt: string;
  campaignId: string;
  procedure:
    "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/CERTIFICATION-RUN-CAPTURE-PROCEDURE.md";
  entries: GateXCertificationRunManifestEntry[];
  manifestSha256: string;
};

function certificationEntryFromItem(item: CampaignMaterialItem): GateXCertificationRunManifestEntry | null {
  const cert = item.contentCertification;
  if (!cert) return null;
  return {
    materialItemId: item.id,
    certificationId: cert.certificationId,
    routingState: cert.routingState,
    sha256: cert.technical.sha256,
    originalFileName: cert.technical.originalFileName,
    archiveCount: item.contentCertificationArchive?.length ?? 0,
    productionCleared: cert.productionCleared,
  };
}

export function buildGateXCertificationRunManifest(input: {
  campaignId: string;
  items: readonly CampaignMaterialItem[];
  runId?: string;
  capturedAt?: string;
}): GateXCertificationRunManifest {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const runId = input.runId ?? `gate-x-run-${capturedAt.replace(/[:.]/g, "")}`;
  const entries = input.items
    .map(certificationEntryFromItem)
    .filter((entry): entry is GateXCertificationRunManifestEntry => entry !== null)
    .sort((a, b) => a.certificationId.localeCompare(b.certificationId));

  const body = {
    schemaVersion: 1 as const,
    packageId: studioExternalCustomerContentIntakeAndRightsCertificationV1.packageId,
    runId,
    capturedAt,
    campaignId: input.campaignId,
    procedure:
      "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/CERTIFICATION-RUN-CAPTURE-PROCEDURE.md" as const,
    entries,
  };

  const manifestSha256 = createHash("sha256")
    .update(JSON.stringify(body, null, 2))
    .digest("hex");

  return {
    ...body,
    manifestSha256,
  };
}

export function listArchivedCertifications(
  item: CampaignMaterialItem,
): readonly CustomerContentCertification[] {
  return item.contentCertificationArchive ?? [];
}
