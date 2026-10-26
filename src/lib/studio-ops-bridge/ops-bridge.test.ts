import { spawn, spawnSync } from "child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import { describe, expect, it } from "vitest";

import {
  OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
  studioChatgptScoutOpsBridgeV1,
} from "@/config/studio-chatgpt-scout-ops-bridge-v1";
import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";

import {
  OPS_BRIDGE_PATHS,
  consumeInboundDecision,
  redactSecrets,
  validateInboundDecision,
  writeOutboundSnapshot,
} from "../../../scripts/ops-bridge-lib.mjs";

const SUITE_LOCK = path.join(os.tmpdir(), "studio-ops-bridge-suite-lock-bridge.json");
const SUITE_RESULT = path.join(os.tmpdir(), "studio-ops-bridge-suite-result-bridge.json");
process.env.OPS_BRIDGE_ACTIVE_TASK = SUITE_LOCK;
process.env.OPS_BRIDGE_WORKER_RESULT = SUITE_RESULT;

function authorizedLine(overrides: Record<string, unknown> = {}) {
  return {
    decisionId: `dec-dry-run-${overrides.decisionId ?? "ok"}`,
    authorizer: "OWNER_TAGIA",
    authorized: true,
    at: new Date().toISOString(),
    packageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
    action: "accept_proof",
    scope: "dry-run",
    permittedAction: "Acknowledge the dry-run ops-bridge protocol. Do not merge. Do not push.",
    protectedAction: false,
    mergeAuthorized: false,
    pushAuthorized: false,
    ...overrides,
  };
}

describe("ChatGPT ↔ Scout ops bridge", () => {
  it("writes a redacted outbound snapshot from live heartbeat evidence", () => {
    const snapshot = writeOutboundSnapshot({
      testsResults: "ops-bridge protocol tests running",
      nextDecisionRequired: "Transport check — do not claim zero-courier yet",
    });
    expect(snapshot.kind).toBe("chatgpt_scout_ops_snapshot");
    expect(snapshot.counts.publicLaunchNowPublishedCount).toBe(
      studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount,
    );
    expect(snapshot.counts.internalSellNowCount).toBe(11);
    expect(snapshot.transport.zeroCourierAchieved).toBe(false);
    expect(snapshot.transport.chatgptDotComCanReachLocalhost).toBe(false);
    expect(snapshot.transport.githubConnectorRejected).toBe(true);
    expect(snapshot.transport.publicHttpsHosted).toBe(true);
    expect(snapshot.transport.ownerDeskNotTheChatgptTransport).toBe(true);
    expect(existsSync(OPS_BRIDGE_PATHS.SNAPSHOT_JSON)).toBe(true);
    expect(existsSync(OPS_BRIDGE_PATHS.SNAPSHOT_MD)).toBe(true);
    const daily = readFileSync(OPS_BRIDGE_PATHS.DAILY_BRIDGE, "utf8");
    expect(daily).toContain("<!-- OPS-BRIDGE-LIVE:BEGIN -->");
    expect(daily).toContain(String(snapshot.packageId));
  });

  it("redacts secrets and private-looking values", () => {
    const redacted = redactSecrets({
      note: "key sk_live_abc123XYZ and Bearer tok_secret_99",
      STRIPE_SECRET_KEY: "sk_test_should_not_appear",
    });
    expect(JSON.stringify(redacted)).not.toMatch(/sk_live_/);
    expect(JSON.stringify(redacted)).not.toMatch(/Bearer tok_/);
    expect(redacted.STRIPE_SECRET_KEY).toBe("[REDACTED]");
  });

  it("accepts one Owner-authorized non-protected dry-run decision", () => {
    const result = consumeInboundDecision(
      authorizedLine({ decisionId: `accept-${Date.now()}` }),
      { testsResults: "dry-run accept_proof" },
    );
    expect(result.ok).toBe(true);
    expect(result.acknowledgement.ok).toBe(true);
    expect(result.acknowledgement.scoutActed).toBe(true);
    expect(result.acknowledgement.evidence).toBeUndefined();
    const snapshot = JSON.parse(readFileSync(OPS_BRIDGE_PATHS.SNAPSHOT_JSON, "utf8"));
    expect(snapshot.lastInboundAcknowledgement.ok).toBe(true);
  });

  it("runs a read-only local status report and returns that evidence", () => {
    const result = consumeInboundDecision(
      authorizedLine({
        decisionId: `status-${Date.now()}`,
        action: "report_local_status",
        permittedAction: "Read local work status only. Do not merge. Do not push.",
      }),
      { expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID },
    );
    expect(result.ok).toBe(true);
    expect(result.acknowledgement.scoutActed).toBe(true);
    expect(result.acknowledgement.evidence.kind).toBe("local_work_status");
    expect(result.acknowledgement.evidence.branch).toBeTruthy();
    expect(typeof result.acknowledgement.evidence.dirtyFileCount).toBe("number");
    expect(JSON.stringify(result.acknowledgement.evidence)).not.toMatch(/sk_live_|Bearer /);
  });

  it("runs the allowlisted local test-readiness task and replays the same evidence", () => {
    const decisionId = `readonly-task-${Date.now()}`;
    const line = authorizedLine({
      decisionId,
      action: "run_readonly_task",
      taskId: "local_test_readiness",
      permittedAction:
        "Inspect local test readiness only. Do not change files. Do not merge. Do not push.",
    });
    const first = consumeInboundDecision(line, {
      expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
    });
    expect(first.ok).toBe(true);
    expect(first.acknowledgement.state).toBe("completed");
    expect(first.acknowledgement.scoutActed).toBe(true);
    expect(first.acknowledgement.evidence.kind).toBe("local_test_readiness");
    expect(first.acknowledgement.evidence.source).toBe("ops-bridge-readonly-worker");
    expect(first.acknowledgement.evidence.workerScript).toBe(
      "scripts/ops-bridge-readonly-worker.mjs",
    );
    expect(first.acknowledgement.evidence.workerPid).not.toBe(process.pid);
    expect(first.acknowledgement.evidence.workerExitCode).toBe(0);
    expect(first.acknowledgement.evidence.filesChangedByTask).toBe(false);
    expect(first.acknowledgement.evidence.vitestInstalled).toBe(true);
    expect(first.acknowledgement.evidence.testScript).toBeTruthy();
    const states = readFileSync(OPS_BRIDGE_PATHS.ACK_JSONL, "utf8")
      .trim()
      .split(/\r?\n/)
      .map((row) => JSON.parse(row))
      .filter((row) => row.decisionId === decisionId)
      .map((row) => row.state);
    expect(states).toEqual(["accepted", "running", "completed"]);
    const second = consumeInboundDecision(line, {
      expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
    });
    expect(second.idempotent).toBe(true);
    expect(second.acknowledgement.evidence.readAt).toBe(first.acknowledgement.evidence.readAt);
    expect(existsSync(SUITE_LOCK)).toBe(false);
  });

  it("reports synthetic machine and quality records without customer text or a completion claim", () => {
    const campaign = JSON.parse(
      readFileSync("data/campaigns/messy-customer-social-promo-recovery.json", "utf8"),
    ) as { record: { campaignName?: string; campaignDescription?: string } };
    const decisionId = `machine-quality-${Date.now()}`;
    const line = authorizedLine({
      decisionId,
      action: "run_readonly_task",
      taskId: "synthetic_machine_quality_status",
      permittedAction:
        "Read the synthetic machine and quality status only. Do not change jobs. Do not message the customer. Do not merge. Do not push.",
    });
    const result = consumeInboundDecision(line, {
      expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
    });
    expect(result.ok).toBe(true);
    const evidence = result.acknowledgement.evidence;
    expect(result.acknowledgement.state).toBe("completed");
    expect(result.acknowledgement.scoutActed).toBe(true);
    expect(evidence.kind).toBe("synthetic_machine_quality_status");
    expect(evidence.authority).toBe("machine_campaign_tasks");
    expect(evidence.qualityAuthority).toBe("qa_records");
    expect(evidence.scoutClaim).toBeNull();
    expect(evidence.completionClaim).toBeNull();
    expect(evidence.customerCommunicationsSent).toBe(0);
    expect(evidence.handoffChangedJobs).toBe(false);
    expect(evidence.filesChangedByTask).toBe(false);
    expect(evidence.workerPid).not.toBe(process.pid);
    expect(evidence.syntheticCampaignId).toBe("messy-customer-social-promo-recovery");
    expect(evidence.jobs[0].spineStatus).toBe("ready_for_delivery");
    expect(evidence.jobs[0].source).toBe("purchased_job_record");
    expect(evidence.dispositions).toEqual({
      quality: "PASS",
      fail: false,
      blocked: false,
      waitingOnOwner: false,
    });
    expect(evidence.qualityFindings[0]).toMatchObject({
      taskId: "social_and_promo_graphics:qa",
      disposition: "PASS",
      action: "qa_pass",
      source: "qa_records",
    });
    expect(evidence.machineTasks).toContainEqual({
      taskId: "campaign:producer-kickoff",
      phase: "strategy",
      workflowState: "needs_revision",
      source: "campaign_tasks",
    });
    expect(evidence.ownerJudgment.required).toBe(false);
    const serialized = JSON.stringify(evidence);
    expect(serialized).not.toContain(campaign.record.campaignName);
    if (campaign.record.campaignDescription) {
      expect(serialized).not.toContain(campaign.record.campaignDescription);
    }
    expect(serialized).not.toMatch(/@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    expect(serialized).not.toMatch(/sk_live_|sk_test_|Bearer /);
    const replay = consumeInboundDecision(line, {
      expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
    });
    expect(replay.idempotent).toBe(true);
    expect(replay.acknowledgement.evidence.readAt).toBe(evidence.readAt);
  });

  it("does not start the worker for an unauthorized assignment", () => {
    const rejected = consumeInboundDecision(
      authorizedLine({
        decisionId: `readonly-unsigned-${Date.now()}`,
        action: "run_readonly_task",
        taskId: "local_test_readiness",
        authorized: false,
        permittedAction:
          "Inspect local test readiness only. Do not change files. Do not merge. Do not push.",
      }),
      { expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID },
    );
    expect(rejected.ok).toBe(false);
    expect(rejected.reason).toBe("unsigned_or_unapproved");
    expect(rejected.acknowledgement.scoutActed).toBe(false);
    expect(rejected.acknowledgement.evidence).toBeUndefined();
    expect(rejected.acknowledgement.state).toBeUndefined();
  });

  it("rejects a worker task outside the allowlist before it writes evidence", () => {
    const out = path.join(os.tmpdir(), "studio-ops-bridge-worker-result.json");
    if (existsSync(out)) unlinkSync(out);
    const rejected = spawnSync(
      process.execPath,
      [
        "scripts/ops-bridge-readonly-worker.mjs",
        "--task",
        "run_shell",
        "--decision",
        "worker-reject",
        "--out",
        out,
      ],
      { cwd: process.cwd(), encoding: "utf8", windowsHide: true },
    );
    expect(rejected.status).toBe(2);
    expect(existsSync(out)).toBe(false);
  });

  it("leaves no evidence when the worker is interrupted", async () => {
    const out = path.join(os.tmpdir(), "studio-ops-bridge-worker-result.json");
    if (existsSync(out)) unlinkSync(out);
    const child = spawn(
      process.execPath,
      [
        "scripts/ops-bridge-readonly-worker.mjs",
        "--task",
        "local_test_readiness",
        "--decision",
        `worker-hold-${Date.now()}`,
        "--out",
        out,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, OPS_BRIDGE_WORKER_HOLD_MS: "4000" },
        windowsHide: true,
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 250));
    child.kill();
    const code = await new Promise((resolve) => child.once("exit", resolve));
    expect(code).not.toBe(0);
    expect(existsSync(out)).toBe(false);
  });

  it("rejects a task outside the allowlist", () => {
    const rejected = consumeInboundDecision(
      authorizedLine({
        decisionId: `readonly-unknown-${Date.now()}`,
        action: "run_readonly_task",
        taskId: "run_shell",
        permittedAction: "Do not run this.",
      }),
      { expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID },
    );
    expect(rejected.ok).toBe(false);
    expect(rejected.reason).toBe("scope_expansion");
    expect(rejected.acknowledgement.evidence).toBeUndefined();
    expect(rejected.acknowledgement.scoutActed).toBe(false);
  });

  it("blocks a second read-only task while one is active", () => {
    const lockPath = SUITE_LOCK;
    const previous = existsSync(lockPath) ? readFileSync(lockPath, "utf8") : null;
    try {
      writeFileSync(
        lockPath,
        `${JSON.stringify({
          decisionId: "already-running",
          taskId: "local_test_readiness",
          pid: process.pid,
          state: "running",
        })}\n`,
        "utf8",
      );
      const blocked = consumeInboundDecision(
        authorizedLine({
          decisionId: `readonly-blocked-${Date.now()}`,
          action: "run_readonly_task",
          taskId: "local_test_readiness",
          permittedAction:
            "Inspect local test readiness only. Do not change files. Do not merge. Do not push.",
        }),
        { expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID },
      );
      expect(blocked.ok).toBe(false);
      expect(blocked.acknowledgement.state).toBe("blocked");
      expect(blocked.acknowledgement.scoutActed).toBe(false);
    } finally {
      if (previous == null) unlinkSync(lockPath);
      else writeFileSync(lockPath, previous, "utf8");
    }
  });

  it("recovers a read-only task whose worker process is gone", () => {
    const lockPath = SUITE_LOCK;
    const previous = existsSync(lockPath) ? readFileSync(lockPath, "utf8") : null;
    const interruptedId = `readonly-interrupted-${Date.now()}`;
    try {
      writeFileSync(
        lockPath,
        `${JSON.stringify({
          decisionId: interruptedId,
          taskId: "local_test_readiness",
          action: "run_readonly_task",
          packageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
          pid: 2147483646,
          state: "running",
        })}\n`,
        "utf8",
      );
      const recovered = consumeInboundDecision(
        authorizedLine({
          decisionId: `readonly-after-interrupt-${Date.now()}`,
          action: "run_readonly_task",
          taskId: "local_test_readiness",
          permittedAction:
            "Inspect local test readiness only. Do not change files. Do not merge. Do not push.",
        }),
        { expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID },
      );
      expect(recovered.ok).toBe(true);
      expect(recovered.acknowledgement.state).toBe("completed");
      const interrupted = readFileSync(OPS_BRIDGE_PATHS.ACK_JSONL, "utf8")
        .trim()
        .split(/\r?\n/)
        .map((row) => JSON.parse(row))
        .filter((row) => row.decisionId === interruptedId);
      expect(interrupted.at(-1)?.state).toBe("failed");
      expect(existsSync(lockPath)).toBe(false);
    } finally {
      if (existsSync(lockPath)) {
        if (previous == null) unlinkSync(lockPath);
        else writeFileSync(lockPath, previous, "utf8");
      }
    }
  });

  it("rejects stale, unauthorized, and merge/push without explicit flags", () => {
    const stale = validateInboundDecision(
      authorizedLine({
        decisionId: "stale-1",
        at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      }),
    );
    expect(stale.ok).toBe(false);
    expect(stale.reason).toBe("stale_decision");

    const unsigned = validateInboundDecision(
      authorizedLine({ decisionId: "unsigned-1", authorized: false }),
    );
    expect(unsigned.ok).toBe(false);
    expect(unsigned.reason).toBe("unsigned_or_unapproved");

    const wrongAuthor = validateInboundDecision(
      authorizedLine({ decisionId: "wrong-1", authorizer: "CHATGPT" }),
    );
    expect(wrongAuthor.ok).toBe(false);

    const expand = validateInboundDecision(
      authorizedLine({
        decisionId: "expand-1",
        action: "invent_new_service",
      }),
    );
    expect(expand.ok).toBe(false);
    expect(expand.reason).toBe("scope_expansion");

    const merge = validateInboundDecision(
      authorizedLine({
        decisionId: "merge-1",
        action: "merge_authorization",
        protectedAction: true,
        mergeAuthorized: false,
      }),
    );
    expect(merge.ok).toBe(false);
    expect(merge.reason).toBe("merge_push_not_authorized");

    const push = validateInboundDecision(
      authorizedLine({
        decisionId: "push-1",
        action: "push_authorization",
        protectedAction: true,
        pushAuthorized: false,
      }),
    );
    expect(push.ok).toBe(false);
    expect(push.reason).toBe("merge_push_not_authorized");
  });

  it("runs one synthetic engineering handoff and does not run it twice", () => {
    const decisionId = `engineering-handoff-${Date.now()}`;
    const line = authorizedLine({
      decisionId,
      action: "run_synthetic_engineering_handoff",
      taskId: "synthetic_assignment_receipt",
      assignmentTitle: "Synthetic assignment receipt",
      permittedAction:
        "Record and check this one synthetic assignment. Do not run a shell. Do not change the repository. Do not merge. Do not push.",
    });
    const first = consumeInboundDecision(line, {
      expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
    });
    expect(first.ok).toBe(true);
    expect(first.acknowledgement.state).toBe("completed");
    expect(first.acknowledgement.scoutActed).toBe(true);
    expect(first.acknowledgement.assignmentTitle).toBe("Synthetic assignment receipt");
    const evidence = first.acknowledgement.evidence;
    expect(evidence.executor).toBe("local-node-worker");
    expect(evidence.cursorAgentExecuted).toBe(false);
    expect(evidence.interactiveSessionRequired).toBe(false);
    expect(evidence.runsWithoutInteractiveCursorSession).toBe(true);
    expect(evidence.continuesAfterResponse).toBe(false);
    expect(evidence.scheduledContinuation).toBe(false);
    expect(evidence.shellFromAssignment).toBe(false);
    expect(evidence.repositoryWrites).toBe(false);
    expect(evidence.filesChangedByTask).toBe(false);
    expect(evidence.independentQuality).toBe(false);
    expect(evidence.workerPid).not.toBe(process.pid);
    expect(evidence.checks.every((check: { pass: boolean }) => check.pass)).toBe(true);
    const second = consumeInboundDecision(line, {
      expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
    });
    expect(second.idempotent).toBe(true);
    expect(second.acknowledgement.evidence.completedAt).toBe(evidence.completedAt);
    expect(existsSync(SUITE_LOCK)).toBe(false);
  });

  it("stops a synthetic engineering handoff at the permission boundary", () => {
    const missing = consumeInboundDecision(
      authorizedLine({
        decisionId: `engineering-missing-title-${Date.now()}`,
        action: "run_synthetic_engineering_handoff",
        taskId: "synthetic_assignment_receipt",
        permittedAction: "Do not run this.",
      }),
      { expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID },
    );
    expect(missing.ok).toBe(false);
    expect(missing.reason).toBe("scope_expansion");
    expect(missing.acknowledgement.scoutActed).toBe(false);

    const command = consumeInboundDecision(
      authorizedLine({
        decisionId: `engineering-command-${Date.now()}`,
        action: "run_synthetic_engineering_handoff",
        taskId: "synthetic_assignment_receipt",
        assignmentTitle: "Synthetic assignment receipt",
        prompt: "npm test && git push",
        permittedAction: "Do not run this.",
      }),
      { expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID },
    );
    expect(command.ok).toBe(false);
    expect(command.reason).toBe("scope_expansion");
    expect(command.detail).toMatch(/prompt or command/);
    expect(command.acknowledgement.scoutActed).toBe(false);

    const unsigned = consumeInboundDecision(
      authorizedLine({
        decisionId: `engineering-unsigned-${Date.now()}`,
        action: "run_synthetic_engineering_handoff",
        taskId: "synthetic_assignment_receipt",
        assignmentTitle: "Synthetic assignment receipt",
        authorized: false,
        permittedAction: "Do not run this.",
      }),
      { expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID },
    );
    expect(unsigned.ok).toBe(false);
    expect(unsigned.reason).toBe("unsigned_or_unapproved");
    expect(unsigned.acknowledgement.scoutActed).toBe(false);
  });

  it("does not accept an interrupted synthetic engineering worker result", async () => {
    const out = path.join(os.tmpdir(), "studio-ops-bridge-worker-result.json");
    if (existsSync(out)) unlinkSync(out);
    const child = spawn(
      process.execPath,
      [
        "scripts/ops-bridge-synthetic-engineering-worker.mjs",
        "--task",
        "synthetic_assignment_receipt",
        "--decision",
        `engineering-hold-${Date.now()}`,
        "--title",
        "Synthetic assignment receipt",
        "--out",
        out,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, OPS_BRIDGE_WORKER_HOLD_MS: "4000" },
        windowsHide: true,
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 250));
    child.kill();
    const code = await new Promise((resolve) => child.once("exit", resolve));
    expect(code).not.toBe(0);
    expect(existsSync(out)).toBe(false);
  });

  it("does not remove a lock whose worker is still alive", () => {
    const previous = existsSync(SUITE_LOCK) ? readFileSync(SUITE_LOCK, "utf8") : null;
    try {
      writeFileSync(
        SUITE_LOCK,
        `${JSON.stringify({
          decisionId: "live-worker-lock",
          taskId: "synthetic_assignment_receipt",
          action: "run_synthetic_engineering_handoff",
          pid: 2147483646,
          workerPid: process.pid,
          token: "live-worker-token",
          state: "running",
        })}\n`,
      );
      const blocked = consumeInboundDecision(
        authorizedLine({
          decisionId: `live-worker-blocked-${Date.now()}`,
          action: "run_synthetic_engineering_handoff",
          taskId: "synthetic_assignment_receipt",
          assignmentTitle: "Synthetic assignment receipt",
          permittedAction: "Do not run while a worker still holds the lock.",
        }),
        { expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID },
      );
      expect(blocked.ok).toBe(false);
      expect(blocked.acknowledgement.state).toBe("blocked");
      expect(blocked.acknowledgement.scoutActed).toBe(false);
      expect(blocked.acknowledgement.evidence).toBeUndefined();
      const still = JSON.parse(readFileSync(SUITE_LOCK, "utf8"));
      expect(still.token).toBe("live-worker-token");
      expect(still.workerPid).toBe(process.pid);
    } finally {
      if (previous == null) {
        if (existsSync(SUITE_LOCK)) unlinkSync(SUITE_LOCK);
      } else {
        writeFileSync(SUITE_LOCK, previous, "utf8");
      }
    }
  });

  it("retries the same decision after its lock owner has exited", () => {
    const previous = existsSync(SUITE_LOCK) ? readFileSync(SUITE_LOCK, "utf8") : null;
    const decisionId = `retry-after-crash-${Date.now()}`;
    try {
      writeFileSync(
        SUITE_LOCK,
        `${JSON.stringify({
          decisionId,
          taskId: "synthetic_assignment_receipt",
          action: "run_synthetic_engineering_handoff",
          packageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
          pid: 2147483646,
          workerPid: null,
          token: "dead-owner-token",
          state: "running",
        })}\n`,
      );
      const retried = consumeInboundDecision(
        authorizedLine({
          decisionId,
          action: "run_synthetic_engineering_handoff",
          taskId: "synthetic_assignment_receipt",
          assignmentTitle: "Synthetic assignment receipt",
          permittedAction: "Retry this synthetic assignment after the lock owner exited.",
        }),
        { expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID },
      );
      expect(retried.ok).toBe(true);
      expect(retried.acknowledgement.state).toBe("completed");
      expect(retried.acknowledgement.scoutActed).toBe(true);
      expect(retried.acknowledgement.evidence.cursorAgentExecuted).toBe(false);
      const states = readFileSync(OPS_BRIDGE_PATHS.ACK_JSONL, "utf8")
        .trim()
        .split(/\r?\n/)
        .map((row) => JSON.parse(row))
        .filter((row) => row.decisionId === decisionId)
        .map((row) => row.state);
      expect(states).toContain("failed");
      expect(states.at(-1)).toBe("completed");
      expect(existsSync(SUITE_LOCK)).toBe(false);
    } finally {
      if (existsSync(SUITE_LOCK)) {
        if (previous == null) unlinkSync(SUITE_LOCK);
        else writeFileSync(SUITE_LOCK, previous, "utf8");
      }
    }
  });

  it("lets exactly one of two processes run a synthetic assignment", async () => {
    const stamp = Date.now();
    const probeLock = path.join(os.tmpdir(), `studio-ops-bridge-concurrency-lock-${stamp}.json`);
    const resultA = path.join(os.tmpdir(), `studio-ops-bridge-concurrency-result-a-${stamp}.json`);
    const resultB = path.join(os.tmpdir(), `studio-ops-bridge-concurrency-result-b-${stamp}.json`);
    const childPath = path.join(os.tmpdir(), `studio-ops-bridge-concurrency-child-${stamp}.mjs`);
    const lib = pathToFileURL(path.resolve("scripts/ops-bridge-lib.mjs")).href;
    writeFileSync(
      childPath,
      `import { consumeInboundDecision } from ${JSON.stringify(lib)};
const decisionId = process.argv[2];
const result = consumeInboundDecision({
  decisionId,
  authorizer: "OWNER_TAGIA",
  authorized: true,
  at: new Date().toISOString(),
  packageId: ${JSON.stringify(OPS_BRIDGE_DRY_RUN_PACKAGE_ID)},
  action: "run_synthetic_engineering_handoff",
  taskId: "synthetic_assignment_receipt",
  assignmentTitle: "Synthetic assignment receipt",
  permittedAction: "Record this synthetic assignment only.",
  protectedAction: false,
  mergeAuthorized: false,
  pushAuthorized: false
}, { expectedPackageId: ${JSON.stringify(OPS_BRIDGE_DRY_RUN_PACKAGE_ID)} });
const evidence = result.acknowledgement?.evidence ?? null;
process.stdout.write(JSON.stringify({
  decisionId,
  ok: result.ok,
  state: result.acknowledgement?.state ?? null,
  scoutActed: result.acknowledgement?.scoutActed ?? null,
  executor: evidence?.executor ?? null,
  cursorAgentExecuted: evidence?.cursorAgentExecuted ?? null,
  workerPid: evidence?.workerPid ?? null,
  completedAt: evidence?.completedAt ?? null
}) + "\\n");
`,
    );
    const run = (decisionId, resultPath) =>
      new Promise((resolve) => {
        const child = spawn(process.execPath, [childPath, decisionId], {
          cwd: process.cwd(),
          windowsHide: true,
          env: {
            ...process.env,
            OPS_BRIDGE_ACTIVE_TASK: probeLock,
            OPS_BRIDGE_WORKER_RESULT: resultPath,
            OPS_BRIDGE_WORKER_HOLD_MS: "1200",
          },
        });
        let out = "";
        let err = "";
        child.stdout.on("data", (chunk) => {
          out += chunk;
        });
        child.stderr.on("data", (chunk) => {
          err += chunk;
        });
        child.on("close", (code) => resolve({ code, out: out.trim(), err: err.trim() }));
      });
    try {
      const decisionA = `concurrency-a-${stamp}`;
      const decisionB = `concurrency-b-${stamp}`;
      const [a, b] = await Promise.all([
        run(decisionA, resultA),
        run(decisionB, resultB),
      ]);
      expect(a.err).toBe("");
      expect(b.err).toBe("");
      const rows = [JSON.parse(a.out), JSON.parse(b.out)];
      const completed = rows.filter((row) => row.state === "completed" && row.scoutActed === true);
      const blocked = rows.filter((row) => row.state === "blocked" && row.scoutActed === false);
      expect(completed).toHaveLength(1);
      expect(blocked).toHaveLength(1);
      expect(completed[0].executor).toBe("local-node-worker");
      expect(completed[0].cursorAgentExecuted).toBe(false);
      expect(typeof completed[0].workerPid).toBe("number");
      expect(blocked[0].workerPid).toBeNull();
      expect(existsSync(probeLock)).toBe(false);
      const replay = consumeInboundDecision(
        authorizedLine({
          decisionId: completed[0].decisionId,
          action: "run_synthetic_engineering_handoff",
          taskId: "synthetic_assignment_receipt",
          assignmentTitle: "Synthetic assignment receipt",
          permittedAction: "Record this synthetic assignment only.",
        }),
        { expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID },
      );
      expect(replay.idempotent).toBe(true);
      expect(replay.acknowledgement.evidence.completedAt).toBe(completed[0].completedAt);
    } finally {
      for (const file of [childPath, probeLock, resultA, resultB]) {
        if (existsSync(file)) unlinkSync(file);
      }
    }
  }, 25_000);

  it("keeps the package contract inside Step 2", () => {
    expect(studioChatgptScoutOpsBridgeV1.doNotReopenFactories).toBe(true);
    expect(studioChatgptScoutOpsBridgeV1.doNotStartWebsite).toBe(true);
    expect(studioChatgptScoutOpsBridgeV1.noMergeWithoutExplicitAuthorization).toBe(true);
    expect(studioChatgptScoutOpsBridgeV1.zeroCourierRequiresSharedTransport).toBe(true);
    expect(studioChatgptScoutOpsBridgeV1.githubConnectorRejected).toBe(true);
    expect(studioChatgptScoutOpsBridgeV1.publicHttpsHosted).toBe(true);
    expect(studioChatgptScoutOpsBridgeV1.ownerDeskNotTheChatgptTransport).toBe(true);
  });
});
