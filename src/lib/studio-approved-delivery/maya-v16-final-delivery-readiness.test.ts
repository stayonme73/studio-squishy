import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { requiredClientDeliveryFileLabelsForJob } from "@/lib/approved-plan-line";
import type { CampaignRecord } from "@/config/studio-board";
import { canApproveJobForDelivery } from "@/lib/job-control/review-room-gates";
import { canClientAccessJobDelivery } from "@/lib/job-control/final-delivery-access";
import {
  allRequiredClientDeliveryFilesAssembled,
  canOwnerFinalRelease,
  canSystemAuthorizeFinalDelivery,
  materialContextFromLedger,
  materialContextUnavailable,
} from "@/lib/job-control/final-delivery-gates";
import { canClientAccessFinalDeliveryFile } from "@/lib/file-storage/access";
import type { JobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { jobHasUnresolvedMaterialUseHold } from "@/lib/studio-material-use";
import {
  evaluateApprovalMatchForRelease,
  isEligibleForDelivery,
} from "@/lib/studio-approved-delivery";
import { contentSha256Hex, sameContentSha256 } from "@/lib/studio-review-revision/hash";

const MAYA_CAMPAIGN_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const PIN_HASHES = [
  "812c40c634a1a22f58aebf00dad4e37a3e014eac7ad8ce69a48f290db70f5c2e",
  "375ff88238f300b4ad63f6934a8ac9d3636a12fb11d3fd5e4a11298630c02d90",
] as const;

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), rel), "utf8")) as T;
}

describe("Maya Version 16 Final Delivery readiness (read-only live job)", () => {
  const tasks = loadJson<{
    jobRecords?: PurchasedJobRecord[];
    jobReviewFeedback?: JobReviewFeedback[];
  }>(`data/campaign-tasks/${MAYA_CAMPAIGN_ID}.json`);
  const campaignEnvelope = loadJson<{
    record?: CampaignRecord;
    clientUserId?: string | null;
  }>(`data/campaigns/${MAYA_CAMPAIGN_ID}.json`);
  const materialsEnvelope = existsSync(
    path.join(process.cwd(), "data/campaign-materials", `${MAYA_CAMPAIGN_ID}.json`),
  )
    ? loadJson<{ items?: CampaignMaterialItem[] }>(
        `data/campaign-materials/${MAYA_CAMPAIGN_ID}.json`,
      )
    : null;
  const users = loadJson<{ id: string; currentCampaignId?: string | null }[]>(
    "data/studio-users.json",
  );

  const job = tasks.jobRecords?.[0];
  const campaign = campaignEnvelope.record;
  const materials = materialsEnvelope?.items ?? null;
  const approval = job?.customerApprovedArtifactAuthorization;
  const customerOne = users.find((user) => user.id === "local-customer-one");
  const latestApproval = [...(tasks.jobReviewFeedback ?? [])]
    .filter((row) => row.jobId === job?.jobId && row.submissionType === "approved_for_delivery")
    .at(-1);

  it("keeps flyer-v16 pinned and does not remint Customer-One", () => {
    expect(job).toBeTruthy();
    expect(approval?.status).toBe("CUSTOMER_APPROVED");
    expect(approval?.workVersionId).toBe("flyer-v16");
    expect(approval?.contentSha256s).toEqual([...PIN_HASHES]);
    expect(customerOne?.currentCampaignId ?? null).toBeNull();
  });

  it("has both promised Version 16 files registered, hashed, and readable on disk", () => {
    expect(job && campaign).toBeTruthy();
    if (!job || !campaign) return;
    const required = requiredClientDeliveryFileLabelsForJob(campaign, job);
    expect(required).toEqual([
      "Print-ready PDF",
      "Digital PNG or JPG version for sharing online (one agreed size)",
    ]);
    expect(allRequiredClientDeliveryFilesAssembled(job, required)).toBe(true);
    const cdf = job.clientDeliveryFiles ?? [];
    expect(cdf).toHaveLength(2);
    expect(new Set(cdf.map((file) => file.registryFileId)).size).toBe(2);

    for (const file of cdf) {
      expect(file.versionLabel).toBe("Version 16");
      expect(file.approvedWorkVersionId).toBe("flyer-v16");
      expect(file.releaseStatus).toBe("released");
      expect(PIN_HASHES.some((hash) => sameContentSha256(hash, file.contentSha256))).toBe(true);
      const objectPath =
        file.storageRef && "objectPath" in file.storageRef
          ? String(file.storageRef.objectPath)
          : "";
      expect(objectPath).toBeTruthy();
      const abs = path.join(process.cwd(), "data/file-room-objects", ...objectPath.split("/"));
      expect(existsSync(abs)).toBe(true);
      const bytes = readFileSync(abs);
      expect(statSync(abs).size).toBeGreaterThan(1000);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        contentSha256Hex(file.contentSha256 ?? ""),
      );
    }
  });

  it("evaluates the real release gate without inventing an empty materials ledger", () => {
    expect(job && campaign).toBeTruthy();
    if (!job || !campaign) return;
    const required = requiredClientDeliveryFileLabelsForJob(campaign, job);
    const unavailable = canSystemAuthorizeFinalDelivery(
      job,
      required,
      materialContextUnavailable(),
    );
    expect(unavailable.allowed).toBe(false);
    expect(unavailable.reasons.some((reason) => reason.code === "materials_ledger_unavailable")).toBe(
      true,
    );

    expect(materials).not.toBeNull();
    const live = materialContextFromLedger(materials ?? []);
    const hold = jobHasUnresolvedMaterialUseHold(materials ?? [], job.campaignId, job.skuId);
    const gate = canSystemAuthorizeFinalDelivery(job, required, live);
    const match = evaluateApprovalMatchForRelease({ job });

    expect(isEligibleForDelivery(match)).toBe(true);
    expect(canOwnerFinalRelease(job, live).allowed).toBe(false);
    expect(
      canApproveJobForDelivery({
        job,
        feedback: latestApproval!,
        allDeliverablesPrepared: true,
        deliverableCount: 2,
      }).allowed,
    ).toBe(false);

    expect(job.spineStatus).toBe("ready_for_delivery");
    expect({
      materialCount: materials?.length ?? 0,
      materialHold: hold,
      systemAllowed: gate.allowed,
      systemReasons: gate.reasons.map((reason) => reason.code),
      ownerExceptionAllowed: canOwnerFinalRelease(job, live).allowed,
      clientCanOpenDelivery: canClientAccessJobDelivery(job),
    }).toMatchObject({
      materialHold: false,
      systemAllowed: false,
      systemReasons: expect.arrayContaining(["wrong_status"]),
      ownerExceptionAllowed: false,
      clientCanOpenDelivery: true,
    });
  });

  it("will not expose Version 17 or a foreign customer even after identity match", () => {
    expect(job).toBeTruthy();
    if (!job) return;
    const v17 = [...(job.clientDeliveryFiles ?? []), ...(job.fileRegistry ?? [])].some((entry) => {
      const version = "versionLabel" in entry ? entry.versionLabel : undefined;
      const name =
        "fileName" in entry ? entry.fileName : "filename" in entry ? entry.filename : "";
      return version === "Version 17" && ("releaseStatus" in entry || entry.category === "final_delivery");
    });
    expect(v17).toBe(false);
    const stranger = {
      id: "other-client",
      email: "other@local.dev",
      displayName: "Other",
      roles: ["client" as const],
      currentCampaignId: "not-maya",
    };
    const releasedHypothetical = {
      ...job,
      spineStatus: "ready_for_delivery" as const,
    };
    const file = releasedHypothetical.fileRegistry?.find((ref) => ref.category === "final_delivery");
    expect(file).toBeTruthy();
    if (!file) return;
    expect(
      canClientAccessFinalDeliveryFile({
        user: stranger,
        job: releasedHypothetical,
        file,
        campaignClientUserId: "local-customer-one",
      }).allowed,
    ).toBe(false);
  });
});
