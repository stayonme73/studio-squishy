import { existsSync, mkdirSync, readFileSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { postChatgptMessage, postScoutMessage, readBridgeMessages } from "../../../scripts/ops-bridge-messages.mjs";
import {
  assertCommunicationOnly,
  formatCommunicationDiagnostic,
  prepareCommunicationInvocation,
  prepareFailClosedLivePath,
  reviewSystemPromptCandidate,
  runCommunicationWake,
  runOfflineOneCall,
} from "../../../scripts/ops-bridge-wake.mjs";

const messageFile = path.join(os.tmpdir(), `studio-ops-bridge-wake-messages-${process.pid}.jsonl`);
const lockFile = path.join(os.tmpdir(), `studio-ops-bridge-wake-lock-${process.pid}.json`);
const attemptFile = path.join(os.tmpdir(), `studio-ops-bridge-wake-attempts-${process.pid}.json`);
process.env.OPS_BRIDGE_MESSAGES = messageFile;
process.env.OPS_BRIDGE_WAKE_LOCK = lockFile;
process.env.OPS_BRIDGE_WAKE_ATTEMPTS = attemptFile;

function incoming(messageId: string, body = "Synthetic note for Scout.") {
  return postChatgptMessage({
    messageId,
    authorizer: "OWNER_TAGIA",
    authorized: true,
    packageId: "STUDIO-OPERATING-SCOUT-COMMUNICATION-WAKE-IMPLEMENTATION-1",
    kind: "message",
    body,
  });
}

function ack(text = "Synthetic acknowledgement.") {
  return (request: { options: { tools: string[]; local: { settingSources: string[] } }; messageBody: string }) => {
    expect(request.options.tools).toEqual([]);
    expect(request.options.local.settingSources).toEqual([]);
    expect(request.messageBody).not.toMatch(/Bearer\s+\S+/);
    return { ok: true, text, liveAgent: false, executed: false };
  };
}

beforeEach(() => {
  process.env.OPS_BRIDGE_MESSAGES = messageFile;
  process.env.OPS_BRIDGE_WAKE_LOCK = lockFile;
  process.env.OPS_BRIDGE_WAKE_ATTEMPTS = attemptFile;
  if (existsSync(messageFile)) unlinkSync(messageFile);
  if (existsSync(lockFile)) unlinkSync(lockFile);
  if (existsSync(attemptFile)) unlinkSync(attemptFile);
});

describe("communication-only wake gate", () => {
  it("prepares create and resume with no built-in tools and no setting sources", () => {
    for (const phase of ["create", "resume"] as const) {
      const prepared = prepareCommunicationInvocation(phase);
      expect(prepared.ok).toBe(true);
      expect(prepared.liveAgent).toBe(false);
      expect(assertCommunicationOnly(prepared.options).ok).toBe(true);
      expect(prepared.options.tools).toEqual([]);
      expect(Object.isFrozen(prepared.options.tools)).toBe(true);
      expect(prepared.options.local.settingSources).toEqual([]);
      expect(Object.isFrozen(prepared.options.local.settingSources)).toBe(true);
      expect(prepared.options.local.cwd).toBeUndefined();
      expect(prepared.options.disallowedTools).not.toContain("write");
      expect(prepared.options.local.subagentInherit).toEqual({});
      expect(prepared.options.local.subagentInherit.resourceProviderOptions).toBeUndefined();
    }
    expect(prepareCommunicationInvocation("create").options.tools).toEqual(
      prepareCommunicationInvocation("resume").options.tools,
    );
    expect(prepareCommunicationInvocation("create").options.local.settingSources).toEqual(
      prepareCommunicationInvocation("resume").options.local.settingSources,
    );
    expect(prepareCommunicationInvocation("cloud").ok).toBe(false);
  });

  it("fails closed before a runner when tools, settings, cloud, or a key are present", () => {
    incoming("gate-1");
    let calls = 0;
    const runner = () => {
      calls += 1;
      return { ok: true, text: "nope", liveAgent: false };
    };
    expect(runCommunicationWake({
      bridgeAwake: true,
      messageId: "gate-1",
      runner,
      optionsOverride: { tools: ["shell"] },
    }).reason).toBe("wake_tools_not_empty");
    expect(runCommunicationWake({
      bridgeAwake: true,
      messageId: "gate-1",
      runner,
      phase: "resume",
      optionsOverride: { local: { settingSources: ["project"] } },
    }).reason).toBe("wake_settings_not_empty");
    expect(runCommunicationWake({
      bridgeAwake: true,
      messageId: "gate-1",
      runner,
      optionsOverride: { cloud: { repos: [] } },
    }).reason).toBe("wake_cloud_or_mcp_refused");
    expect(runCommunicationWake({
      bridgeAwake: true,
      messageId: "gate-1",
      runner,
      optionsOverride: { apiKey: "not-a-real-key" },
    }).reason).toBe("wake_secret_refused");
    expect(runCommunicationWake({
      bridgeAwake: true,
      messageId: "gate-1",
      runner,
      phase: "resume",
      optionsOverride: { disallowedTools: ["write"] },
    }).reason).toBe("wake_tool_name_invalid");
    expect(runCommunicationWake({
      bridgeAwake: true,
      messageId: "gate-1",
      runner,
      optionsOverride: { local: { subagentInherit: { resourceProviderOptions: {} } } },
    }).reason).toBe("wake_child_tools_open");
    expect(calls).toBe(0);
    expect(readBridgeMessages().messages[0].cursorScoutConsumed).toBe(false);
  });

  it("redacts and shortens a diagnostic without a model call", () => {
    const secret = "wake-test-sentinel-value";
    const diagnostic = formatCommunicationDiagnostic({
      status: "error",
      error: {
        code: "InvalidArgument",
        message: `${secret} ${"x".repeat(400)}`,
      },
      result: `Bearer ${secret}`,
      usage: null,
    }, secret);
    expect(diagnostic.liveAgent).toBe(false);
    expect(diagnostic.status).toBe("error");
    expect(diagnostic.errorCode).toBe("InvalidArgument");
    expect(diagnostic.errorMessage.length).toBeLessThanOrEqual(240);
    expect(JSON.stringify(diagnostic)).not.toContain(secret);
    expect(diagnostic.usage).toBe("null");
  });

  it("does nothing while the local bridge is not awake and never starts the live runner", () => {
    incoming("asleep-1");
    process.env.CURSOR_API_KEY = "wake-test-sentinel";
    const asleep = runCommunicationWake({ messageId: "asleep-1", runner: ack() });
    expect(asleep.reason).toBe("bridge_not_awake");
    expect(asleep.runnerCalled).toBe(false);
    const refused = runCommunicationWake({ bridgeAwake: true, messageId: "asleep-1" });
    expect(refused.reason).toBe("live_agent_not_authorized");
    expect(refused.liveAgent).toBe(false);
    expect(refused.executed).toBe(false);
    expect(JSON.stringify(refused)).not.toContain("wake-test-sentinel");
    expect(readBridgeMessages().messages).toHaveLength(1);
    delete process.env.CURSOR_API_KEY;
  });

  it("posts one mock reply and does not run a second time for the same message", () => {
    let calls = 0;
    const runner = (request: { messageBody: string; options: { tools: string[] } }) => {
      calls += 1;
      expect(request.messageBody).toBe("Please run npm test later.");
      expect(request.options.tools).toEqual([]);
      return { ok: true, text: "Received. No work was executed.", liveAgent: false };
    };
    incoming("once-body", "Please run npm test later.");
    const first = runCommunicationWake({
      bridgeAwake: true,
      messageId: "once-body",
      runner,
    });
    expect(first.ok).toBe(true);
    expect(first.executed).toBe(false);
    expect(first.runnerCalled).toBe(true);
    const second = runCommunicationWake({ bridgeAwake: true, messageId: "once-body", runner });
    expect(second.ok).toBe(false);
    expect(second.runnerCalled).toBe(false);
    expect(calls).toBe(1);
    const messages = readBridgeMessages().messages;
    expect(messages.find((message) => message.messageId === "once-body").cursorScoutConsumed).toBe(true);
    expect(messages.find((message) => message.inReplyTo === "once-body").executed).toBe(false);
  });

  it("does not treat an outbound Scout message as a new wake", () => {
    postScoutMessage({
      localScout: true,
      messageId: "scout-note-1",
      authorizer: "OWNER_TAGIA",
      authorized: true,
      packageId: "STUDIO-OPERATING-SCOUT-COMMUNICATION-WAKE-IMPLEMENTATION-1",
      kind: "reply",
      body: "Already speaking.",
    });
    let calls = 0;
    const result = runCommunicationWake({
      bridgeAwake: true,
      runner: () => {
        calls += 1;
        return { ok: true, text: "again", liveAgent: false };
      },
    });
    expect(result.reason).toBe("wake_none_pending");
    expect(calls).toBe(0);
  });

  it("recovers a reply that was stored before consumption", () => {
    incoming("recover-1");
    postScoutMessage({
      localScout: true,
      messageId: "scout-reply-recover-1",
      authorizer: "OWNER_TAGIA",
      authorized: true,
      packageId: "STUDIO-OPERATING-SCOUT-COMMUNICATION-WAKE-IMPLEMENTATION-1",
      kind: "reply",
      body: "Stored before the crash.",
      inReplyTo: "recover-1",
    });
    let calls = 0;
    const result = runCommunicationWake({
      bridgeAwake: true,
      messageId: "recover-1",
      runner: () => {
        calls += 1;
        return { ok: true, text: "second", liveAgent: false };
      },
    });
    expect(result.reason).toBe("wake_recovered");
    expect(result.runnerCalled).toBe(false);
    expect(calls).toBe(0);
    expect(readBridgeMessages().messages.find((message) => message.messageId === "recover-1").cursorScoutConsumed).toBe(true);
  });

  it("holds one message lock and can replace a stale lock", () => {
    incoming("lock-1");
    writeFileSync(lockFile, `${JSON.stringify({ messageId: "other", token: "held" })}\n`);
    let calls = 0;
    const busy = runCommunicationWake({
      bridgeAwake: true,
      messageId: "lock-1",
      runner: () => {
        calls += 1;
        return { ok: true, text: "no", liveAgent: false };
      },
    });
    expect(busy.reason).toBe("wake_lock_busy");
    expect(calls).toBe(0);
    const old = new Date(Date.now() - 60_000);
    utimesSync(lockFile, old, old);
    const recovered = runCommunicationWake({
      bridgeAwake: true,
      messageId: "lock-1",
      staleMs: 0,
      runner: () => {
        calls += 1;
        return { ok: true, text: "Recovered one reply.", liveAgent: false };
      },
    });
    expect(recovered.ok).toBe(true);
    expect(calls).toBe(1);
    expect(existsSync(lockFile)).toBe(false);
  });

  it("withholds secrets and refuses an agent result that edits or carries a secret", () => {
    writeFileSync(messageFile, `${JSON.stringify({
      messageId: "secret-1",
      sender: "CHATGPT",
      recipient: "SCOUT",
      packageId: "STUDIO-OPERATING-SCOUT-COMMUNICATION-WAKE-IMPLEMENTATION-1",
      kind: "message",
      body: "Bearer wake-test-secret",
      sequence: 1,
      cursorScoutConsumed: false,
    })}\n`);
    let calls = 0;
    const withheld = runCommunicationWake({
      bridgeAwake: true,
      messageId: "secret-1",
      runner: () => {
        calls += 1;
        return { ok: true, text: "no", liveAgent: false };
      },
    });
    expect(withheld.reason).toBe("message_withheld");
    expect(withheld.runnerCalled).toBe(false);
    expect(JSON.stringify(withheld)).not.toContain("wake-test-secret");
    if (existsSync(messageFile)) unlinkSync(messageFile);
    incoming("edit-1");
    const edited = runCommunicationWake({
      bridgeAwake: true,
      messageId: "edit-1",
      runner: () => ({ ok: true, text: "wrote it", liveAgent: false, filesWritten: ["README.md"] }),
    });
    expect(edited.reason).toBe("wake_agent_edit_refused");
    expect(readBridgeMessages().messages).toHaveLength(1);
    const duplicateEdit = runCommunicationWake({
      bridgeAwake: true,
      messageId: "edit-1",
      runner: () => {
        calls += 1;
        return { ok: true, text: "again", liveAgent: false };
      },
    });
    expect(duplicateEdit.reason).toBe("wake_duplicate");
    expect(duplicateEdit.runnerCalled).toBe(false);
    incoming("leak-1");
    const leaked = runCommunicationWake({
      bridgeAwake: true,
      messageId: "leak-1",
      runner: () => ({ ok: true, text: "Bearer wake-test-secret", liveAgent: false }),
    });
    expect(leaked.reason).toBe("message_withheld");
    expect(JSON.stringify(leaked)).not.toContain("wake-test-secret");
    expect(calls).toBe(0);
    expect(readFileSync(new URL("../../../scripts/ops-bridge-wake.mjs", import.meta.url), "utf8")).not.toContain("@cursor/sdk");
  });

  it("runs a mocked create and resume with redacted errors and no second call", () => {
    const secret = "wake-test-sentinel-value";
    const seen = new Set<string>();
    const seenOptions: Array<{ tools: string[]; local: { settingSources: string[]; cwd?: string; subagentInherit: { resourceProviderOptions?: unknown } } }> = [];
    const createAgent = (options: { tools: string[]; local: { settingSources: string[]; cwd?: string; subagentInherit: { resourceProviderOptions?: unknown } }; systemPrompt?: string; apiKey?: string }) => {
      seenOptions.push(options);
      expect(options.tools).toEqual([]);
      expect(options.local.settingSources).toEqual([]);
      expect(options.local.cwd).toBeUndefined();
      expect(options.local.subagentInherit).toEqual({});
      expect(options.apiKey).toBeUndefined();
      expect(options.systemPrompt).toContain("Communication only");
      const error = new Error(`InvalidArgument naming a prompt restriction ${secret} ${"at node_modules/@cursor/sdk ".repeat(80)}`);
      error.name = "InvalidArgument";
      (error as Error & { code?: string }).code = "InvalidArgument";
      throw error;
    };
    const first = runOfflineOneCall({ phase: "create", messageId: "mock-1", seen, secret, createAgent });
    const resume = runOfflineOneCall({
      phase: "resume",
      messageId: "mock-2",
      seen,
      secret,
      createAgent: (options: { tools: string[]; local: { settingSources: string[] } }) => {
        seenOptions.push(options as typeof seenOptions[number]);
        return { status: "error", error: { code: "InvalidArgument", message: "prompt restriction remains visible" }, result: "", usage: null };
      },
    });
    const duplicate = runOfflineOneCall({ phase: "create", messageId: "mock-1", seen, secret, createAgent });
    const review = reviewSystemPromptCandidate();
    expect(first.runnerCalled).toBe(true);
    expect(first.liveAgent).toBe(false);
    expect(first.diagnostic.errorCode).toBe("InvalidArgument");
    expect(first.diagnostic.errorMessage).toContain("prompt restriction");
    expect(first.diagnostic.errorMessage.length).toBeLessThanOrEqual(240);
    expect(JSON.stringify(first)).not.toContain(secret);
    expect(resume.diagnostic.errorMessage).toBe("prompt restriction remains visible");
    expect(seenOptions[1].tools).toEqual([]);
    expect(seenOptions[1].local.settingSources).toEqual([]);
    expect(duplicate.reason).toBe("wake_duplicate");
    expect(duplicate.runnerCalled).toBe(false);
    expect(seenOptions).toHaveLength(2);
    expect(review.promptSet).toBe(true);
    expect(review.bypassed).toBe(false);
    expect(review.unknown).toContain("only a candidate");
    const runnerPath = "C:/Users/tagia/AppData/Local/Studio-Wake-Sdk/one-call.mjs";
    const runnerSource = readFileSync(runnerPath, "utf8");
    expect(runnerSource).not.toContain("@cursor/sdk");
    expect(runnerSource).not.toContain("cursor-user-key");
    expect(runnerSource).not.toContain("child_process");
    expect(runnerSource).toContain("runOfflineOneCall");
  });

  it("stores one attempt, isolates locks, and keeps the prompt gate closed", () => {
    const lockDir = path.join(os.tmpdir(), `studio-ops-bridge-wake-locks-${process.pid}`);
    mkdirSync(lockDir, { recursive: true });
    process.env.OPS_BRIDGE_WAKE_LOCK = lockDir;
    incoming("iso-a");
    incoming("iso-b");
    let calls = 0;
    const failed = runCommunicationWake({
      bridgeAwake: true,
      messageId: "iso-a",
      secret: "wake-test-sentinel-value",
      runner: () => {
        calls += 1;
        const error = new Error("wake-test-sentinel-value runner exploded");
        (error as Error & { code?: string }).code = "runner_error";
        throw error;
      },
    });
    expect(failed.reason).toBe("wake_runner_failed");
    expect(failed.diagnostic.errorCode).toBe("runner_error");
    expect(JSON.stringify(failed)).not.toContain("wake-test-sentinel-value");
    const duplicate = runCommunicationWake({
      bridgeAwake: true,
      messageId: "iso-a",
      runner: () => {
        calls += 1;
        return { ok: true, text: "second", liveAgent: false };
      },
    });
    expect(duplicate.reason).toBe("wake_duplicate");
    expect(duplicate.duplicateNotice).toBe(true);
    expect(duplicate.runnerCalled).toBe(false);
    const other = runCommunicationWake({
      bridgeAwake: true,
      messageId: "iso-b",
      phase: "resume",
      runner: (request: { phase: string; options: { tools: string[]; local: { settingSources: string[]; cwd?: string } } }) => {
        calls += 1;
        expect(request.phase).toBe("resume");
        expect(request.options.tools).toEqual([]);
        expect(request.options.local.settingSources).toEqual([]);
        expect(request.options.local.cwd).toBeUndefined();
        return { ok: true, text: "One reply for B.", liveAgent: false, executed: false };
      },
    });
    expect(other.ok).toBe(true);
    const repeated = runCommunicationWake({
      bridgeAwake: true,
      messageId: "iso-b",
      runner: () => {
        calls += 1;
        return { ok: true, text: "again", liveAgent: false };
      },
    });
    expect(repeated.runnerCalled).toBe(false);
    expect(calls).toBe(2);
    const messages = readBridgeMessages().messages;
    expect(messages.filter((message) => message.inReplyTo === "iso-a")).toHaveLength(0);
    expect(messages.filter((message) => message.inReplyTo === "iso-b")).toHaveLength(1);
    incoming("iso-c");
    const shelled = runCommunicationWake({
      bridgeAwake: true,
      messageId: "iso-c",
      runner: () => ({ ok: true, text: "ran", liveAgent: false, shell: "npm test" }),
    });
    expect(shelled.reason).toBe("wake_agent_edit_refused");
    expect(readBridgeMessages().messages.filter((message) => message.inReplyTo === "iso-c")).toHaveLength(0);
    const ledger = readFileSync(attemptFile, "utf8");
    expect(ledger).toContain("iso-a");
    expect(ledger).not.toContain("Synthetic");
    expect(ledger).not.toContain("wake-test-sentinel-value");
    const unknown = prepareFailClosedLivePath({ phase: "resume" });
    expect(unknown.reason).toBe("wake_prompt_eligibility_unknown");
    expect(unknown.bypassed).toBe(false);
    expect(unknown.liveAgent).toBe(false);
    expect(prepareFailClosedLivePath({ promptEligibility: "denied" }).reason).toBe("wake_prompt_eligibility_denied");
    const prepared = prepareFailClosedLivePath({ phase: "resume", promptEligibility: "allowed" });
    expect(prepared.ok).toBe(true);
    expect(prepared.liveAgent).toBe(false);
    expect(prepared.bypassed).toBe(false);
    expect(prepared.options.tools).toEqual([]);
    expect(prepared.options.local.settingSources).toEqual([]);
    expect(prepared.options.systemPrompt).toContain("Communication only");
    expect(readFileSync(new URL("../../../scripts/ops-bridge-wake.mjs", import.meta.url), "utf8")).not.toContain("@cursor/sdk");
  });
});
