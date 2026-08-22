import { createHash } from "crypto";

import { studioExternalCustomerContentIntakeAndRightsCertificationV1 } from "@/config/studio-external-customer-content-intake-and-rights-certification-v1";
import { studioMaterialsUploadV1 } from "@/config/studio-materials-upload-v1";
import { isAllowedCustomerMaterialFile } from "@/config/studio-materials-upload-v1";

import type { CustomerContentTechnicalInspection } from "./types";

const PACKAGE_ID = studioExternalCustomerContentIntakeAndRightsCertificationV1.packageId;

type SignatureRule = {
  mime: string;
  magic: readonly number[];
  offset?: number;
};

const SIGNATURE_RULES: readonly SignatureRule[] = [
  { mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  { mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  { mime: "audio/mpeg", magic: [0x49, 0x44, 0x33] },
  { mime: "audio/wav", magic: [0x52, 0x49, 0x46, 0x46] },
  { mime: "audio/wave", magic: [0x52, 0x49, 0x46, 0x46] },
  { mime: "video/mp4", magic: [0x66, 0x74, 0x79, 0x70], offset: 4 },
];

function readPngDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.byteLength < 24) return null;
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (!width || !height) return null;
  return { width, height };
}

function readJpegDimensions(bytes: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 9 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const height = bytes.readUInt16BE(offset + 5);
      const width = bytes.readUInt16BE(offset + 7);
      if (width && height) return { width, height };
      return null;
    }
    const segmentLength = bytes.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;
    offset += 2 + segmentLength;
  }
  return null;
}

function matchesMagic(bytes: Buffer, magic: readonly number[], offset = 0): boolean {
  if (magic.length === 0) return true;
  if (bytes.byteLength < offset + magic.length) return false;
  return magic.every((value, index) => bytes[offset + index] === value);
}

function detectVerifiedMime(bytes: Buffer, fileName: string, declaredMime: string): string | null {
  const declared = declaredMime.trim().toLowerCase();
  for (const rule of SIGNATURE_RULES) {
    if (matchesMagic(bytes, rule.magic, rule.offset ?? 0)) {
      return rule.mime;
    }
  }
  const ext = fileName.trim().toLowerCase().match(/(\.[a-z0-9]+)$/)?.[1] ?? "";
  if (ext === ".png" && matchesMagic(bytes, SIGNATURE_RULES[0]!.magic)) return "image/png";
  if ((ext === ".jpg" || ext === ".jpeg") && matchesMagic(bytes, SIGNATURE_RULES[1]!.magic)) {
    return "image/jpeg";
  }
  if (ext === ".pdf" && matchesMagic(bytes, SIGNATURE_RULES[2]!.magic)) return "application/pdf";
  if (ext === ".txt" || declared === "text/plain") {
    return "text/plain";
  }
  return null;
}

function isPasswordProtectedPdf(bytes: Buffer): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.byteLength, 4096)).toString("latin1");
  return /\/Encrypt\b/.test(sample);
}

export function inspectCustomerFileBytes(input: {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  checksumSha256?: string;
  duplicateOfSha256?: string | null;
  inspectedAt?: string;
}): CustomerContentTechnicalInspection {
  const inspectedAt = input.inspectedAt ?? new Date().toISOString();
  const declaredMimeType = input.mimeType.trim().toLowerCase() || "application/octet-stream";
  const verifiedMimeType = detectVerifiedMime(input.bytes, input.fileName, declaredMimeType);
  const allowedByPolicy = isAllowedCustomerMaterialFile(input.fileName, declaredMimeType);
  const signatureMatch =
    verifiedMimeType !== null &&
    (declaredMimeType === "application/octet-stream" || verifiedMimeType === declaredMimeType);
  const issues: string[] = [];

  if (!allowedByPolicy) {
    issues.push("Declared file type is not on the Studio customer materials allowlist.");
  }
  if (!verifiedMimeType) {
    issues.push("The Studio could not verify this file type from its contents.");
  } else if (!signatureMatch) {
    issues.push("The file extension or declared type does not match the file contents.");
  }

  let corrupt = false;
  if (verifiedMimeType === "image/png") {
    const dims = readPngDimensions(input.bytes);
    if (!dims) {
      corrupt = true;
      issues.push("The PNG file appears corrupt or incomplete.");
    }
  }
  if (verifiedMimeType === "image/jpeg") {
    const dims = readJpegDimensions(input.bytes);
    if (!dims) {
      corrupt = true;
      issues.push("The JPEG file appears corrupt or incomplete.");
    }
  }
  if (input.bytes.byteLength < 8 && declaredMimeType !== "text/plain") {
    corrupt = true;
    issues.push("The file is too small to be a valid upload.");
  }

  const passwordProtected =
    verifiedMimeType === "application/pdf" ? isPasswordProtectedPdf(input.bytes) : false;
  if (passwordProtected) {
    issues.push("Password-protected files cannot be reviewed by the Studio.");
  }

  let imageWidth: number | null = null;
  let imageHeight: number | null = null;
  if (verifiedMimeType === "image/png") {
    const dims = readPngDimensions(input.bytes);
    imageWidth = dims?.width ?? null;
    imageHeight = dims?.height ?? null;
  }
  if (verifiedMimeType === "image/jpeg") {
    const dims = readJpegDimensions(input.bytes);
    imageWidth = dims?.width ?? null;
    imageHeight = dims?.height ?? null;
  }

  const supported = allowedByPolicy && Boolean(verifiedMimeType) && !corrupt && !passwordProtected;

  return {
    inspectedAt,
    packageId: PACKAGE_ID,
    originalFileName: input.fileName,
    declaredMimeType,
    verifiedMimeType,
    signatureMatch,
    byteSize: input.bytes.byteLength,
    sha256: input.checksumSha256 ?? createHash("sha256").update(input.bytes).digest("hex"),
    imageWidth,
    imageHeight,
    corrupt,
    supported,
    passwordProtected,
    duplicateOfSha256: input.duplicateOfSha256 ?? null,
    issues,
  };
}

export function technicalInspectionRejectsUpload(
  inspection: CustomerContentTechnicalInspection,
): { reject: true; reason: string } | { reject: false } {
  if (inspection.corrupt) {
    return {
      reject: true,
      reason:
        "The Studio could not read this file. Please check the file and send it again.",
    };
  }
  if (inspection.passwordProtected) {
    return {
      reject: true,
      reason:
        "Password-protected files cannot be received. Please send an unlocked copy.",
    };
  }
  if (!isAllowedCustomerMaterialFile(inspection.originalFileName, inspection.declaredMimeType)) {
    return {
      reject: true,
      reason: studioMaterialsUploadV1.customerCopy.unsupportedType,
    };
  }
  return { reject: false };
}
