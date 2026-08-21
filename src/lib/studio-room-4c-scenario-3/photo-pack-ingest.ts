/**
 * Scenario 3 photo-pack ingest gate.
 * Rights are bound to exact file hashes. Studio certification fixtures
 * are not customer-owned photographs.
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import {
  MOSS_THREAD_CERTIFICATION_PHOTO_PACK,
  MOSS_THREAD_PHOTO_PACK_DIR,
  MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS,
} from "@/config/studio-room-4c-scenario-3-photo-pack-v1";

export type Scenario3PhotoPackIngestResult = {
  ok: boolean;
  suppliedCount: number;
  requiredCount: number;
  hashBoundCount: number;
  findings: readonly string[];
  entries: readonly {
    assetId: string;
    relativePath: string;
    expectedSha256: string;
    actualSha256: string | null;
    hashMatch: boolean;
    filePresent: boolean;
    width: number;
    height: number;
    sizeBytes: number;
    fileType: string;
    category: "product" | "maker" | "studio";
    intendedUse: string;
    rights: typeof MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS;
    labeledCustomerOwned: false;
    labeledCustomerProvided: false;
  }[];
};

function repoPath(rel: string): string {
  return path.join(process.cwd(), rel);
}

export function evaluateScenario3PhotoPackIngest(): Scenario3PhotoPackIngestResult {
  const findings: string[] = [];
  const entries = MOSS_THREAD_CERTIFICATION_PHOTO_PACK.map((slot) => {
    const relativePath = `${MOSS_THREAD_PHOTO_PACK_DIR}/${slot.filename}`;
    const full = repoPath(relativePath);
    const filePresent = existsSync(full);
    let actualSha256: string | null = null;
    if (!filePresent) {
      findings.push(`PHOTO_MISSING:${slot.assetId}`);
    } else {
      const buf = readFileSync(full);
      actualSha256 = createHash("sha256").update(buf).digest("hex");
      if (buf.length !== slot.sizeBytes) {
        findings.push(`SIZE_MISMATCH:${slot.assetId}`);
      }
      if (actualSha256 !== slot.sha256) {
        findings.push(`HASH_MISMATCH:${slot.assetId}`);
      }
    }
    return {
      assetId: slot.assetId,
      relativePath,
      expectedSha256: slot.sha256,
      actualSha256,
      hashMatch: actualSha256 === slot.sha256,
      filePresent,
      width: slot.width,
      height: slot.height,
      sizeBytes: slot.sizeBytes,
      fileType: slot.fileType,
      category: slot.category,
      intendedUse: slot.intendedUse,
      rights: MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS,
      labeledCustomerOwned: false as const,
      labeledCustomerProvided: false as const,
    };
  });

  const hashBoundCount = entries.filter((entry) => entry.hashMatch).length;
  return {
    ok: findings.length === 0 && hashBoundCount === entries.length,
    suppliedCount: entries.filter((entry) => entry.filePresent).length,
    requiredCount: entries.length,
    hashBoundCount,
    findings,
    entries,
  };
}
