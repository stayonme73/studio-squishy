/**
 * Production-truth cert E2E — materials steps that mirror the real customer + File Room path.
 * Customer rights attestation (upload) is separate from Studio production approval (team review).
 */

import { applyTeamReview } from "../src/lib/materials/actions.ts";

/** Studio File Room reviewer — same role gate as production Material Review APIs. */
export const CERT_MATERIAL_REVIEW_STAFF = {
  id: "staff-sp-cert-material-review",
  email: "staff@local.dev",
  displayName: "Studio Material Review",
  roles: ["staff"],
};

/**
 * @param {import("../src/lib/materials/types.ts").ServerMaterialsEnvelope} envelope
 * @param {string} logoItemId
 */
export function applyCertFileRoomLogoProductionApproval(envelope, logoItemId) {
  const item = envelope.items.find((i) => i.id === logoItemId);
  if (!item) {
    return { ok: false, error: "missing logo slot" };
  }
  if (item.uploadStatus !== "stored") {
    return { ok: false, error: "logo not stored" };
  }
  if (item.reviewStatus === "approved_for_use") {
    return { ok: true, envelope, alreadyApproved: true };
  }
  if (item.reviewStatus !== "submitted") {
    return {
      ok: false,
      error: `logo not awaiting team review (reviewStatus=${item.reviewStatus})`,
    };
  }
  const reviewed = applyTeamReview(
    envelope,
    logoItemId,
    "approved_for_use",
    undefined,
    CERT_MATERIAL_REVIEW_STAFF,
  );
  if (!reviewed.ok) {
    return { ok: false, error: reviewed.error };
  }
  const approved = reviewed.envelope.items.find((i) => i.id === logoItemId);
  if (approved?.reviewStatus !== "approved_for_use") {
    return { ok: false, error: "team review did not set approved_for_use" };
  }
  return { ok: true, envelope: reviewed.envelope, alreadyApproved: false };
}
