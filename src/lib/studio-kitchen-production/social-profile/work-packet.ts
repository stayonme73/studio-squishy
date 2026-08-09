/**
 * Shared social-profile work packet validation.
 * Default fulfillment is kit delivery (Owner A+C). Platform mutation remains future-only.
 */

import { getPlatformCapability } from "./capability";
import { assertNoSilentTruncation, facebookAboutFits } from "./copy";
import { assertNoRawPasswordStored } from "./security";
import type {
  SocialPlatform,
  SocialProfileMutation,
  SocialProfileWorkPacket,
} from "./types";
import {
  SOCIAL_PROFILE_SETUP_SKU,
  SOCIAL_PROFILE_UPDATE_SKU,
} from "./types";

export type SocialPacketValidation =
  | { ok: true; packet: SocialProfileWorkPacket }
  | { ok: false; errors: readonly string[] };

const PLATFORMS: readonly SocialPlatform[] = [
  "facebook",
  "instagram",
  "tiktok",
];

export type SocialFulfillment = "kit" | "platform_mutation";

export function resolveFulfillment(
  packet: SocialProfileWorkPacket,
): SocialFulfillment {
  // Owner A+C: sold path is kit. Mutation only if explicitly authorized + platform writable.
  if (!packet.authorization) return "kit";
  const capability = getPlatformCapability(packet.platform);
  if (!capability.ownerIndependentMutation) return "kit";
  return "kit"; // Meta OAuth not started — never auto-escalate to mutation in this package
}

export function validateSocialProfileWorkPacket(
  packet: SocialProfileWorkPacket,
): SocialPacketValidation {
  const errors: string[] = [];
  const fulfillment = resolveFulfillment(packet);

  if (
    packet.skuId !== SOCIAL_PROFILE_SETUP_SKU &&
    packet.skuId !== SOCIAL_PROFILE_UPDATE_SKU
  ) {
    errors.push("skuId must be rm-j002 or rm-j008");
  }
  if (packet.skuId === SOCIAL_PROFILE_SETUP_SKU && packet.mode !== "setup") {
    errors.push("rm-j002 requires mode=setup");
  }
  if (packet.skuId === SOCIAL_PROFILE_UPDATE_SKU && packet.mode !== "update") {
    errors.push("rm-j008 requires mode=update");
  }
  if (!PLATFORMS.includes(packet.platform)) {
    errors.push("unsupported platform");
  }
  if (!packet.customerOwnsAccount) {
    errors.push("customerOwnsAccount must be true — Studio does not create accounts");
  }
  if (!packet.platformAccountId.trim() && fulfillment === "platform_mutation") {
    errors.push("platformAccountId required for platform mutation");
  }
  if (!packet.campaignId.trim()) {
    errors.push("campaignId required");
  }
  if (!packet.workPacketId.trim() || !packet.workPacketVersion.trim()) {
    errors.push("workPacket identity required");
  }

  if (packet.authorization) {
    if (!packet.authorization.credentialHandle.trim()) {
      errors.push("authorization.credentialHandle required (opaque)");
    }
    assertNoRawPasswordStored(packet.authorization.credentialHandle, errors);
  }

  if (packet.mutations.length === 0) {
    errors.push("at least one mutation/recommendation required");
  }

  for (const mutation of packet.mutations) {
    if (!mutation.requestedValue.trim() && !mutation.assetSha256) {
      errors.push(`mutation ${mutation.field} missing value/asset`);
    }
    if (mutation.field === "about" && packet.platform === "facebook") {
      if (!facebookAboutFits(mutation.requestedValue)) {
        errors.push(
          "facebook about exceeds platform limit — return to copy correction (no silent truncation)",
        );
      }
    }
    assertNoSilentTruncation(mutation.requestedValue, errors, mutation.field);

    if (fulfillment === "platform_mutation") {
      const capability = getPlatformCapability(packet.platform);
      const fieldCap = capability.fields.find((f) => f.field === mutation.field);
      if (fieldCap?.writable !== true) {
        errors.push(
          `unsupported mutation: ${packet.platform}.${mutation.field} is not writable`,
        );
      }
    }
  }

  if (packet.approvedAbout) {
    assertNoSilentTruncation(packet.approvedAbout, errors, "approvedAbout");
    if (packet.platform === "facebook" && !facebookAboutFits(packet.approvedAbout)) {
      errors.push("approvedAbout exceeds Facebook about limit");
    }
  }
  if (packet.approvedBio) {
    assertNoSilentTruncation(packet.approvedBio, errors, "approvedBio");
  }

  if (packet.profileImage) {
    if (!packet.profileImage.contentSha256 || !packet.profileImage.relativePath) {
      errors.push("profileImage requires relativePath + contentSha256");
    }
  }
  if (packet.coverImage) {
    if (!packet.coverImage.contentSha256 || !packet.coverImage.relativePath) {
      errors.push("coverImage requires relativePath + contentSha256");
    }
  }

  if (
    packet.mode === "update" &&
    packet.beforeSnapshot === null &&
    packet.qaState !== "draft"
  ) {
    errors.push("update mode requires beforeSnapshot before QA advancement");
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, packet };
}

export function planSupportedMutations(
  platform: SocialPlatform,
  requested: readonly SocialProfileMutation[],
): {
  supported: SocialProfileMutation[];
  rejected: { field: string; reason: string }[];
  customerAppliedRecommendations: SocialProfileMutation[];
} {
  const capability = getPlatformCapability(platform);
  const supported: SocialProfileMutation[] = [];
  const rejected: { field: string; reason: string }[] = [];
  const customerAppliedRecommendations: SocialProfileMutation[] = [];
  for (const mutation of requested) {
    const fieldCap = capability.fields.find((f) => f.field === mutation.field);
    if (fieldCap?.writable === true) {
      // Documented as API-writable someday — still customer-applied under A+C kit path.
      supported.push(mutation);
      customerAppliedRecommendations.push(mutation);
    } else {
      rejected.push({
        field: mutation.field,
        reason: fieldCap?.note ?? "field not in capability matrix",
      });
      // Kit path still includes the recommendation for customer application.
      customerAppliedRecommendations.push(mutation);
    }
  }
  return { supported, rejected, customerAppliedRecommendations };
}

export function sharedSpineSteps(): readonly string[] {
  return [
    "customer_inputs_current_profile_truth",
    "authoritative_work_packet",
    "copy_production",
    "design_production",
    "platform_field_asset_package",
    "qa",
    "customer_delivery_kit",
  ] as const;
}
