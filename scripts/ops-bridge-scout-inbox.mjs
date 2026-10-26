/**
 * Local Cursor Scout inbox. This is not available to ChatGPT.
 * Running `consume` is the only step that records Cursor Scout receipt.
 */
import { markScoutConsumed, noticeInbox, postScoutMessage, readBridgeMessages } from "./ops-bridge-messages.mjs";

const command = process.argv[2];
const arg = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index < 0) return "";
  return process.argv[index + 1] ?? "";
};

let result;
if (command === "list") {
  result = readBridgeMessages();
} else if (command === "consume") {
  result = markScoutConsumed(arg("--id"), { localScout: true });
} else if (command === "reply") {
  result = postScoutMessage({
    localScout: true,
    messageId: arg("--id"),
    authorizer: "OWNER_TAGIA",
    authorized: true,
    packageId: arg("--package"),
    assignmentId: arg("--assignment") || null,
    kind: arg("--kind") || "reply",
    body: arg("--body"),
    inReplyTo: arg("--in-reply-to") || null,
  });
} else if (command === "notice") {
  result = noticeInbox();
} else {
  result = { ok: false, reason: "unknown_command", executed: false };
}

process.stdout.write(`${JSON.stringify(result)}\n`);
process.exit(result.ok ? 0 : 2);
