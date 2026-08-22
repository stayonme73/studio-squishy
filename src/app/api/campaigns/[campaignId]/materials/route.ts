import { NextResponse } from "next/server";

import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
import { studioMaterialsUploadV1 } from "@/config/studio-materials-upload-v1";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { createServerFileRoomStorageAdapter } from "@/lib/file-storage/server";
import {
  canReadMaterials,
  canReviewMaterials,
  canSubmitMaterials,
  isMaterialsTeamAudience,
} from "@/lib/materials/access";
import {
  applyClientSubmitConsolidated,
  applyClientSubmitItem,
  applyTeamReview,
  isFilenameOnlyFileMetadataClaim,
} from "@/lib/materials/actions";
import {
  customerStoredReceiptMessage,
  storeAndAttachCustomerMaterialFile,
} from "@/lib/materials/client-file-store";
import { applyExceptionStatusOnClientMaterialSubmit } from "@/lib/materials/promotion";
import { resolveUnderlyingItemIdsForConsolidated } from "@/lib/materials/client-requests";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import {
  resolveCampaignCommunicationClientId,
  syncJobCommunicationRecords,
} from "@/lib/job-control/communication";
import { reevaluateSystemFinalDeliveryAfterMaterialChange } from "@/lib/job-control/final-delivery-actions";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import type { ClientSubmitPayload } from "@/lib/materials/payload-validation";
import { syncMaterialsSummaryOnCampaign } from "@/lib/materials/campaign-summary";
import { resolveMaterialsApiPayload } from "@/lib/materials/materials-view";
import { getOrInitializeMaterials, writeMaterialsEnvelope } from "@/lib/materials/store";
import { recoverPaidOperatingChain } from "@/lib/studio-paid-activation-recovery";
import { ensureDispatchExecution } from "@/lib/studio-dispatch";
import { deliverLifecycleNoticesForCampaign } from "@/lib/studio-lifecycle-email/campaign";
import {
  applyCustomerWithdrawFile,
  resolveWithdrawTargetItemId,
} from "@/lib/studio-customer-content-intake";
import type { MaterialReviewStatus, ServerMaterialsEnvelope } from "@/lib/materials/types";
import { appendMaterialActivityEvent } from "@/lib/project-activity/actions";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

type MaterialsPatchBody =
  | {
      action: "client_submit_consolidated";
      consolidatedItemId: string;
      payload: ClientSubmitPayload;
    }
  | {
      action: "client_submit";
      itemId: string;
      payload: ClientSubmitPayload;
    }
  | {
      action: "team_review";
      itemId: string;
      reviewStatus: MaterialReviewStatus;
      teamNote?: string;
    }
  | {
      action: "customer_withdraw_file";
      itemId?: string;
      consolidatedItemId?: string;
    };

function resolveMaterialsAudience(
  request: Request,
  user: StudioUser,
  campaignId: string,
  campaignEnvelope: ServerCampaignEnvelope,
  assignments: CampaignAssignmentsFile,
): "client" | "team" {
  const requestedAudience = new URL(request.url).searchParams.get("audience");
  if (requestedAudience === "client") return "client";
  return isMaterialsTeamAudience(user, campaignId, campaignEnvelope, assignments)
    ? "team"
    : "client";
}

function disableClientSubmissions<T extends { canSubmit: boolean }>(
  requests: readonly T[] | undefined,
): T[] | undefined {
  return requests?.map((request) => ({ ...request, canSubmit: false }));
}

function asUploadedFile(value: FormDataEntryValue | null): File | null {
  if (!value || typeof value === "string") return null;
  if (typeof File !== "undefined" && value instanceof File) return value;
  return null;
}

export async function GET(request: Request, context: RouteContext) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const { campaignId } = await context.params;
  const [campaignEnvelope, assignments] = await Promise.all([
    readCampaignEnvelope(campaignId),
    readCampaignAssignments(),
  ]);

  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!canReadMaterials(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const materialsEnvelope = await getOrInitializeMaterials(campaignId, campaignEnvelope.record);
  const audience = resolveMaterialsAudience(request, user, campaignId, campaignEnvelope, assignments);
  const payload = resolveMaterialsApiPayload(materialsEnvelope, audience, campaignEnvelope.record);
  const canSubmit = canSubmitMaterials(user, campaignId, campaignEnvelope);

  return NextResponse.json({
    ...payload,
    consolidatedRequests:
      audience === "client" && !canSubmit
        ? disableClientSubmissions(payload.consolidatedRequests)
        : payload.consolidatedRequests,
    optionalRequests:
      audience === "client" && !canSubmit
        ? disableClientSubmissions(payload.optionalRequests)
        : payload.optionalRequests,
    syncedAt: materialsEnvelope.syncedAt,
  });
}

async function syncAfterClientSubmit(input: {
  campaignId: string;
  campaignEnvelope: ServerCampaignEnvelope;
  assignments: CampaignAssignmentsFile;
  user: StudioUser;
  request: Request;
  saved: ServerMaterialsEnvelope;
  tasksEnvelope: ServerTasksEnvelope;
  submittedItemIds: string[];
  receiptMessage?: string;
  headline?: string;
  detail?: string;
}) {
  if (input.submittedItemIds.length > 0) {
    const sourceId = `${input.submittedItemIds.join(",")}:${input.saved.version}`;
    await appendMaterialActivityEvent({
      campaignId: input.campaignId,
      kind: "material_submitted",
      sourceId,
      headline: input.headline ?? "File information sent",
      detail: input.detail ?? "We received your material submission.",
      actor: {
        role: input.user.roles.includes("client") ? "customer" : "staff",
        userId: input.user.id,
        displayName: input.user.displayName,
      },
    });
  }

  const clientId = resolveCampaignCommunicationClientId(
    input.campaignEnvelope.clientUserId,
    input.campaignEnvelope.campaignId,
  );
  let tasksEnvelope = input.tasksEnvelope;

  if (input.submittedItemIds.length > 0) {
    const updatedTasks = applyExceptionStatusOnClientMaterialSubmit(tasksEnvelope, input.submittedItemIds);
    const synced = syncJobRecordsFromCampaign(
      input.campaignEnvelope.record,
      updatedTasks.tasks ?? [],
      input.saved.items,
      updatedTasks.exceptionRecords ?? [],
      updatedTasks.jobRecords,
    );
    const jobs = applyWaitingOnClientPolicies(synced, input.saved.items);
    const communicationSync = syncJobCommunicationRecords({
      envelope: updatedTasks,
      campaign: input.campaignEnvelope.record,
      clientId,
      jobs,
      materials: input.saved.items,
    });
    tasksEnvelope = communicationSync.envelope;
  }

  const releaseRetry = reevaluateSystemFinalDeliveryAfterMaterialChange({
    envelope: tasksEnvelope,
    campaign: input.campaignEnvelope.record,
    materials: input.saved.items,
    clientId,
  });
  if (input.submittedItemIds.length > 0 || releaseRetry.releasedJobIds.length > 0) {
    await writeTasksEnvelope(releaseRetry.envelope);
  }

  const audience = resolveMaterialsAudience(
    input.request,
    input.user,
    input.campaignId,
    input.campaignEnvelope,
    input.assignments,
  );
  const payload = resolveMaterialsApiPayload(input.saved, audience, input.campaignEnvelope.record);
  await syncMaterialsSummaryOnCampaign(input.campaignId, payload.blockingRequiredCount);

  if (input.campaignEnvelope.record.paymentTruth?.status === "confirmed") {
    const latest = await readCampaignEnvelope(input.campaignId);
    if (latest?.record) {
      const recovered = await recoverPaidOperatingChain(latest.record);
      if (recovered.alreadyClear && recovered.campaign) {
        await ensureDispatchExecution(recovered.campaign);
      }
    }
  }
  await deliverLifecycleNoticesForCampaign(input.campaignId);

  return NextResponse.json({
    ...payload,
    receiptMessage: input.receiptMessage,
    syncedAt: input.saved.syncedAt,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const { campaignId } = await context.params;
  const [campaignEnvelope, assignments] = await Promise.all([
    readCampaignEnvelope(campaignId),
    readCampaignAssignments(),
  ]);

  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!canReadMaterials(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    if (!canSubmitMaterials(user, campaignId, campaignEnvelope)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await request.formData();
    const action = String(form.get("action") ?? "");
    const itemId = String(form.get("itemId") ?? "").trim() || undefined;
    const consolidatedItemId = String(form.get("consolidatedItemId") ?? "").trim() || undefined;
    const file = asUploadedFile(form.get("file"));
    const basisRaw = String(form.get("useAuthorizationBasis") ?? "").trim();
    const useAuthorizationBasis =
      basisRaw === "customer_owns" ||
      basisRaw === "customer_has_permission" ||
      basisRaw === "studio_generated" ||
      basisRaw === "studio_controlled_licensed" ||
      basisRaw === "provider_licensed"
        ? basisRaw
        : undefined;
    const parseBool = (key: string): boolean | undefined => {
      const raw = String(form.get(key) ?? "").trim().toLowerCase();
      if (!raw) return undefined;
      if (raw === "true" || raw === "1" || raw === "yes" || raw === "on") return true;
      if (raw === "false" || raw === "0" || raw === "no" || raw === "off") return false;
      return undefined;
    };

    if (
      (action !== "client_submit" && action !== "client_submit_consolidated") ||
      (action === "client_submit" && !itemId) ||
      (action === "client_submit_consolidated" && !consolidatedItemId)
    ) {
      return NextResponse.json({ error: "A matching material request is required." }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json(
        { error: studioMaterialsUploadV1.customerCopy.missingFile },
        { status: 400 },
      );
    }

    const materialsEnvelope = await getOrInitializeMaterials(campaignId, campaignEnvelope.record);
    const tasksEnvelope = await getOrGenerateTasks(campaignId, campaignEnvelope.record);
    const stored = await storeAndAttachCustomerMaterialFile({
      adapter: createServerFileRoomStorageAdapter(),
      campaign: campaignEnvelope.record,
      campaignClientUserId: campaignEnvelope.clientUserId,
      tasks: tasksEnvelope,
      materials: materialsEnvelope,
      user,
      file,
      itemId,
      consolidatedItemId,
      useAuthorizationBasis,
      rightsInput: {
        useAuthorizationBasis,
        cropAdaptPermitted: parseBool("cropAdaptPermitted"),
        commercialUsePermitted: parseBool("commercialUsePermitted"),
        attributionRequired: parseBool("attributionRequired"),
        likenessConsentConfirmed: parseBool("likenessConsentConfirmed"),
        thirdPartyRightsConfirmed: parseBool("thirdPartyRightsConfirmed"),
      },
    });
    if (!stored.ok) {
      return NextResponse.json({ error: stored.error }, { status: stored.status });
    }

    const saved = await writeMaterialsEnvelope(stored.materials);
    await writeTasksEnvelope(stored.tasks);
    const submittedItemIds = saved.items
      .filter((item) => item.uploadStatus === "stored" && item.storageRef?.checksumSha256 === stored.checksumSha256)
      .map((item) => item.id);

    return syncAfterClientSubmit({
      campaignId,
      campaignEnvelope,
      assignments,
      user,
      request,
      saved,
      tasksEnvelope: stored.tasks,
      submittedItemIds,
      receiptMessage: customerStoredReceiptMessage(stored.duplicate),
      headline: stored.duplicate ? "File already on this project" : "We received your file",
      detail: customerStoredReceiptMessage(stored.duplicate),
    });
  }

  let body: MaterialsPatchBody;
  try {
    body = (await request.json()) as MaterialsPatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const materialsEnvelope = await getOrInitializeMaterials(campaignId, campaignEnvelope.record);
  let result:
    | ReturnType<typeof applyClientSubmitConsolidated>
    | ReturnType<typeof applyClientSubmitItem>
    | ReturnType<typeof applyTeamReview>
    | ReturnType<typeof applyCustomerWithdrawFile>;
  let submittedItemIds: string[] = [];

  switch (body.action) {
    case "client_submit_consolidated": {
      if (!canSubmitMaterials(user, campaignId, campaignEnvelope)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!body.consolidatedItemId || !body.payload) {
        return NextResponse.json({ error: "consolidatedItemId and payload are required" }, { status: 400 });
      }
      submittedItemIds = [
        ...resolveUnderlyingItemIdsForConsolidated(materialsEnvelope, body.consolidatedItemId),
      ];
      if (isFilenameOnlyFileMetadataClaim(body.payload, materialsEnvelope.items.filter((item) => submittedItemIds.includes(item.id)))) {
        return NextResponse.json(
          { error: studioMaterialsUploadV1.customerCopy.filenameOnlyRejected },
          { status: 400 },
        );
      }
      result = applyClientSubmitConsolidated(
        materialsEnvelope,
        body.consolidatedItemId,
        body.payload,
        user,
      );
      break;
    }
    case "client_submit": {
      if (!canSubmitMaterials(user, campaignId, campaignEnvelope)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!body.itemId || !body.payload) {
        return NextResponse.json({ error: "itemId and payload are required" }, { status: 400 });
      }
      const item = materialsEnvelope.items.find((entry) => entry.id === body.itemId);
      if (item && isFilenameOnlyFileMetadataClaim(body.payload, [item])) {
        return NextResponse.json(
          { error: studioMaterialsUploadV1.customerCopy.filenameOnlyRejected },
          { status: 400 },
        );
      }
      result = applyClientSubmitItem(materialsEnvelope, body.itemId, body.payload, user);
      if (result.ok) submittedItemIds = [body.itemId];
      break;
    }
    case "team_review": {
      if (!canReviewMaterials(user, campaignId, campaignEnvelope, assignments)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!body.itemId || !body.reviewStatus) {
        return NextResponse.json({ error: "itemId and reviewStatus are required" }, { status: 400 });
      }
      result = applyTeamReview(
        materialsEnvelope,
        body.itemId,
        body.reviewStatus,
        body.teamNote,
        user,
      );
      break;
    }
    case "customer_withdraw_file": {
      if (!canSubmitMaterials(user, campaignId, campaignEnvelope)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const withdrawItemId = resolveWithdrawTargetItemId(materialsEnvelope, {
        itemId: body.itemId,
        consolidatedItemId: body.consolidatedItemId,
      });
      if (!withdrawItemId) {
        return NextResponse.json(
          { error: "No stored file is available to withdraw on this request." },
          { status: 400 },
        );
      }
      result = applyCustomerWithdrawFile(materialsEnvelope, withdrawItemId);
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const saved = await writeMaterialsEnvelope(result.envelope);

  if (body.action === "team_review") {
    const kind =
      body.reviewStatus === "approved_for_use"
        ? "material_approved"
        : body.reviewStatus === "needs_clarification"
          ? "material_needs_clarification"
          : null;
    if (kind) {
      await appendMaterialActivityEvent({
        campaignId,
        kind,
        sourceId: `${body.itemId}:${body.reviewStatus}:${saved.version}`,
        headline:
          kind === "material_approved" ? "Material approved" : "Material needs your update",
        actor: {
          role: "staff",
          userId: user.id,
          displayName: user.displayName,
        },
      });
    }
  }

  const tasksEnvelope = await getOrGenerateTasks(campaignId, campaignEnvelope.record);
  return syncAfterClientSubmit({
    campaignId,
    campaignEnvelope,
    assignments,
    user,
    request,
    saved,
    tasksEnvelope,
    submittedItemIds,
    receiptMessage:
      submittedItemIds.length > 0 && body.action !== "team_review"
        ? studioCustomerLifeV1.customerCopy.materialReceivedAck
        : undefined,
  });
}
