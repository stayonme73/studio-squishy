import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";

import { handleJsonRpc } from "../../../scripts/ops-bridge-mcp.mjs";
import {
  listBridgeMessages,
  markScoutConsumed,
  noticeInbox,
  postChatgptMessage,
  postScoutMessage,
  readBridgeMessages,
} from "../../../scripts/ops-bridge-messages.mjs";

const messageFile = path.join(os.tmpdir(), `studio-ops-bridge-messages-${process.pid}.jsonl`);
process.env.OPS_BRIDGE_MESSAGES = messageFile;

function chatgpt(messageId: string, overrides: Record<string, unknown> = {}) {
  return postChatgptMessage({
    messageId,
    authorizer: "OWNER_TAGIA",
    authorized: true,
    packageId: "STUDIO-OPERATING-CHATGPT-SCOUT-OPS-BRIDGE-1",
    assignmentId: "synthetic-inbox",
    kind: "message",
    body: `Synthetic note ${messageId}`,
    ...overrides,
  });
}

beforeEach(() => {
  if (existsSync(messageFile)) unlinkSync(messageFile);
});

describe("ChatGPT ↔ Scout message inbox", () => {
  it("stores a ChatGPT message without executing it or marking Scout consumption", () => {
    const stored = chatgpt("chat-1");
    expect(stored.ok).toBe(true);
    expect(stored.executed).toBe(false);
    expect(stored.message.sender).toBe("CHATGPT");
    expect(stored.message.recipient).toBe("SCOUT");
    expect(stored.message.bridgeReceived).toBe(true);
    expect(stored.message.cursorScoutConsumed).toBe(false);
    expect(stored.message.packageId).toBe("STUDIO-OPERATING-CHATGPT-SCOUT-OPS-BRIDGE-1");
    expect(stored.message.assignmentId).toBe("synthetic-inbox");
    const visible = readBridgeMessages();
    expect(visible.messages.map((message) => message.messageId)).toEqual(["chat-1"]);
  });

  it("rejects an unauthorized message and a forged Scout sender", () => {
    const unsigned = chatgpt("unsigned", { authorized: false });
    expect(unsigned.ok).toBe(false);
    expect(unsigned.reason).toBe("unsigned_or_unapproved");
    expect(unsigned.stored).toBe(false);
    const forged = chatgpt("forged", { sender: "SCOUT" });
    expect(forged.ok).toBe(false);
    expect(forged.reason).toBe("sender_not_permitted");
    const command = chatgpt("command", { command: "npm test" });
    expect(command.ok).toBe(false);
    expect(command.reason).toBe("message_is_not_execution");
    expect(command.executed).toBe(false);
    expect(readBridgeMessages().messages).toEqual([]);
  });

  it("keeps message order and does not store the same message twice", () => {
    expect(chatgpt("order-1").message.sequence).toBe(1);
    expect(chatgpt("order-2", { kind: "progress", body: "Still checking." }).message.sequence).toBe(2);
    expect(chatgpt("order-3", { kind: "clarification", body: "Which file?" }).message.sequence).toBe(3);
    const replay = chatgpt("order-2", { kind: "progress", body: "Still checking." });
    expect(replay.idempotent).toBe(true);
    expect(replay.message.sequence).toBe(2);
    const conflict = chatgpt("order-2", { kind: "progress", body: "A different body." });
    expect(conflict.ok).toBe(false);
    expect(conflict.reason).toBe("duplicate_message");
    expect(readBridgeMessages().messages.map((message) => message.messageId)).toEqual([
      "order-1",
      "order-2",
      "order-3",
    ]);
  });

  it("lets Scout reply locally and records consumption only from the local inbox", () => {
    chatgpt("chat-2", { body: "Can you confirm the lock?" });
    const remoteReceipt = markScoutConsumed("chat-2");
    expect(remoteReceipt.ok).toBe(false);
    expect(remoteReceipt.reason).toBe("scout_receipt_is_local_only");
    const remoteReply = postScoutMessage({
      messageId: "scout-remote",
      authorizer: "OWNER_TAGIA",
      authorized: true,
      packageId: "STUDIO-OPERATING-CHATGPT-SCOUT-OPS-BRIDGE-1",
      kind: "reply",
      body: "Not from the bridge tool.",
      inReplyTo: "chat-2",
    });
    expect(remoteReply.reason).toBe("scout_reply_is_local_only");
    const consumed = markScoutConsumed("chat-2", { localScout: true });
    expect(consumed.message.cursorScoutConsumed).toBe(true);
    expect(consumed.executed).toBe(false);
    const reply = postScoutMessage({
      localScout: true,
      messageId: "scout-1",
      authorizer: "OWNER_TAGIA",
      authorized: true,
      packageId: "STUDIO-OPERATING-CHATGPT-SCOUT-OPS-BRIDGE-1",
      assignmentId: "synthetic-inbox",
      kind: "reply",
      body: "Received. The lock still admits one worker.",
      inReplyTo: "chat-2",
    });
    expect(reply.ok).toBe(true);
    expect(reply.message.sender).toBe("SCOUT");
    expect(reply.message.recipient).toBe("CHATGPT");
    expect(reply.executed).toBe(false);
    const listed = listBridgeMessages();
    const scoutReply = listed.messages.find((message) => message.messageId === "scout-1");
    expect(scoutReply.chatgptRetrievedAt).toBeTruthy();
    const original = listed.messages.find((message) => message.messageId === "chat-2");
    expect(original.cursorScoutConsumed).toBe(true);
    expect(original.cursorScoutConsumedAt).toBeTruthy();
  });

  it("survives a torn write and a new process", () => {
    chatgpt("durable-1", { body: "Keep this note." });
    appendFileSync(messageFile, "{\"messageId\":", "utf8");
    const child = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { readBridgeMessages } from ${JSON.stringify(pathToFileURL(path.resolve("scripts/ops-bridge-messages.mjs")).href)};
const result = readBridgeMessages();
process.stdout.write(JSON.stringify(result.messages.map((message) => message.messageId)));`,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, OPS_BRIDGE_MESSAGES: messageFile },
        encoding: "utf8",
        windowsHide: true,
      },
    );
    expect(child.status).toBe(0);
    expect(JSON.parse(child.stdout)).toEqual(["durable-1"]);
  });

  it("stores one copy when two processes submit the same message", async () => {
    const childPath = path.join(os.tmpdir(), `studio-ops-bridge-message-child-${process.pid}.mjs`);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      childPath,
      `import { postChatgptMessage } from ${JSON.stringify(pathToFileURL(path.resolve("scripts/ops-bridge-messages.mjs")).href)};
const result = postChatgptMessage({
  messageId: "race-1",
  authorizer: "OWNER_TAGIA",
  authorized: true,
  packageId: "STUDIO-OPERATING-CHATGPT-SCOUT-OPS-BRIDGE-1",
  kind: "review",
  body: "Same review from both processes."
});
process.stdout.write(JSON.stringify({ ok: result.ok, idempotent: result.idempotent === true, executed: result.executed }));
`,
    );
    const run = () =>
      new Promise((resolve) => {
        const child = spawn(process.execPath, [childPath], {
          cwd: process.cwd(),
          windowsHide: true,
          env: { ...process.env, OPS_BRIDGE_MESSAGES: messageFile },
        });
        let out = "";
        child.stdout.on("data", (chunk) => {
          out += chunk;
        });
        child.on("close", () => resolve(JSON.parse(out)));
      });
    const [first, second] = await Promise.all([run(), run()]);
    expect([first, second].every((row) => row.ok === true && row.executed === false)).toBe(true);
    expect([first, second].filter((row) => row.idempotent).length).toBe(1);
    expect(readBridgeMessages().messages.map((message) => message.messageId)).toEqual(["race-1"]);
    unlinkSync(childPath);
  });

  it("exposes send and read tools that cannot mark Scout consumption", () => {
    const sent = handleJsonRpc({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "studio_message_send",
        arguments: {
          messageId: "tool-1",
          authorizer: "OWNER_TAGIA",
          authorized: true,
          packageId: "STUDIO-OPERATING-CHATGPT-SCOUT-OPS-BRIDGE-1",
          kind: "message",
          body: "Tool delivery.",
        },
      },
    }, {});
    const payload = JSON.parse(sent.payload.result.content[0].text);
    expect(payload.ok).toBe(true);
    expect(payload.executed).toBe(false);
    expect(payload.message.cursorScoutConsumed).toBe(false);
    const read = handleJsonRpc({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "studio_message_read", arguments: {} },
    }, {});
    const listed = JSON.parse(read.payload.result.content[0].text);
    expect(listed.messages[0].messageId).toBe("tool-1");
    expect(listed.messages[0].cursorScoutConsumed).toBe(false);
    expect(listed.executed).toBe(false);
  });

  it("detects a Scout message without consuming it or duplicating it", () => {
    chatgpt("detect-1", { kind: "clarification", body: "Did the listener see this?" });
    const parked = readBridgeMessages();
    expect(parked.messages).toHaveLength(1);
    expect(parked.messages[0].scoutDetectedAt).toBeNull();
    expect(parked.messages[0].cursorScoutConsumed).toBe(false);
    const noticed = noticeInbox();
    expect(noticed.executed).toBe(false);
    expect(noticed.pending).toEqual(["detect-1"]);
    expect(noticed.messages[0].scoutDetectedAt).toBeTruthy();
    expect(noticed.messages[0].cursorScoutConsumed).toBe(false);
    expect(noticed.messages[0].unresolved).toBe(true);
    const again = noticeInbox();
    expect(again.messages).toHaveLength(1);
    expect(again.messages[0].scoutDetectedAt).toBe(noticed.messages[0].scoutDetectedAt);
    const consumed = markScoutConsumed("detect-1", { localScout: true });
    expect(consumed.message.cursorScoutConsumed).toBe(true);
    expect(consumed.executed).toBe(false);
    const reply = postScoutMessage({
      localScout: true,
      messageId: "detect-1-reply",
      authorizer: "OWNER_TAGIA",
      authorized: true,
      packageId: "STUDIO-OPERATING-CHATGPT-SCOUT-OPS-BRIDGE-1",
      kind: "reply",
      body: "Yes. Detection is not execution.",
      inReplyTo: "detect-1",
    });
    expect(reply.ok).toBe(true);
    const settled = noticeInbox();
    const question = settled.messages.find((message) => message.messageId === "detect-1");
    expect(question.pending).toBe(false);
    expect(question.answered).toBe(true);
    expect(question.unresolved).toBe(false);
    expect(settled.messages.map((message) => message.messageId)).toEqual(["detect-1", "detect-1-reply"]);
  });

  it("keeps a message through a quiet gap and marks it overdue without deleting it", () => {
    const previous = process.env.OPS_BRIDGE_MESSAGE_OVERDUE_MS;
    process.env.OPS_BRIDGE_MESSAGE_OVERDUE_MS = "0";
    try {
      chatgpt("late-1", { body: "This sat unanswered." });
      const duringGap = readBridgeMessages();
      expect(duringGap.messages).toHaveLength(1);
      expect(duringGap.messages[0].scoutDetectedAt).toBeNull();
      const noticed = noticeInbox();
      expect(noticed.overdue).toEqual(["late-1"]);
      expect(noticed.messages[0].pending).toBe(true);
      expect(noticed.messages[0].cursorScoutConsumed).toBe(false);
      expect(noticed.executed).toBe(false);
      const child = spawnSync(
        process.execPath,
        ["scripts/ops-bridge-scout-inbox.mjs", "notice"],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          windowsHide: true,
          env: { ...process.env, OPS_BRIDGE_MESSAGES: messageFile, OPS_BRIDGE_MESSAGE_OVERDUE_MS: "0" },
        },
      );
      expect(child.status).toBe(0);
      const restarted = JSON.parse(child.stdout);
      expect(restarted.messages).toHaveLength(1);
      expect(restarted.messages[0].scoutDetectedAt).toBe(noticed.messages[0].scoutDetectedAt);
      expect(restarted.messages[0].overdue).toBe(true);
      expect(restarted.messages[0].cursorScoutConsumed).toBe(false);
      expect(restarted.executed).toBe(false);
    } finally {
      if (previous == null) delete process.env.OPS_BRIDGE_MESSAGE_OVERDUE_MS;
      else process.env.OPS_BRIDGE_MESSAGE_OVERDUE_MS = previous;
    }
  });

  it("does not change the active package when a message is noticed", () => {
    const heartbeat = JSON.parse(readFileSync("docs/launch/project-alpha-work-heartbeat.json", "utf8")) as { packageId?: string };
    chatgpt("package-boundary", { packageId: "NOT-THE-ACTIVE-PACKAGE", body: "Do not switch packages." });
    const noticed = noticeInbox();
    expect(noticed.executed).toBe(false);
    const after = JSON.parse(readFileSync("docs/launch/project-alpha-work-heartbeat.json", "utf8")) as { packageId?: string };
    expect(after.packageId).toBe(heartbeat.packageId);
    expect(noticed.messages[0].packageId).toBe("NOT-THE-ACTIVE-PACKAGE");
  });
});
