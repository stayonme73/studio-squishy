/**
 * Fail if the authoritative brief claims customer photo ownership while the
 * bound pack is a Studio-generated certification fixture.
 */

import { readFileSync } from "fs";
import path from "path";

import { studioRoom4cScenario3MossAndThreadV1 as brief } from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";
import {
  MOSS_THREAD_CERTIFICATION_PHOTO_PACK,
  MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS,
} from "@/config/studio-room-4c-scenario-3-photo-pack-v1";

const SCENARIO_3_DIR =
  "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-3-moss-and-thread";

export type PhotoAuthoritySnapshot = {
  source: string;
  customerOwned: boolean;
  customerProvided: boolean;
  ownerApprovedForCertification: boolean;
  campaignUsePermitted: boolean;
  cropAndAdaptPermitted: boolean;
  externalCustomerPhotoPathProven: boolean;
  realExternalCustomerPhotoRightsCertified: boolean;
};

export function briefClaimsCustomerPhotoOwnership(photoRights: {
  source?: string;
  customerOwned?: boolean;
  customerProvided?: boolean;
  authorizationBasis?: string;
}): boolean {
  if (photoRights.customerOwned === true) return true;
  if (photoRights.customerProvided === true) return true;
  if (photoRights.source === "customer_supplied") return true;
  if (photoRights.authorizationBasis === "customer_owns") return true;
  return false;
}

export function photoAuthorityContradictsFixturePack(input: {
  photoRights: {
    source?: string;
    customerOwned?: boolean;
    customerProvided?: boolean;
    authorizationBasis?: string;
  };
  packSource: string;
}): boolean {
  return (
    briefClaimsCustomerPhotoOwnership(input.photoRights) &&
    input.packSource === "STUDIO_GENERATED_CERTIFICATION_FIXTURE"
  );
}

export function briefPhotoAuthority(): PhotoAuthoritySnapshot {
  return {
    source: brief.photoRights.source,
    customerOwned: brief.photoRights.customerOwned,
    customerProvided: brief.photoRights.customerProvided,
    ownerApprovedForCertification:
      brief.photoRights.ownerApprovedForCertification,
    campaignUsePermitted: brief.photoRights.campaignUsePermitted,
    cropAndAdaptPermitted: brief.photoRights.cropAndAdaptPermitted,
    externalCustomerPhotoPathProven:
      brief.photoRights.externalCustomerPhotoPathProven,
    realExternalCustomerPhotoRightsCertified:
      brief.photoRights.realExternalCustomerPhotoRightsCertified,
  };
}

function readJson(rel: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), SCENARIO_3_DIR, rel), "utf8"),
  ) as Record<string, unknown>;
}

export function evaluateScenario3PhotoAuthorityAgreement(): {
  ok: boolean;
  findings: readonly string[];
  authority: PhotoAuthoritySnapshot;
} {
  const findings: string[] = [];
  const authority = briefPhotoAuthority();
  const pack = MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS;

  if (
    photoAuthorityContradictsFixturePack({
      photoRights: brief.photoRights,
      packSource: pack.source,
    })
  ) {
    findings.push("BRIEF_CLAIMS_CUSTOMER_OWNERSHIP_OF_FIXTURE_PACK");
  }

  const expected: PhotoAuthoritySnapshot = {
    source: pack.source,
    customerOwned: pack.customerOwned,
    customerProvided: pack.customerProvided,
    ownerApprovedForCertification: pack.ownerApprovedForCertification,
    campaignUsePermitted: pack.campaignUsePermitted,
    cropAndAdaptPermitted: pack.cropAndAdaptPermitted,
    externalCustomerPhotoPathProven: pack.externalCustomerPhotoPathProven,
    realExternalCustomerPhotoRightsCertified:
      pack.realExternalCustomerPhotoRightsCertified,
  };

  for (const key of Object.keys(expected) as (keyof PhotoAuthoritySnapshot)[]) {
    if (authority[key] !== expected[key]) {
      findings.push(`BRIEF_PACK_MISMATCH:${key}`);
    }
  }

  const manifest = readJson("PHOTO-MANIFEST.json");
  const rightsRecord = readJson("RIGHTS-RECORD.json");
  for (const key of Object.keys(expected) as (keyof PhotoAuthoritySnapshot)[]) {
    if (manifest[key] !== expected[key]) {
      findings.push(`MANIFEST_MISMATCH:${key}`);
    }
    if (rightsRecord[key] !== expected[key]) {
      findings.push(`RIGHTS_RECORD_MISMATCH:${key}`);
    }
  }

  if (authority.externalCustomerPhotoPathProven !== false) {
    findings.push("EXTERNAL_CUSTOMER_PHOTO_PATH_MUST_REMAIN_UNPROVEN");
  }
  if (authority.realExternalCustomerPhotoRightsCertified !== false) {
    findings.push("REAL_EXTERNAL_CUSTOMER_PHOTO_RIGHTS_MUST_REMAIN_UNCERTIFIED");
  }

  const bound = new Map(
    brief.photoRights.boundFiles.map((file) => [file.filename, file.sha256]),
  );
  for (const file of MOSS_THREAD_CERTIFICATION_PHOTO_PACK) {
    if (bound.get(file.filename) !== file.sha256) {
      findings.push(`BOUND_HASH_MISMATCH:${file.filename}`);
    }
  }

  const maker = brief.photoRights.makerImage;
  if (maker.likenessType !== "SYNTHETIC_FICTIONAL_PERSON_NO_REAL_LIKENESS") {
    findings.push("MAKER_LIKENESS_TYPE_MISMATCH");
  }
  if (maker.realPersonConsentRequired !== false) {
    findings.push("MAKER_REAL_PERSON_CONSENT_MUST_BE_FALSE");
  }
  if (maker.publicFigure !== false) {
    findings.push("MAKER_PUBLIC_FIGURE_MUST_BE_FALSE");
  }

  return { ok: findings.length === 0, findings, authority };
}
