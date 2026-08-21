import { describe, expect, it } from "vitest";

import {
  ROOM_4_MEDIA_NATURALNESS_INDEPENDENT_QA_ID,
  STUDIO_DEFECT_CORRECTION_DOCTRINE_V1,
  studioRoom4MediaNaturalnessIndependentQaV1 as req,
} from "@/config/studio-room-4-media-naturalness-independent-qa-v1";
import { ROUTE_MAP_REVISION_DRAWER_ITEMS } from "@/catalog/route-map-shared-copy";

describe("ROOM-4-MEDIA-NATURALNESS-INDEPENDENT-QA", () => {
  it("stays required and not certified", () => {
    expect(req.requirementId).toBe(ROOM_4_MEDIA_NATURALNESS_INDEPENDENT_QA_ID);
    expect(req.status).toBe("REQUIRED_NOT_CERTIFIED");
    expect(req.closed).toBe(false);
    expect(req.doNotFalselyMarkComplete).toBe(true);
    expect(req.notYetFullyAutomated).toEqual([
      "independent_ai_listener_synthetic_narration_naturalness",
    ]);
    expect(req.listeningRule.customerListeningApprovalMandatory).toBe(true);
    expect(req.listeningRule.routineAudioApprovalRequiresTagia).toBe(false);
    expect(req.listeningRule.consumesRevisionAllowance).toBe(false);
    expect(
      req.listeningRule.silentReleaseOfUnresolvedVoiceQualityFailureForbidden,
    ).toBe(true);
  });

  it("treats choppy or robotic speech as a no-charge Studio defect", () => {
    expect(STUDIO_DEFECT_CORRECTION_DOCTRINE_V1.studioMistakesAreNotCustomerRevisions).toBe(
      true,
    );
    expect(STUDIO_DEFECT_CORRECTION_DOCTRINE_V1.doesNotConsumeRevisionAllowance).toBe(
      true,
    );
    expect(STUDIO_DEFECT_CORRECTION_DOCTRINE_V1.voiceQualityExamples).toEqual(
      expect.arrayContaining(["choppy narration", "robotic narration"]),
    );
    expect(
      ROUTE_MAP_REVISION_DRAWER_ITEMS.some((item) =>
        item.includes("choppy or robotic Studio narration"),
      ),
    ).toBe(true);
  });
});
