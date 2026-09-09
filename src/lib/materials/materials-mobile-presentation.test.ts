import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { isCeremonialMaterialsRoutingState } from "@/lib/materials/materials-mobile-presentation";
import { studioCustomerContentRightsAttestationV1 } from "@/config/studio-customer-content-rights-attestation-v1";

describe("materials mobile presentation", () => {
  it("treats only received/cleared routing as ceremonial phone copy", () => {
    expect(isCeremonialMaterialsRoutingState("CLEARED_FOR_PRODUCTION")).toBe(true);
    expect(isCeremonialMaterialsRoutingState("RECEIVED")).toBe(true);
    expect(isCeremonialMaterialsRoutingState("CLEARED_WITH_LIMITS")).toBe(false);
    expect(isCeremonialMaterialsRoutingState("QUARANTINED")).toBe(false);
    expect(isCeremonialMaterialsRoutingState("REJECTED")).toBe(false);
  });

  it("does not change Gate X attestation language", () => {
    expect(studioCustomerContentRightsAttestationV1.version).toBe(
      "gate-x-rights-attestation-v1-2026-08-22-honest-hold",
    );
    expect(studioCustomerContentRightsAttestationV1.uploadAuthority).toContain(
      "I own this file",
    );
    expect(studioCustomerContentRightsAttestationV1.commercialUse).toContain(
      "commercial work",
    );
    const fields = readFileSync(
      join(process.cwd(), "src/components/materials/FileRightsCertificationFields.tsx"),
      "utf8",
    );
    expect(fields).toContain("copy.disclaimer");
    expect(fields).toContain("copy.uploadAuthority");
    expect(fields).toContain("copy.commercialUse");
    expect(fields).toContain("copy.cropAdapt");
    expect(fields).toContain("copy.recognizablePeopleQuestion");
    expect(fields).toContain("copy.thirdPartyMaterialQuestion");
    expect(fields).toContain("Rights for this file");
  });

  it("uses a phone-only glance wrapper and hides repeat copy on the spine", () => {
    const workflow = readFileSync(
      join(process.cwd(), "src/components/studio-board/StudioBoardMaterialsWorkflow.tsx"),
      "utf8",
    );
    expect(workflow).toContain("sb-materials-glance");
    expect(workflow).toContain("sb-materials-copy-repeat");
    const surfaces = readFileSync(
      join(process.cwd(), "src/app/mobile-customer-spine-surfaces.css"),
      "utf8",
    );
    expect(surfaces).toContain(".sb-materials-glance");
    expect(surfaces).toContain(".sb-materials-copy-repeat");
    expect(surfaces).toContain("backdrop-filter: blur(14px) saturate(1.04) brightness(1.1)");
    expect(surfaces).toContain(".sb-card--materials");
    expect(surfaces).toContain("--mc-glass-strong");
    expect(surfaces).toContain(".sb-materials-intake__item + .sb-materials-intake__item");
    const intake = readFileSync(
      join(process.cwd(), "src/components/materials/MaterialsIntakePanel.tsx"),
      "utf8",
    );
    expect(intake).toContain("sb-materials-intake__reason sb-materials-copy-repeat");
    const board = readFileSync(join(process.cwd(), "src/app/studio-board.css"), "utf8");
    expect(board).toContain("display: contents;");
    expect(board).toContain(".sb-materials-glance");
  });
});
