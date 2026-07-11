import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";
import type { StudioUser } from "@/lib/campaign-store/types";
import {
  readFieldToken,
  seedCustomerFieldTokensFromProjectDetails,
  updateCustomerField,
} from "@/lib/customer-field-tokens";

import {
  appendActivityEvent,
  applyInformationUpdateRequest,
  submitInformationUpdateRequest,
} from "./actions";
import { emptyProjectActivityEnvelope } from "./store";

const clientUser: StudioUser = {
  id: "client-1",
  email: "client@example.com",
  displayName: "Client",
  roles: ["client"],
  currentCampaignId: "camp-1",
};

const staffUser: StudioUser = {
  id: "owner-1",
  email: "owner@studio.local",
  displayName: "Owner",
  roles: ["owner"],
};

function campaign(): CampaignRecord {
  const now = new Date().toISOString();
  const base: CampaignRecord = {
    campaignId: "camp-1",
    campaignName: "Test",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Test",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: { ...EMPTY_PROJECT_DETAILS_FORM, primaryApproverEmail: "old@example.com" },
      files: [],
      submittedAt: now,
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
  };
  return seedCustomerFieldTokensFromProjectDetails(base);
}

describe("submitInformationUpdateRequest", () => {
  it("deduplicates by idempotency key", async () => {
    const campaignId = "camp-iu-dedup";
    const first = await submitInformationUpdateRequest({
      campaignId,
      user: clientUser,
      idempotencyKey: "idem-1",
      targetKey: "primary_approver_email",
      requestedValue: "new@example.com",
      campaign: { ...campaign(), campaignId },
    });
    const second = await submitInformationUpdateRequest({
      campaignId,
      user: clientUser,
      idempotencyKey: "idem-1",
      targetKey: "primary_approver_email",
      requestedValue: "new@example.com",
      campaign: { ...campaign(), campaignId },
    });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.request.id).toBe(first.request.id);
    expect(second.envelope.requests).toHaveLength(1);
  });

  it("returns 409 when the same idempotency key is reused with a different payload", async () => {
    const campaignId = "camp-iu-conflict";
    const first = await submitInformationUpdateRequest({
      campaignId,
      user: clientUser,
      idempotencyKey: "idem-conflict",
      targetKey: "destination_url",
      requestedValue: "https://same.example",
      campaign: { ...campaign(), campaignId },
    });
    const conflict = await submitInformationUpdateRequest({
      campaignId,
      user: clientUser,
      idempotencyKey: "idem-conflict",
      targetKey: "destination_url",
      requestedValue: "https://different.example",
      campaign: { ...campaign(), campaignId },
    });

    expect(first.ok).toBe(true);
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.status).toBe(409);
  });
});

describe("appendActivityEvent", () => {
  it("does not duplicate events with the same sourceType and sourceId", () => {
    let envelope = emptyProjectActivityEnvelope("camp-1");
    envelope = appendActivityEvent(envelope, {
      kind: "request_received",
      sourceType: "information_update_request",
      sourceId: "req-1",
      actor: { role: "customer", userId: "client-1" },
      headline: "Request received",
    });
    envelope = appendActivityEvent(envelope, {
      kind: "request_received",
      sourceType: "information_update_request",
      sourceId: "req-1",
      actor: { role: "customer", userId: "client-1" },
      headline: "Request received",
    });
    expect(envelope.events).toHaveLength(1);
  });
});

describe("applyInformationUpdateRequest stale token guard", () => {
  it("refuses apply when the official field revision changed", async () => {
    const campaignId = "camp-iu-stale";
    const campaignRecord = { ...campaign(), campaignId };
    const submitted = await submitInformationUpdateRequest({
      campaignId,
      user: clientUser,
      idempotencyKey: "idem-2",
      targetKey: "primary_approver_email",
      requestedValue: "new@example.com",
      campaign: campaignRecord,
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    let classified = submitted.envelope;
    const { classifyInformationUpdateRequest } = await import("./actions");
    const classifiedResult = await classifyInformationUpdateRequest({
      campaignId,
      requestId: submitted.request.id,
      user: staffUser,
      classification: "information_update",
    });
    expect(classifiedResult.ok).toBe(true);
    if (!classifiedResult.ok) return;
    classified = classifiedResult.envelope;

    const changedCampaign = updateCustomerField(campaignRecord, "primary_approver_email", "other@example.com");
    expect(readFieldToken(changedCampaign, "primary_approver_email")?.revision).toBe(2);

    const { upsertCampaignRecord } = await import("@/lib/campaign-store/store");
    const { withAuthorizedCustomerFieldWrite } = await import("@/lib/customer-field-tokens");
    await withAuthorizedCustomerFieldWrite(() => upsertCampaignRecord(changedCampaign, "client-1"));

    const applyResult = await applyInformationUpdateRequest({
      campaignId,
      requestId: submitted.request.id,
      user: staffUser,
    });

    expect(applyResult.ok).toBe(false);
    if (applyResult.ok) return;
    expect(applyResult.conflict).toBe(true);
    expect(applyResult.status).toBe(409);
  });
});
