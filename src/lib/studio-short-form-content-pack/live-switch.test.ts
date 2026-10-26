import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { getRouteMapIntakeSchema } from "@/catalog/intake";
import { helpCenter } from "@/config/help-center";
import { studioPolicies } from "@/config/policies";
import { getRouteMapJob } from "@/config/route-map-v1";
import {
  CLIP_REPURPOSING_BOUNDARY_SENTENCE,
  LEARN_MORE_PURPOSE,
  CHECKOUT_LEAD,
} from "@/config/studio-short-form-content-pack-public-switch-v1";
import { shortFormContentPackContractV1 } from "@/config/studio-short-form-content-pack-v1";
import { FOOTAGE_EDITING_INTAKE_TEMPLATE } from "@/config/studio-short-form-video-editing-launch-integration-v1";

const SKU = "v2-rtu-short-form-video-edit";

describe("live Short-Form Content Pack public switch", () => {
  it("switches Learn More, checkout/intake, and Help Center together at 349", () => {
    const service = getServiceById(SKU);
    const job = getRouteMapJob(SKU);
    const intake = getRouteMapIntakeSchema(FOOTAGE_EDITING_INTAKE_TEMPLATE);
    const difference = studioPolicies.faq.items.find(
      (item) => item.id === "short-form-content-pack-difference",
    );
    const fourMinute = studioPolicies.faq.items.find(
      (item) => item.id === "short-form-content-pack-four-minute",
    );
    const contract = studioPolicies.faq.items.find(
      (item) => item.id === "short-form-content-pack-contract",
    );

    expect(service?.name).toBe("Short-Form Content Pack");
    expect(service?.priceCents).toBe(34900);
    expect(job?.name).toBe("Short-Form Content Pack");
    expect(job?.priceCents).toBe(34900);
    expect(job?.purpose).toBe(LEARN_MORE_PURPOSE);
    expect(job?.purpose).not.toMatch(/finds the strongest/i);
    expect(job?.purpose).not.toMatch(/one 15–30 second/i);
    expect(job?.clientResponsibilities.join(" ")).toMatch(/45 seconds or less/i);
    expect(job?.exclusions.join(" ")).toMatch(/not guaranteed/i);
    expect(job?.exclusions.join(" ")).not.toMatch(/Maya/i);
    expect(job?.exclusions.join(" ")).not.toMatch(/\$549/);

    expect(intake.title).toBe("Here is what you will need");
    expect(intake.lead).toBe(CHECKOUT_LEAD);
    expect(intake.lead).not.toMatch(/finds the strongest/i);
    expect(intake.fields.some((field) => field.id === "segmentCapConfirm")).toBe(
      true,
    );

    expect(difference?.question).toBe(
      "What is the difference between Short-Form Video Editing and Clip Repurposing?",
    );
    const differenceText =
      difference?.blocks[0] && "text" in difference.blocks[0] ? difference.blocks[0].text : "";
    expect(differenceText).toMatch(/45 seconds or less/i);
    expect(differenceText).not.toMatch(/\$349|4 minutes/i);
    const fourMinuteText =
      fourMinute?.blocks[0] && "text" in fourMinute.blocks[0] ? fourMinute.blocks[0].text : "";
    expect(fourMinuteText).toMatch(/45 seconds or less/i);
    expect(fourMinuteText).not.toMatch(/\$349|4 minutes/i);
    expect(contract?.question).toMatch(/Short-Form Video Editing include/i);
    const contractText = contract?.blocks
      .map((block) => ("text" in block ? block.text : ""))
      .join(" ");
    expect(contractText).toMatch(/three revision rounds/i);
    expect(contractText).not.toMatch(/1 revision round/i);
    expect(
      helpCenter.faqGroups.some(
        (group) =>
          group.id === "short-form-content-pack" &&
          group.faqIds.includes("short-form-content-pack-difference"),
      ),
    ).toBe(true);
    expect(JSON.stringify(studioPolicies.faq.items)).not.toMatch(/\$549/);
    expect(LEARN_MORE_PURPOSE).toContain(CLIP_REPURPOSING_BOUNDARY_SENTENCE);
    expect(shortFormContentPackContractV1.priceCents).toBe(34900);
  });
});
