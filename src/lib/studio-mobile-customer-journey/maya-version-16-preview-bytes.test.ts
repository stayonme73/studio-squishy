import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { canClientAccessReviewProofFile } from "@/lib/file-storage/access";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { StudioFileReference } from "@/lib/file-registry/types";

/**
 * MJ-D26 — Review Room serves File Room bytes, not the design-artifact folder.
 * Version 16 identity is already on the record. These bytes must be present.
 */
const MAYA_V16_SHA256 =
  "812c40c634a1a22f58aebf00dad4e37a3e014eac7ad8ce69a48f290db70f5c2e";

const FILE_ROOM_PNG = join(
  process.cwd(),
  "data/file-room-objects/clients/unclaimed-client-716a15b6-d8d6-436c-8f84-9e8b40d2f959/campaigns/716a15b6-d8d6-436c-8f84-9e8b40d2f959/jobs/716a15b6-d8d6-436c-8f84-9e8b40d2f959-v2-rtu-flyer/review_proof/Version-16/flyer-version-16.png",
);

const ARTIFACT_PNG = join(
  process.cwd(),
  "data/campaign-design-artifacts/716a15b6-d8d6-436c-8f84-9e8b40d2f959/dd_716a15b6-d8d6-436c-8f84-9e8b40d2f959_v2-rtu-flyer/renders/v16/flyer.png",
);

describe("MJ-D26 — Maya Version 16 Review preview bytes", () => {
  it("keeps the File Room proof object that Review Room actually loads", () => {
    expect(existsSync(FILE_ROOM_PNG)).toBe(true);
    const bytes = readFileSync(FILE_ROOM_PNG);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(MAYA_V16_SHA256);
    expect(bytes.length).toBe(50555);
  });

  it("does not invent a new Version 16 — artifact and File Room match", () => {
    expect(existsSync(ARTIFACT_PNG)).toBe(true);
    const artifact = readFileSync(ARTIFACT_PNG);
    const room = readFileSync(FILE_ROOM_PNG);
    expect(createHash("sha256").update(artifact).digest("hex")).toBe(MAYA_V16_SHA256);
    expect(room.equals(artifact)).toBe(true);
  });

  it("lets Customer-One load the unclaimed-client proof because they own the Maya envelope", () => {
    const tasks = JSON.parse(
      readFileSync(
        join(process.cwd(), "data/campaign-tasks/716a15b6-d8d6-436c-8f84-9e8b40d2f959.json"),
        "utf8",
      ),
    ) as { jobRecords: PurchasedJobRecord[] };
    const job = tasks.jobRecords.find(
      (entry) => entry.jobId === "716a15b6-d8d6-436c-8f84-9e8b40d2f959:v2-rtu-flyer",
    );
    const proofs = (job?.fileRegistry ?? []).filter(
      (entry: StudioFileReference) => entry.filename === "flyer-version-16.png",
    );
    const file = proofs[proofs.length - 1];
    expect(job).toBeTruthy();
    expect(file?.id).toBe(
      "proof:716a15b6-d8d6-436c-8f84-9e8b40d2f959:v2-rtu-flyer:review_proof:2026-09-15T18:31:35.775Z",
    );
    expect(file?.clientId).toBe("unclaimed-client:716a15b6-d8d6-436c-8f84-9e8b40d2f959");

    const customerOne = {
      id: "local-customer-one",
      email: "customer-one@local.dev",
      displayName: "Maya",
      roles: ["client"] as const,
      clientCampaignIds: [] as string[],
    };

    expect(
      canClientAccessReviewProofFile({
        user: customerOne,
        job: job!,
        file: file!,
      }).allowed,
    ).toBe(false);
    expect(
      canClientAccessReviewProofFile({
        user: customerOne,
        job: job!,
        file: file!,
        campaignClientUserId: "local-customer-one",
      }).allowed,
    ).toBe(true);

    const proofRoute = readFileSync(
      join(process.cwd(), "src/app/api/file-room/files/[fileId]/proof/route.ts"),
      "utf8",
    );
    expect(proofRoute).toContain("campaignClientUserId: match.campaignEnvelope?.clientUserId");
  });
});
