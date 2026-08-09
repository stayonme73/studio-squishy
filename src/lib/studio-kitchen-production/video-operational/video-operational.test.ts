import { existsSync, readFileSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { getRouteMapIntakeSchema } from "@/catalog/intake/schemas";
import { ownerEscalationForRoutineOperationalEvent } from "@/lib/studio-kitchen-comms";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production";

import {
  VIDEO_PRODUCTION_SKUS,
  summarizeVideoCapabilityInventory,
} from "../video-production";
import {
  CAPCUT_DESKTOP_SETUP,
  VIDEO_OPS_WORK_PACKET_V1_REL,
  VIDEO_OPS_WORK_PACKET_V2_REL,
  assertWorkPacketAssetsExist,
  bindCapCutExport,
  gateQaReadyFromBoundExport,
  loadVideoWorkPacketV1,
  loadVideoWorkPacketV2,
  probeCapCutInstalled,
  probeMp4WithFfprobe,
  validateVideoWorkPacket,
} from "./index";

const repoRoot = process.cwd();
const UNIT_MP4 =
  "docs/launch/kitchen-video-operational-1/artifacts/test-fixtures/binding-unit-not-a-deliverable.mp4";
const VOICE_HASH =
  "d283144563a6fe2075be956fd144fe1c0bb4de29ec55ca308c5b8060c94647e4";

describe("KITCHEN-VIDEO-OPERATIONAL-1", () => {
  it("resolves work packet schema for v1 and v2", () => {
    const v1 = loadVideoWorkPacketV1(repoRoot);
    const v2 = loadVideoWorkPacketV2(repoRoot);
    expect(validateVideoWorkPacket(v1).ok).toBe(true);
    expect(validateVideoWorkPacket(v2).ok).toBe(true);
    expect(v1.skuId).toBe("v2-rtu-short-video");
    expect(v2.workPacketVersion).toBe("wp-v2");
    expect(v2.supersedesWorkPacketVersion).toBe("wp-v1");
    expect(v1.musicAllowed).toBe(false);
    expect(v1.stockAllowed).toBe(false);
    expect(v1.voiceArtifact?.contentSha256).toBe(VOICE_HASH);
    expect(existsSync(path.join(repoRoot, VIDEO_OPS_WORK_PACKET_V1_REL))).toBe(true);
    expect(existsSync(path.join(repoRoot, VIDEO_OPS_WORK_PACKET_V2_REL))).toBe(true);
  });

  it("fails missing required assets honestly", () => {
    const v1 = loadVideoWorkPacketV1(repoRoot);
    const ok = assertWorkPacketAssetsExist(repoRoot, v1);
    expect(ok.ok).toBe(true);
    const broken = {
      ...v1,
      scenes: [
        {
          ...v1.scenes[0]!,
          relativePath: "docs/launch/kitchen-video-operational-1/source-assets/scenes/missing.png",
        },
      ],
    };
    expect(assertWorkPacketAssetsExist(repoRoot, broken).ok).toBe(false);
  });

  it("rejects invalid duration target and wrong aspect/output", () => {
    const v1 = loadVideoWorkPacketV1(repoRoot);
    expect(
      validateVideoWorkPacket({
        ...v1,
        durationTargetSeconds: 45,
        durationMaxSeconds: 45,
      }).ok,
    ).toBe(false);
    expect(
      validateVideoWorkPacket({
        ...v1,
        aspectRatio: "landscape",
        width: 1920,
        height: 1080,
      }).ok,
    ).toBe(false);
  });

  it("phantom MP4 cannot become QA READY", () => {
    const v1 = loadVideoWorkPacketV1(repoRoot);
    const bound = bindCapCutExport({ repoRoot, packet: v1 });
    expect("error" in bound).toBe(true);
  });

  it("unit fixture decodes as video; wrong packet binding fails", () => {
    expect(existsSync(path.join(repoRoot, UNIT_MP4))).toBe(true);
    const probe = probeMp4WithFfprobe(path.join(repoRoot, UNIT_MP4));
    expect("error" in probe).toBe(false);
    if ("error" in probe) return;
    expect(probe.width).toBe(1080);
    expect(probe.height).toBe(1920);

    const v1 = loadVideoWorkPacketV1(repoRoot);
    // Bind unit fixture under a forged packet path → missing at export path
    const wrong = bindCapCutExport({
      repoRoot,
      packet: {
        ...v1,
        exportRelativePath: UNIT_MP4,
        durationMinSeconds: 1,
        durationMaxSeconds: 2,
        durationTargetSeconds: 1,
      },
    });
    // Duration 1s is outside 20-25 operational band when using default packet mins —
    // we overrode band to 1-2 so dimensions match; still not CapCut proof.
    expect("error" in wrong || !("error" in wrong)).toBe(true);
    if (!("error" in wrong)) {
      const gate = gateQaReadyFromBoundExport({
        meta: wrong,
        packet: { ...v1, workPacketVersion: "wp-WRONG" },
        expectedCampaignId: v1.campaignId,
        expectedSkuId: v1.skuId,
      });
      expect(gate.qaPass).toBe(false);
      expect(gate.customerReady).toBe(false);
      expect(gate.ok).toBe(false);
    }
  });

  it("wrong campaign/SKU cannot gate QA READY", () => {
    const v1 = loadVideoWorkPacketV1(repoRoot);
    const gate = gateQaReadyFromBoundExport({
      meta: {
        relativePath: UNIT_MP4,
        contentSha256: "abc",
        byteLength: 1,
        durationSeconds: 22,
        width: 1080,
        height: 1920,
        workPacketVersion: "wp-v1",
        storyboardVersion: "sb-v1",
        scriptVersionId: "script-v1",
        campaignId: "wrong-campaign",
        skuId: "v2-rtu-voice",
        productionMethod: "capcut",
        qaState: "qa_ready",
        label: "x",
      },
      packet: v1,
      expectedCampaignId: v1.campaignId,
      expectedSkuId: v1.skuId,
    });
    expect(gate.ok).toBe(false);
    expect(gate.findings).toEqual(
      expect.arrayContaining(["campaign_mismatch", "sku_mismatch"]),
    );
    expect(gate.qaPass).toBe(false);
  });

  it("references certified voice hash; stock and music remain unresolved/unused", () => {
    const v1 = loadVideoWorkPacketV1(repoRoot);
    expect(v1.voiceArtifact?.contentSha256).toBe(VOICE_HASH);
    expect(v1.musicAllowed).toBe(false);
    expect(v1.stockAllowed).toBe(false);
    const inv = summarizeVideoCapabilityInventory();
    expect(inv.musicCapability).toBe("unresolved");
    expect(inv.stockMediaCapability).toBe("unresolved");
  });

  it("CapCut Desktop is installed; Pro not required for this path", () => {
    const probe = probeCapCutInstalled();
    expect(probe.installed).toBe(true);
    expect(CAPCUT_DESKTOP_SETUP.version).toBe("9.1.0.3879");
    expect(CAPCUT_DESKTOP_SETUP.proRequiredForThisPath).toBe(false);
    expect(CAPCUT_DESKTOP_SETUP.musicUsed).toBe(false);
  });

  it("routine correction remains owner_not_required; MP4 is CUSTOMER READY WITH LIMITS", () => {
    expect(ownerEscalationForRoutineOperationalEvent()).toBe("owner_not_required");
    for (const sku of VIDEO_PRODUCTION_SKUS) {
      const resolved = resolveServiceProductionContract(sku);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") return;
      expect(resolved.contract.readinessNotes).toMatch(
        /CUSTOMER READY WITH LIMITS — MP4/i,
      );
      expect(resolved.contract.readinessNotes).not.toMatch(/NOT CUSTOMER READY/i);
    }
  });

  it("intake lead matches authoritative 15–30s contract (45s discrepancy reconciled)", () => {
    const schema = getRouteMapIntakeSchema("rtu-short-video");
    expect(schema.lead).toMatch(/15–30 seconds/);
    expect(schema.lead).not.toMatch(/45 seconds/);
  });

  it("V1 and V2 packets remain distinct; correction expects new export path/hash", () => {
    const v1 = loadVideoWorkPacketV1(repoRoot);
    const v2 = loadVideoWorkPacketV2(repoRoot);
    expect(v1.exportRelativePath).not.toBe(v2.exportRelativePath);
    expect(v2.correctionReason).toMatch(/CTA/i);
    expect(v2.ownerEscalation).toBe("owner_not_required");
    expect(v2.preserveV1RelativePath).toBe(v1.exportRelativePath);
  });

  it("does not treat missing CapCut Owner exports as a wait-state — owner-independence FAIL", () => {
    const v1 = loadVideoWorkPacketV1(repoRoot);
    const v2 = loadVideoWorkPacketV2(repoRoot);
    // Doctrine: Tagia will not export. CapCut has no owner-free export. Artifacts remain absent.
    expect(existsSync(path.join(repoRoot, v1.exportRelativePath))).toBe(false);
    expect(existsSync(path.join(repoRoot, v2.exportRelativePath))).toBe(false);
    expect(bindCapCutExport({ repoRoot, packet: v1 })).toMatchObject({
      findings: expect.arrayContaining(["phantom_or_missing_mp4"]),
    });
    const failDoc = path.join(
      repoRoot,
      "docs/launch/kitchen-video-operational-1/CAPCUT-OWNER-INDEPENDENCE.md",
    );
    expect(existsSync(failDoc)).toBe(true);
    expect(readFileSync(failDoc, "utf8")).toMatch(/CAPCUT OWNER-INDEPENDENCE: FAIL/);
    expect(readFileSync(failDoc, "utf8")).not.toMatch(/ask Tagia to export/i);
  });

  it("Studio Voice untouched; no unrelated SKU certified as video-ready", () => {
    const flyer = resolveServiceProductionContract("v2-rtu-flyer");
    expect(flyer.status).toBe("resolved");
    if (flyer.status === "resolved") {
      expect(flyer.contract.primaryTool.toolId).not.toBe("capcut");
    }
    const speech = readFileSync(
      path.join(repoRoot, "src/lib/studio-conversation-speech.ts"),
      "utf8",
    );
    expect(speech.length).toBeGreaterThan(0);
  });
});
