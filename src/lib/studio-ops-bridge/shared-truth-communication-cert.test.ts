import { existsSync, readFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import {
  appendLaunchControlEvent,
  detectStaleLaunchRecords,
  readSharedLaunchControlSummary,
} from "../../../scripts/studio-shared-launch-control-lib.mjs";
import {
  listBridgeMessages,
  markScoutConsumed,
  postChatgptMessage,
  postScoutMessage,
} from "../../../scripts/ops-bridge-messages.mjs";

const certMessages = path.join(os.tmpdir(), `shared-truth-cert-${process.pid}.jsonl`);
const certEvents = path.join(os.tmpdir(), `shared-truth-events-${process.pid}.jsonl`);

describe("STUDIO-SHARED-TRUTH-AND-COMMUNICATION-CERT-1", () => {
  beforeEach(() => {
    process.env.OPS_BRIDGE_MESSAGES = certMessages;
    if (existsSync(certMessages)) unlinkSync(certMessages);
  });

  it("does not flag C-02 when canonical TS matches four-package markdown", () => {
    const stale = detectStaleLaunchRecords();
    expect(stale.find((row) => row.gateId === "C-02")).toBeUndefined();
  });

  it("runs synthetic ChatGPT→Scout→ChatGPT round trip without execution", () => {
    const chatId = "cert-vitest-chat-1";
    const chat = postChatgptMessage({
      messageId: chatId,
      authorizer: "OWNER_TAGIA",
      authorized: true,
      packageId: "STUDIO-SHARED-TRUTH-AND-COMMUNICATION-CERT-1",
      assignmentId: "vitest",
      kind: "message",
      body: "Vitest synthetic cert message. Not execution authorization.",
    });
    expect(chat.ok).toBe(true);
    expect(chat.executed).toBe(false);

    const consumed = markScoutConsumed(chatId, { localScout: true });
    expect(consumed.ok).toBe(true);
    expect(consumed.executed).toBe(false);

    const scout = postScoutMessage({
      localScout: true,
      messageId: "cert-vitest-scout-1",
      authorizer: "OWNER_TAGIA",
      authorized: true,
      packageId: "STUDIO-SHARED-TRUTH-AND-COMMUNICATION-CERT-1",
      assignmentId: "vitest",
      kind: "reply",
      inReplyTo: chatId,
      body: "Vitest ack. executed remains false.",
    });
    expect(scout.ok).toBe(true);
    expect(scout.executed).toBe(false);

    const listed = listBridgeMessages();
    const reply = listed.messages.find((m) => m.messageId === "cert-vitest-scout-1");
    expect(reply?.chatgptRetrievedAt).toBeTruthy();
    expect(reply?.executed).toBe(false);
  });

  it("appends launch control events and exposes summary for ops snapshot", () => {
    const event = appendLaunchControlEvent({
      eventId: "evt-vitest-register-1",
      packageId: "STUDIO-SHARED-TRUTH-AND-COMMUNICATION-CERT-1",
      kind: "test",
      note: "vitest register touch",
    });
    expect(event.eventId).toBe("evt-vitest-register-1");
    const summary = readSharedLaunchControlSummary();
    expect(summary.registerPath).toContain("shared-launch-control-register.json");
    expect(summary.markdownVersion).toBe("v1.1");
    expect(Array.isArray(summary.staleFlags)).toBe(true);
    const register = JSON.parse(
      readFileSync(path.join(process.cwd(), summary.registerPath.replace(/\//g, path.sep)), "utf8"),
    );
    expect(register.lastEventId).toBe("evt-vitest-register-1");
    void certEvents;
  });
});
