import path from "path";
import { describe, expect, it } from "vitest";

import { loadShotstackWorkPacket } from "../video-integration";
import { resolveServiceProductionContract } from "../resolve-contract";
import {
  CERT_VIDEO_CUSTOMER_READY_STATUS,
  CERT_VIDEO_KNOWN_LIMITATION,
  CERT_VIDEO_MANDATORY_QA_RULE,
  CERT_VIDEO_OWNER_VERDICT,
  CERT_VIDEO_V5_ARTIFACT,
} from "./finalization";
import { runCertVideoMachineQa } from "./machine-qa";

const repoRoot = path.resolve(__dirname, "../../../..");

describe("KITCHEN-PRODUCTION-CERT-VIDEO-1 finalization", () => {
  it("closes as CUSTOMER READY WITH LIMITS — MP4 with mandatory A/V sync QA rule", () => {
    expect(CERT_VIDEO_CUSTOMER_READY_STATUS).toBe(
      "CUSTOMER READY WITH LIMITS — MP4",
    );
    expect(CERT_VIDEO_OWNER_VERDICT.furtherRenderAuthorized).toBe(false);
    expect(CERT_VIDEO_OWNER_VERDICT.visualMessageQuality).toBe(
      "PASS WITH MINOR TIMING LIMIT",
    );
    expect(CERT_VIDEO_KNOWN_LIMITATION).toMatch(/Sessions begin|Call/i);
    expect(CERT_VIDEO_MANDATORY_QA_RULE.id).toBe(
      "av_beat_synchronization_per_artifact",
    );
    expect(CERT_VIDEO_V5_ARTIFACT.contentSha256).toBe(
      "6223a8f016f53021172768d1a97b25376b9b18e2421d8bfef29647ecaf51f190",
    );

    const resolved = resolveServiceProductionContract("v2-rtu-short-video");
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    expect(resolved.contract.readinessNotes).toMatch(
      /CUSTOMER READY WITH LIMITS — MP4/,
    );
    expect(
      resolved.contract.qaItems.some(
        (q) => q.id === "av_beat_synchronization_per_artifact",
      ),
    ).toBe(true);
  });
});

describe("KITCHEN-PRODUCTION-CERT-VIDEO-1 machine QA", () => {
  it("V3 packet eliminates duplicate overlays and obsolete CTA in payload", () => {
    const packet = loadShotstackWorkPacket(
      repoRoot,
      "docs/launch/kitchen-production-cert-video-1/work-packet/work-packet-v3.json",
    );
    expect(packet.requiredShotstackEnv).toBe("v1");
    expect(packet.primaryCtaText).toBe("Book your visit today");

    const qa = runCertVideoMachineQa({
      repoRoot,
      packet,
      artifactRelativePath: packet.exportRelativePath,
      expectedEnv: "v1",
      renderEnvUsed: "v1",
      obsoleteCtaForbidden: "Book a visit",
      primaryCta: "Book your visit today",
    });

    // Artifact not rendered yet — download/probe checks fail; payload checks must pass.
    const byId = Object.fromEntries(qa.checks.map((c) => [c.id, c]));
    expect(byId.no_duplicate_overlay_scene_1?.ok).toBe(true);
    expect(byId.no_duplicate_overlay_scene_2?.ok).toBe(true);
    expect(byId.no_duplicate_overlay_scene_3?.ok).toBe(true);
    expect(byId.single_primary_cta_overlay?.ok).toBe(true);
    expect(byId.obsolete_cta_absent?.ok).toBe(true);
    expect(byId.cta_contrast_config?.ok).toBe(true);
    expect(byId.v1_preserved?.ok).toBe(true);
    expect(byId.v2_preserved?.ok).toBe(true);
    expect(qa.qaPass).toBe(false);
    expect(qa.customerReady).toBe(false);
    expect(qa.certified).toBe(false);
  });

  it("V4 packet maps narration beats (offer/deadline/time/contact/CTA)", () => {
    const packet = loadShotstackWorkPacket(
      repoRoot,
      "docs/launch/kitchen-production-cert-video-1/work-packet/work-packet-v4.json",
    );
    expect(packet.requiredShotstackEnv).toBe("v1");
    expect(packet.primaryCtaText).toBe("Book your visit today");
    expect(packet.sceneToScriptMap?.length).toBe(7);

    const qa = runCertVideoMachineQa({
      repoRoot,
      packet,
      artifactRelativePath: packet.exportRelativePath,
      expectedEnv: "v1",
      renderEnvUsed: "v1",
      obsoleteCtaForbidden: "Book a visit",
      primaryCta: "Book your visit today",
    });

    const byId = Object.fromEntries(qa.checks.map((c) => [c.id, c]));
    expect(byId.offer_beat_has_$99?.ok).toBe(true);
    expect(byId.deadline_beat_has_may_3_2026?.ok).toBe(true);
    expect(byId.session_beat_has_1030?.ok).toBe(true);
    expect(byId.contact_beat_has_phone?.ok).toBe(true);
    expect(byId.cta_beat_primary?.ok).toBe(true);
    expect(byId.identity_beat_mira_cedar?.ok).toBe(true);
    expect(byId.scene_to_script_map_present?.ok).toBe(true);
    expect(byId.timing_not_equal_5s_slabs?.ok).toBe(true);
    expect(byId.v3_preserved?.ok).toBe(true);
    expect(byId.single_primary_cta_overlay?.ok).toBe(true);
    expect(qa.qaPass).toBe(false);
    expect(qa.customerReady).toBe(false);
    expect(qa.certified).toBe(false);
  });

  it("V5 packet uses SKU narration and covers full voice duration", () => {
    const packet = loadShotstackWorkPacket(
      repoRoot,
      "docs/launch/kitchen-production-cert-video-1/work-packet/work-packet-v5.json",
    );
    expect(packet.scriptVersionId).toBe("cert-video-narration-v1");
    expect(packet.sceneToScriptMap?.length).toBe(6);
    expect(packet.voiceArtifact.contentSha256).not.toBe(
      "d283144563a6fe2075be956fd144fe1c0bb4de29ec55ca308c5b8060c94647e4",
    );

    const qa = runCertVideoMachineQa({
      repoRoot,
      packet,
      artifactRelativePath: packet.exportRelativePath,
      expectedEnv: "v1",
      renderEnvUsed: "v1",
      obsoleteCtaForbidden: "Book a visit",
      primaryCta: "Book your visit today",
    });

    const byId = Object.fromEntries(qa.checks.map((c) => [c.id, c]));
    expect(byId.brand_beat_cedar_lane?.ok).toBe(true);
    expect(byId.offer_beat_has_$99?.ok).toBe(true);
    expect(byId.deadline_beat_has_may_3_2026?.ok).toBe(true);
    expect(byId.session_beat_has_1030?.ok).toBe(true);
    expect(byId.contact_beat_has_phone?.ok).toBe(true);
    expect(byId.cta_beat_primary?.ok).toBe(true);
    expect(byId.sku_narration_duration_band?.ok).toBe(true);
    expect(byId.no_certification_only_narration_beats?.ok).toBe(true);
    expect(byId.not_bound_to_voice_cert_39s_fixture?.ok).toBe(true);
    expect(byId.timeline_covers_full_narration?.ok).toBe(true);
    expect(byId.v4_preserved?.ok).toBe(true);
    expect(byId.identity_beat_mira_cedar).toBeUndefined();
    expect(qa.qaPass).toBe(false);
  });
});
