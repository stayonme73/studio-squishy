import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";

import { applyOwnerAttentionSignal, type OwnerAttentionLedger } from "./owner-attention-signal";
import { routeCoordinationAttention, type CoordinationAttentionInput } from "./route-attention";

const EVIDENCE_PATH = path.join(tmpdir(), "studio-coordination-certification-evidence.json");
const ATTENTION_PATH = "docs/launch/project-alpha-attention-state.json";
const CAMPAIGN_PATH = "data/campaigns/messy-customer-social-promo-recovery.json";
const TASKS_PATH = "data/campaign-tasks/messy-customer-social-promo-recovery.json";

function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function exception(
  overrides: Partial<CampaignExceptionRecord> & Pick<CampaignExceptionRecord, "id" | "kind" | "status">,
): CampaignExceptionRecord {
  return {
    campaignId: "synthetic-coordination",
    title: "Synthetic exception",
    description: "customer@example.test private note",
    createdAt: "2026-10-19T00:00:00.000Z",
    updatedAt: "2026-10-19T00:00:00.000Z",
    raisedByUserId: "staff",
    raisedByDisplayName: "Cedar Lane",
    raisedByRole: "producer_dispatcher",
    ...overrides,
  };
}

function handoff(overrides: Partial<CoordinationAttentionInput> = {}): CoordinationAttentionInput {
  return {
    campaignId: "synthetic-coordination",
    campaignStatus: "READY_FOR_REVIEW",
    jobs: [
      {
        jobId: "synthetic-coordination:social_and_promo_graphics",
        skuId: "social_and_promo_graphics",
        spineStatus: "ready_for_delivery",
      },
    ],
    tasks: [{ taskId: "campaign:producer-kickoff", phase: "strategy", workflowState: "needs_revision" }],
    qualityFindings: [
      { taskId: "graphics:qa", action: "qa_block", category: "direction_disagreement" },
      { taskId: "copy:qa", action: "qa_block", category: "compliance_concern" },
      { taskId: "layout:qa", action: "qa_fail", category: "production_correction" },
    ],
    exceptions: [
      exception({ id: "scope-1", kind: "scope_change", status: "waiting_owner" }),
      exception({ id: "hold-1", kind: "compliance_hold", status: "waiting_owner", taskId: "copy:qa" }),
      exception({ id: "hold-internal", kind: "compliance_hold", status: "waiting_internal" }),
      exception({ id: "routine-1", kind: "routine_internal", status: "waiting_internal" }),
    ],
    ...overrides,
  };
}

function pendingReasons(ledger: OwnerAttentionLedger): string[] {
  return ledger.alerts.filter((row) => row.pending).map((row) => row.reason);
}

describe("synthetic coordination certification", () => {
  it("certifies the machine, quality, and owner handoff without a live alert", () => {
    const before = {
      attention: sha256(ATTENTION_PATH),
      campaign: sha256(CAMPAIGN_PATH),
      tasks: sha256(TASKS_PATH),
    };
    const campaignFile = JSON.parse(readFileSync(CAMPAIGN_PATH, "utf8")) as {
      record: { campaignId: string; campaignStatus: string; campaignName: string };
    };
    const tasksFile = JSON.parse(readFileSync(TASKS_PATH, "utf8")) as {
      campaignId: string;
      jobRecords: { jobId: string; spineStatus: string }[];
      qaRecords: { id?: string; taskId: string; action: string; category?: string | null }[];
      tasks: { id: string; workflowState: string }[];
      exceptionRecords?: unknown[];
    };

    const live = routeCoordinationAttention({
      campaignId: tasksFile.campaignId,
      campaignStatus: campaignFile.record.campaignStatus as "READY_FOR_REVIEW",
      jobs: tasksFile.jobRecords.map((job) => ({
        jobId: job.jobId,
        skuId: "social_and_promo_graphics",
        spineStatus: job.spineStatus as "ready_for_delivery",
      })),
      tasks: tasksFile.tasks.map((task) => ({
        taskId: task.id,
        phase: null,
        workflowState: task.workflowState,
      })),
      qualityFindings: tasksFile.qaRecords.map((finding) => ({
        taskId: finding.taskId,
        action: finding.action as "qa_pass",
        category: finding.category ?? null,
      })),
      exceptions: [],
    });

    const input = handoff();
    const jobsBefore = JSON.stringify(input.jobs);
    const findingsBefore = JSON.stringify(input.qualityFindings);
    const exceptionsBefore = JSON.stringify(input.exceptions);
    const routed = routeCoordinationAttention(input);
    const first = applyOwnerAttentionSignal({ attention: routed, now: "2026-10-19T21:40:00.000Z" });
    const second = applyOwnerAttentionSignal({
      attention: routed,
      ledger: first.ledger,
      now: "2026-10-19T21:41:00.000Z",
    });
    const directionResolved = routeCoordinationAttention(
      handoff({
        qualityFindings: [
          { taskId: "copy:qa", action: "qa_block", category: "compliance_concern" },
          { taskId: "layout:qa", action: "qa_fail", category: "production_correction" },
        ],
      }),
    );
    const afterOneResolved = applyOwnerAttentionSignal({
      attention: directionResolved,
      ledger: second.ledger,
      now: "2026-10-19T21:42:00.000Z",
    });
    const allResolved = applyOwnerAttentionSignal({
      attention: routeCoordinationAttention(
        handoff({
          campaignStatus: "BUILDING_CONCEPTS",
          jobs: [
            {
              jobId: "synthetic-coordination:social_and_promo_graphics",
              skuId: "social_and_promo_graphics",
              spineStatus: "building_concepts",
            },
          ],
          tasks: [],
          qualityFindings: [{ taskId: "layout:qa", action: "qa_pass", category: null }],
          exceptions: [
            exception({ id: "scope-1", kind: "scope_change", status: "resolved" }),
            exception({ id: "hold-1", kind: "compliance_hold", status: "resolved", taskId: "copy:qa" }),
          ],
        }),
      ),
      ledger: afterOneResolved.ledger,
      now: "2026-10-19T21:43:00.000Z",
    });

    const ledgerBeforeFailure = JSON.stringify(first.ledger);
    const missingChannel = spawnSync(process.execPath, ["scripts/owner-attention-channel-missing.mjs"], {
      encoding: "utf8",
      windowsHide: true,
    });
    const ledgerAfterFailure = JSON.stringify(first.ledger);
    const replayAfterFailure = applyOwnerAttentionSignal({
      attention: routed,
      ledger: first.ledger,
      now: "2026-10-19T21:44:00.000Z",
    });

    const evidence = {
      machineRecord: {
        source: "jobRecords",
        campaignId: tasksFile.campaignId,
        spineStatus: tasksFile.jobRecords.map((job) => job.spineStatus),
      },
      qualityRecord: {
        source: "qaRecords",
        count: tasksFile.qaRecords.length,
        actions: tasksFile.qaRecords.map((finding) => finding.action),
      },
      recordsAreSeparate: tasksFile.jobRecords !== (tasksFile.qaRecords as unknown),
      liveOwnerAlerts: live.ownerAlerts.length,
      liveRoutineDestinations: live.routineRoutes.map((route) => route.proposedDestination),
      ownerAlertReasons: routed.ownerAlerts.map((route) => ({
        reason: route.ownerDeskReason,
        key: route.attentionKey ?? `${route.source}|${route.ownerDeskReason}`,
      })),
      routineDestinations: [...new Set(routed.routineRoutes.map((route) => route.proposedDestination))],
      firstPending: pendingReasons(first.ledger),
      firstAlertIds: first.ledger.alerts.map((row) => row.alertId),
      duplicatePending: pendingReasons(second.ledger),
      duplicateLedgerLength: second.ledger.alerts.length,
      duplicateNotify: second.signal.notifyKind,
      afterDirectionResolved: afterOneResolved.ledger.alerts.map((row) => ({
        reason: row.reason,
        pending: row.pending,
        resolvedAt: row.resolvedAt,
      })),
      allResolvedState: allResolved.signal.state,
      allResolvedPending: allResolved.ledger.alerts.map((row) => row.pending),
      channel: {
        script: "scripts/owner-attention-channel-missing.mjs",
        exitStatus: missingChannel.status,
        ledgerUnchanged: ledgerBeforeFailure === ledgerAfterFailure,
        replayPending: pendingReasons(replayAfterFailure.ledger),
        replayDuplicate: replayAfterFailure.signal.duplicate,
        acknowledged: JSON.stringify(replayAfterFailure.ledger).includes("acknowledged"),
        delivered: replayAfterFailure.signal.delivered,
      },
      inputsUnchanged:
        jobsBefore === JSON.stringify(input.jobs) &&
        findingsBefore === JSON.stringify(input.qualityFindings) &&
        exceptionsBefore === JSON.stringify(input.exceptions),
      filesUnchanged: {
        attention: sha256(ATTENTION_PATH) === before.attention,
        campaign: sha256(CAMPAIGN_PATH) === before.campaign,
        tasks: sha256(TASKS_PATH) === before.tasks,
      },
      signalContainsCustomerText: /@|Cedar Lane|private note/.test(
        JSON.stringify({ first: first.signal, routed: routed.ownerAlerts, live }),
      ),
      liveCampaignNamePresent: JSON.stringify(live).includes(campaignFile.record.campaignName),
    };
    writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

    expect(tasksFile.jobRecords.length).toBeGreaterThan(0);
    expect(tasksFile.qaRecords.length).toBeGreaterThan(0);
    expect(evidence.recordsAreSeparate).toBe(true);
    expect(evidence.liveOwnerAlerts).toBe(0);
    expect(evidence.liveRoutineDestinations).toContain("machine");
    expect(evidence.liveRoutineDestinations).toContain("production");
    expect(new Set(evidence.firstPending)).toEqual(
      new Set(["direction_disagreement", "compliance_hold", "scope_issue"]),
    );
    expect(evidence.firstAlertIds).toHaveLength(3);
    expect(evidence.duplicateLedgerLength).toBe(3);
    expect(evidence.duplicateNotify).toBe("none");
    expect(afterOneResolved.ledger.alerts.find((row) => row.reason === "direction_disagreement")?.pending).toBe(
      false,
    );
    expect(afterOneResolved.ledger.alerts.filter((row) => row.pending).map((row) => row.reason).sort()).toEqual([
      "compliance_hold",
      "scope_issue",
    ]);
    expect(evidence.allResolvedState).toBe("GREEN");
    expect(evidence.allResolvedPending.every((pending) => pending === false)).toBe(true);
    expect(evidence.channel.exitStatus).not.toBe(0);
    expect(evidence.channel.ledgerUnchanged).toBe(true);
    expect(evidence.channel.replayPending.sort()).toEqual(
      ["compliance_hold", "direction_disagreement", "scope_issue"].sort(),
    );
    expect(evidence.channel.replayDuplicate).toBe(true);
    expect(evidence.channel.acknowledged).toBe(false);
    expect(evidence.channel.delivered).toBe(false);
    expect(evidence.inputsUnchanged).toBe(true);
    expect(evidence.filesUnchanged).toEqual({ attention: true, campaign: true, tasks: true });
    expect(evidence.signalContainsCustomerText).toBe(false);
    expect(evidence.liveCampaignNamePresent).toBe(false);
    expect(routed.notificationSent).toBe(false);
    expect(routed.jobChanged).toBe(false);
  });
});
