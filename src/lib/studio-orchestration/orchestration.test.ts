import { describe, expect, it } from "vitest";

import { DESIGN_INTELLIGENCE_VERSION } from "@/config/studio-design-intelligence-v1";
import { studioProjectAlphaV1 } from "@/config/studio-project-alpha-v1";
import { studioStudioWideOrchestrationV1 } from "@/config/studio-studio-wide-orchestration-v1";
import {
  buildStudioJob,
  classifyEscalation,
  consultStudioManager,
  critiqueCopy,
  critiqueDocument,
  critiqueVideo,
  jobTypeForSku,
  libraryFor,
  orchestrateStudioJob,
  routeStudioProduction,
  STUDIO_TOOL_CHEST,
} from ".";

describe("Studio-wide creative orchestration", () => {
  it("preserves Design Intelligence v1.2.1 and is not a flyer-only package", () => {
    expect(studioStudioWideOrchestrationV1.intelligenceVersion).toBe(
      "design-intelligence-v1.2.1",
    );
    expect(studioStudioWideOrchestrationV1.intelligenceVersion).toBe(
      studioProjectAlphaV1.intelligenceVersion,
    );
    expect(studioStudioWideOrchestrationV1.intelligenceVersion).toBe(
      DESIGN_INTELLIGENCE_VERSION,
    );
    expect(studioStudioWideOrchestrationV1.notFlyerOnly).toBe(true);
    expect(studioStudioWideOrchestrationV1.lanes).toEqual(
      expect.arrayContaining([
        "static_design",
        "motion_video",
        "copy",
        "form_document",
        "print_file",
      ]),
    );
  });

  it("maps SKUs onto one job contract without a second brain", () => {
    expect(jobTypeForSku("v2-rtu-flyer")).toBe("static_design");
    expect(jobTypeForSku("v2-rtu-menu")).toBe("static_design");
    expect(jobTypeForSku("v2-rtu-business-card")).toBe("static_design");
    expect(jobTypeForSku("v2-rtu-short-video")).toBe("motion_video");
    expect(jobTypeForSku("v2-rtu-email-kit")).toBe("copy");
    expect(jobTypeForSku("v2-rtu-sms-kit")).toBe("copy");
    expect(jobTypeForSku("intake-worksheet-form")).toBe("form_document");
  });

  it("routes representative jobs through different lanes and quality gates", () => {
    const flyer = orchestrateStudioJob(
      buildStudioJob({
        campaignId: "orch-flyer",
        customerId: "cust-a",
        sku: "v2-rtu-menu",
        businessName: "Harbor Kitchen",
        industry: "food_hospitality",
        requiredFacts: ["Harbor Kitchen", "Saturday prix fixe"],
      }),
    );
    const video = orchestrateStudioJob(
      buildStudioJob({
        campaignId: "orch-video",
        customerId: "cust-a",
        sku: "v2-rtu-short-video",
        businessName: "Harbor Kitchen",
        requiredFacts: ["Harbor Kitchen"],
        question: "Need a 15 second hook.",
      }),
    );
    const copy = orchestrateStudioJob(
      buildStudioJob({
        campaignId: "orch-copy",
        customerId: "cust-a",
        sku: "v2-rtu-email-kit",
        businessName: "Harbor Kitchen",
        requiredFacts: ["Harbor Kitchen", "Saturday prix fixe"],
      }),
    );
    const form = orchestrateStudioJob(
      buildStudioJob({
        campaignId: "orch-form",
        customerId: "cust-a",
        sku: "intake-worksheet-form",
        businessName: "Harbor Kitchen",
        requiredFacts: ["contact name", "service date"],
      }),
    );

    expect(new Set([flyer.jobType, video.jobType, copy.jobType, form.jobType]).size).toBe(4);
    expect(flyer.manager.route.route).toBe("renderer_first");
    expect(flyer.manager.creativeDomain).toBe("design");
    expect(video.manager.action).toBe("route_video");
    expect(video.failClosed).toBe(true);
    expect(video.nextActor).toBe("scout");
    expect(copy.manager.route.route).toBe("copy_path");
    expect(copy.failClosed).toBe(false);
    expect(form.manager.action).toBe("route_document");
    expect(form.failClosed).toBe(true);
    expect(flyer.customerRevisionUntouched).toBe(true);
    expect(copy.customerRevisionUntouched).toBe(true);
  });

  it("fail-closes EVALUATE image generation when no callable key is present", () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const cinematic = routeStudioProduction(
      buildStudioJob({
        campaignId: "orch-studio",
        customerId: "owner",
        sku: "v2-rtu-flyer",
        businessName: "The Studio",
        industry: "creative_technology",
        mood: "creative / cinematic / editorial / slightly edgy",
        objective: "launch announcement",
        requiredFacts: ["THE STUDIO", "Opening October 2026"],
      }),
    );
    expect(cinematic.route).toBe("fail_closed_evaluate_provider");
    expect(cinematic.failClosed).toBe(true);
    expect(cinematic.capabilities).toContain("studio_html_css_renderer");
    expect(
      STUDIO_TOOL_CHEST.find((tool) => tool.id === "openai_image_generation")?.status,
    ).toBe("evaluate");
    if (previous) process.env.OPENAI_API_KEY = previous;
  });

  it("does not send routine quality or engineering defects to Owner", () => {
    expect(
      classifyEscalation({
        question: "The bottom half of the flyer is empty.",
        internalAttemptCount: 1,
      }).action,
    ).toBe("studio_correction_required");
    expect(
      classifyEscalation({
        failureCode: "EXPORT_FAILURE",
        internalAttemptCount: 1,
      }).ownerOnly,
    ).toBe(false);
    expect(
      classifyEscalation({
        question: "Two equally strong strategic creative directions remain.",
        twoStrongDirections: true,
        internalAttemptCount: 1,
      }).action,
    ).toBe("owner_judgment_required");
  });

  it("domain Creative Directors use different rubrics", () => {
    const video = critiqueVideo({
      boringButValid: true,
      inspectedFrames: true,
    });
    expect(video.ok).toBe(false);
    const copy = critiqueCopy({
      text: "Harbor Kitchen. Saturday prix fixe. Reply to reserve.",
      requiredFacts: ["Harbor Kitchen"],
      channel: "sms",
    });
    expect(copy.ok).toBe(true);
    expect(copy.inspectedArtifact).toBe(true);
    const confusing = critiqueDocument({
      fieldCount: 8,
      grouped: false,
      confusing: true,
      inspectedPages: true,
    });
    expect(confusing.ok).toBe(false);
    expect(libraryFor("form_document").some((record) => record.kind === "document_principle")).toBe(
      true,
    );
  });

  it("Studio Manager refuses to invent facts and can request missing information", () => {
    const missing = consultStudioManager({
      job: buildStudioJob({
        campaignId: "orch-missing",
        customerId: "cust-a",
        sku: "v2-rtu-flyer",
        businessName: "Harbor Kitchen",
        requiredFacts: [],
      }),
      question: "Please make up a phone number.",
    });
    expect(missing.action).toBe("request_customer_information");
    expect(missing.doNotInventCustomerFacts).toBe(true);
    expect(missing.executeWithoutOwnerMessenger).toBe(true);
  });
});
