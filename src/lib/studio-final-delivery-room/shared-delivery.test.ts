import { describe, expect, it } from "vitest";

import type { ClientJobDeliveryView } from "@/lib/job-control/final-delivery-view";

import {
  buildReleasedDeliveryPresentation,
  selectReleasedDeliveryJob,
} from "./shared-delivery";

function job(overrides: Partial<ClientJobDeliveryView> = {}): ClientJobDeliveryView {
  return {
    jobId: "camp:social_and_promo_graphics",
    serviceName: "Social & Promo Graphics",
    spineStatus: "ready_for_delivery",
    deliveredAt: "2026-10-18T00:00:00.000Z",
    completedDeliverables: [],
    files: [
      {
        id: "file-1",
        deliverableLabel: "Campaign graphic — square",
        fileName: "Campaign-Graphic-Square.png",
        fileType: "image/png",
        url: "/api/file-room/files/file-1/download",
        useInstructions: null,
        addedAt: "2026-10-18T00:00:00.000Z",
        versionLabel: "Version 2",
        releasedAt: "2026-10-18T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("shared final delivery room", () => {
  it("builds the box from the released job and omits Clip-only copy", () => {
    const presentation = buildReleasedDeliveryPresentation({
      campaignId: "camp",
      campaignName: "Harbor & Oak Home Services",
      job: job(),
    });
    expect(presentation?.serviceName).toBe("Social & Promo Graphics");
    expect(presentation?.customerName).toBe("Harbor & Oak Home Services");
    expect(presentation?.files[0]?.versionLabel).toBe("Version 2");
    expect(presentation?.files[0]?.href).toBe("/api/file-room/files/file-1/download");
    expect(presentation?.thanks.join(" ")).not.toMatch(/five finished vertical shorts|Clip-Repurposing-Short/i);
  });

  it("does not open the conveyor for a job that is not released", () => {
    expect(
      buildReleasedDeliveryPresentation({
        campaignId: "camp",
        campaignName: "Harbor",
        job: job({ spineStatus: "ready_for_review", files: job().files }),
      }),
    ).toBeNull();
    expect(
      buildReleasedDeliveryPresentation({
        campaignId: "camp",
        campaignName: "Harbor",
        job: job({ files: [] }),
      }),
    ).toBeNull();
  });

  it("refuses another job when a specific job was requested", () => {
    const social = job();
    const clip = job({
      jobId: "camp:clip_repurposing",
      serviceName: "Clip Repurposing",
      files: [
        {
          ...job().files[0]!,
          id: "clip-file",
          fileName: "Short-01.mp4",
          fileType: "video/mp4",
        },
      ],
    });
    expect(selectReleasedDeliveryJob([social, clip], social.jobId)?.jobId).toBe(social.jobId);
    expect(selectReleasedDeliveryJob([social, clip], "camp:missing")).toBeNull();
    expect(selectReleasedDeliveryJob([social, clip], null)).toBeNull();
  });
});
