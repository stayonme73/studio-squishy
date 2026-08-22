import type { MaterialCategory } from "@/lib/materials/types";

import { buildCustomerContentRightsRecord } from "./rights-record";
import { buildCustomerContentCertification } from "./routing";
import {
  inspectCustomerFileBytes,
  technicalInspectionRejectsUpload,
} from "./technical-inspection";
import type {
  CertifyCustomerMaterialUploadInput,
  CustomerContentCertification,
  CustomerContentRightsInput,
} from "./types";

export function certifyCustomerMaterialUpload(input: {
  category: MaterialCategory;
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  checksumSha256: string;
  rightsInput?: CustomerContentRightsInput;
  evaluatedAt?: string;
  priorCertification?: CustomerContentCertification | null;
  duplicateOfSha256?: string | null;
}):
  | { ok: true; certification: CustomerContentCertification }
  | { ok: false; error: string; status: number; certification?: CustomerContentCertification } {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const technical = inspectCustomerFileBytes({
    bytes: input.bytes,
    fileName: input.fileName,
    mimeType: input.mimeType,
    checksumSha256: input.checksumSha256,
    duplicateOfSha256: input.duplicateOfSha256 ?? null,
    inspectedAt: evaluatedAt,
  });

  const reject = technicalInspectionRejectsUpload(technical);
  if (reject.reject) {
    const rights = buildCustomerContentRightsRecord({
      category: input.category,
      fileName: input.fileName,
      rightsInput: input.rightsInput,
      recordedAt: evaluatedAt,
    });
    const certification = buildCustomerContentCertification({
      category: input.category,
      technical,
      rights,
      evaluatedAt,
      prior: input.priorCertification,
    });
    return { ok: false, error: reject.reason, status: 400, certification };
  }

  const rights = buildCustomerContentRightsRecord({
    category: input.category,
    fileName: input.fileName,
    rightsInput: input.rightsInput,
    useAuthorizationBasis: input.rightsInput?.useAuthorizationBasis,
    recordedAt: evaluatedAt,
  });

  const certification = buildCustomerContentCertification({
    category: input.category,
    technical,
    rights,
    evaluatedAt,
    prior: input.priorCertification,
  });

  return { ok: true, certification };
}

export type { CertifyCustomerMaterialUploadInput };
