/**
 * STUDIO-SHARED-TRUTH-AND-COMMUNICATION-CERT-1 — synthetic two-way round trip.
 * Communication only; does not execute inbound package authorization.
 */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendLaunchControlEvent,
  readSharedLaunchControlSummary,
  writeThreadHandoffStub,
} from "./studio-shared-launch-control-lib.mjs";
import {
  listBridgeMessages,
  markScoutConsumed,
  postChatgptMessage,
  postScoutMessage,
  readBridgeMessages,
} from "./ops-bridge-messages.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CERT_DIR = path.join(ROOT, "docs/launch/studio-shared-truth-and-communication-cert-1");
const PROOF_PATH = path.join(CERT_DIR, "SHARED-TRUTH-COMMUNICATION-CERT-PROOF.json");
const CERT_MESSAGES = path.join(CERT_DIR, "cert-roundtrip-messages.jsonl");

const PACKAGE_ID = "STUDIO-SHARED-TRUTH-AND-COMMUNICATION-CERT-1";
const CHAT_ID = `cert-shared-truth-chat-${Date.now()}`;
const SCOUT_REPLY_ID = `cert-shared-truth-scout-reply-${Date.now()}`;

function main() {
  if (existsSync(CERT_MESSAGES)) unlinkSync(CERT_MESSAGES);
  process.env.OPS_BRIDGE_MESSAGES = CERT_MESSAGES;

  const startedAt = new Date().toISOString();
  appendLaunchControlEvent({
    eventId: `evt-cert-start-${Date.now()}`,
    at: startedAt,
    packageId: PACKAGE_ID,
    kind: "cert_start",
    note: "Synthetic two-way round trip started (isolated messages file).",
    evidencePaths: [path.relative(ROOT, CERT_MESSAGES).replace(/\\/g, "/")],
  });

  const chatPost = postChatgptMessage({
    messageId: CHAT_ID,
    authorizer: "OWNER_TAGIA",
    authorized: true,
    packageId: PACKAGE_ID,
    assignmentId: "synthetic-shared-truth-cert",
    kind: "message",
    body:
      "Synthetic Shared Truth cert ping. Communication only. Not authorization to execute launch engineering. Please acknowledge register path and stale C-02 flag.",
  });
  if (!chatPost.ok) {
    writeProof({ verdict: "FAIL", startedAt, failedAt: new Date().toISOString(), step: "chat_post", chatPost });
    process.exitCode = 1;
    return;
  }

  const consumed = markScoutConsumed(CHAT_ID, { localScout: true });
  if (!consumed.ok) {
    writeProof({ verdict: "FAIL", startedAt, failedAt: new Date().toISOString(), step: "scout_consume", consumed });
    process.exitCode = 1;
    return;
  }

  const summary = readSharedLaunchControlSummary();
  const scoutPost = postScoutMessage({
    localScout: true,
    messageId: SCOUT_REPLY_ID,
    authorizer: "OWNER_TAGIA",
    authorized: true,
    packageId: PACKAGE_ID,
    assignmentId: "synthetic-shared-truth-cert",
    kind: "reply",
    inReplyTo: CHAT_ID,
    body: `Acknowledged. Register at ${summary.registerPath}. Stale flags: ${summary.staleFlags.map((s) => s.gateId).join(", ") || "none"}. executed=false.`,
  });
  if (!scoutPost.ok) {
    writeProof({ verdict: "FAIL", startedAt, failedAt: new Date().toISOString(), step: "scout_reply", scoutPost });
    process.exitCode = 1;
    return;
  }

  const chatRead = listBridgeMessages();
  const reply = chatRead.messages.find((m) => m.messageId === SCOUT_REPLY_ID);
  if (!reply?.chatgptRetrievedAt) {
    writeProof({
      verdict: "FAIL",
      startedAt,
      failedAt: new Date().toISOString(),
      step: "chatgpt_read_simulation",
      chatRead,
    });
    process.exitCode = 1;
    return;
  }

  const handoff = writeThreadHandoffStub({
    handoffId: `STUDIO-THREAD-HANDOFF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-SYNTHETIC-CERT`,
    originAssistant: "SCOUT",
    synthetic: true,
  });

  const finishedAt = new Date().toISOString();
  appendLaunchControlEvent({
    eventId: `evt-cert-complete-${Date.now()}`,
    at: finishedAt,
    packageId: PACKAGE_ID,
    kind: "cert_complete",
    status: "PASS",
    relatedMessageId: CHAT_ID,
    note: "Round trip ChatGPT→Scout→ChatGPT on isolated inbox; thread handoff stub written.",
    evidencePaths: [
      path.relative(ROOT, PROOF_PATH).replace(/\\/g, "/"),
      handoff.path,
      path.relative(ROOT, CERT_MESSAGES).replace(/\\/g, "/"),
    ],
  });

  writeProof({
    verdict: "PASS",
    startedAt,
    finishedAt,
    chatMessageId: CHAT_ID,
    scoutReplyId: SCOUT_REPLY_ID,
    chatPost: { ok: chatPost.ok, executed: chatPost.executed },
    consumed: { ok: consumed.ok, executed: consumed.executed },
    scoutPost: { ok: scoutPost.ok, executed: scoutPost.executed },
    chatgptRetrievedAt: reply.chatgptRetrievedAt,
    register: readSharedLaunchControlSummary(),
    handoff,
    inboxTail: readBridgeMessages().messages.map((m) => ({
      messageId: m.messageId,
      sender: m.sender,
      recipient: m.recipient,
      inReplyTo: m.inReplyTo,
      pending: m.pending,
      executed: m.executed,
    })),
  });
}

function writeProof(body) {
  writeFileSync(PROOF_PATH, `${JSON.stringify(body, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ proofPath: PROOF_PATH, verdict: body.verdict }, null, 2));
}

main();
