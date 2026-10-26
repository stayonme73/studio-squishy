/**
 * ChatGPT ↔ Scout message inbox.
 * A stored message is bridge receipt only. It does not execute work and it does
 * not mean Cursor Scout has read it.
 */
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MESSAGES = path.join(ROOT, "docs/launch/owner-bridge/messages.jsonl");
const AUTHORIZER = "OWNER_TAGIA";
const PARTIES = new Set(["CHATGPT", "SCOUT", "OWNER"]);
const OWNER_POKE_STALL_MS = 3 * 60 * 1000;
const KINDS = new Set([
  "message",
  "acknowledgement",
  "reply",
  "progress",
  "review",
  "clarification",
]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;

function messagesPath() {
  const override = process.env.OPS_BRIDGE_MESSAGES;
  if (typeof override === "string" && override.trim()) return path.resolve(override.trim());
  return DEFAULT_MESSAGES;
}

function waitBriefly() {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
}

function withMessageLock(work) {
  const lockPath = path.join(os.tmpdir(), "studio-ops-bridge-message.lock");
  const started = Date.now();
  let fd = null;
  while (fd === null && Date.now() - started < 2000) {
    try {
      fd = openSync(lockPath, "wx");
    } catch (error) {
      if (!error || error.code !== "EEXIST") throw error;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > 5000) unlinkSync(lockPath);
      } catch {
        /* the other writer still holds it */
      }
      waitBriefly();
    }
  }
  if (fd === null) return { ok: false, reason: "message_lock_busy", stored: false, executed: false };
  try {
    return work();
  } finally {
    closeSync(fd);
    try { unlinkSync(lockPath); } catch { /* already released */ }
  }
}

function readMessages() {
  const file = messagesPath();
  if (!existsSync(file)) return [];
  const messages = [];
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed.messageId === "string") messages.push(parsed);
    } catch {
      /* a torn line from an interrupted write is not a message */
    }
  }
  return messages.sort((left, right) => left.sequence - right.sequence);
}

function writeMessages(messages) {
  const file = messagesPath();
  mkdirSync(path.dirname(file), { recursive: true });
  const next = `${file}.next`;
  const body = messages.map((message) => JSON.stringify(message)).join("\n");
  writeFileSync(next, body.length ? `${body}\n` : "", "utf8");
  if (existsSync(file)) unlinkSync(file);
  renameSync(next, file);
}

function plainLine(value, max) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max || /[\0\r\n]/.test(trimmed)) return "";
  return trimmed;
}

function sameMessage(existing, next) {
  return existing.kind === next.kind
    && existing.body === next.body
    && existing.packageId === next.packageId
    && existing.assignmentId === next.assignmentId
    && existing.inReplyTo === next.inReplyTo
    && existing.sender === next.sender
    && existing.recipient === next.recipient;
}

function presentMessage(message, messages = []) {
  const pending = message.recipient === "SCOUT"
    ? message.cursorScoutConsumed !== true
    : message.chatgptRetrievedAt == null;
  const answered = messages.some((other) => other.messageId !== message.messageId && other.inReplyTo === message.messageId);
  return {
    ...message,
    executed: false,
    bridgeReceived: true,
    cursorScoutConsumed: message.cursorScoutConsumed === true,
    scoutDetectedAt: message.scoutDetectedAt ?? null,
    chatgptDetectedAt: message.chatgptDetectedAt ?? null,
    pending,
    answered,
    unresolved: message.kind === "clarification" && !answered,
    overdue: pending && message.overdue === true,
  };
}

function reject(reason) {
  return { ok: false, reason, stored: false, executed: false, cursorScoutConsumed: false };
}

function authorize(input) {
  if (!input || typeof input !== "object") return reject("unsigned_or_unapproved");
  if (input.authorized !== true || input.authorizer !== AUTHORIZER) return reject("unsigned_or_unapproved");
  if (input.command != null || input.shell != null || input.prompt != null || input.protectedAction === true) {
    return reject("message_is_not_execution");
  }
  return null;
}

function buildRecord(input, sender, recipient, messages) {
  const denied = authorize(input);
  if (denied) return denied;
  const messageId = plainLine(input.messageId, 80);
  if (!ID_PATTERN.test(messageId)) return reject("message_id_invalid");
  const packageId = plainLine(input.packageId, 120);
  if (!packageId) return reject("package_required");
  const kind = input.kind;
  if (!KINDS.has(kind)) return reject("unknown_message_kind");
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!body || body.length > 2000 || body.includes("\0")) return reject("message_body_invalid");
  if (/\bsk_(?:live|test)_|\bBearer\s+\S+/i.test(body)) return reject("message_withheld");
  const assignmentId = input.assignmentId == null || input.assignmentId === ""
    ? null
    : plainLine(input.assignmentId, 120);
  if (input.assignmentId != null && input.assignmentId !== "" && !assignmentId) {
    return reject("assignment_invalid");
  }
  const inReplyTo = input.inReplyTo == null || input.inReplyTo === ""
    ? null
    : plainLine(input.inReplyTo, 80);
  if (inReplyTo && !ID_PATTERN.test(inReplyTo)) return reject("reply_target_invalid");
  if (inReplyTo && !messages.some((message) => message.messageId === inReplyTo)) {
    return reject("reply_target_missing");
  }
  const record = {
    messageId,
    sender,
    recipient,
    packageId,
    assignmentId,
    kind,
    body,
    inReplyTo,
  };
  const existing = messages.find((message) => message.messageId === messageId);
  if (existing) {
    if (!sameMessage(existing, record)) return reject("duplicate_message");
    return { ok: true, reason: "accepted", idempotent: true, stored: true, executed: false, message: presentMessage(existing, messages) };
  }
  const now = new Date().toISOString();
  const sequence = messages.reduce((max, message) => Math.max(max, message.sequence || 0), 0) + 1;
  return {
    ok: true,
    record: {
      ...record,
      sequence,
      at: now,
      bridgeReceivedAt: now,
      bridgeReceived: true,
      cursorScoutConsumed: false,
      cursorScoutConsumedAt: null,
      chatgptRetrievedAt: null,
      scoutDetectedAt: null,
      chatgptDetectedAt: null,
      overdue: false,
      overdueAt: null,
      executed: false,
    },
  };
}

export function postChatgptMessage(input) {
  if (input && typeof input === "object" && input.sender != null && input.sender !== "CHATGPT") {
    return reject("sender_not_permitted");
  }
  if (input && typeof input === "object" && input.recipient != null && input.recipient !== "SCOUT") {
    return reject("recipient_not_permitted");
  }
  return withMessageLock(() => {
    const messages = readMessages();
    const built = buildRecord(input, "CHATGPT", "SCOUT", messages);
    if (!built.ok || built.idempotent) return built;
    const file = messagesPath();
    mkdirSync(path.dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify(built.record)}\n`, "utf8");
    return {
      ok: true,
      reason: "accepted",
      idempotent: false,
      stored: true,
      executed: false,
      message: presentMessage(built.record, messages.concat(built.record)),
    };
  });
}

function pokeIsRead(message) {
  if (!message) return false;
  if (message.recipient === "SCOUT") return message.cursorScoutConsumed === true;
  if (message.recipient === "CHATGPT") return message.chatgptRetrievedAt != null;
  return false;
}

export function presentOwnerPoke(message, messages = [], nowMs = Date.now()) {
  const read = pokeIsRead(message);
  const receivedAt = Date.parse(message.bridgeReceivedAt || message.at || "");
  const age = nowMs - receivedAt;
  const held = message.recipient === "SCOUT"
    ? Boolean(message.scoutDetectedAt)
    : Boolean(message.chatgptDetectedAt);
  const answered = messages.some((other) => other.messageId !== message.messageId && other.inReplyTo === message.messageId);
  return {
    ...presentMessage(message, messages),
    executed: false,
    delivered: message.bridgeReceived === true,
    bridgeHolding: held && !read,
    scoutRead: message.recipient === "SCOUT" && read,
    chatRead: message.recipient === "CHATGPT" && read,
    answered,
    stalled: !read && Number.isFinite(age) && age >= OWNER_POKE_STALL_MS,
    wakesScout: false,
    wakesChat: false,
    closedPhoneAlerts: false,
  };
}

export function listOwnerPokes(nowMs = Date.now()) {
  return withMessageLock(() => {
    const messages = readMessages();
    return {
      ok: true,
      executed: false,
      wakesScout: false,
      wakesChat: false,
      closedPhoneAlerts: false,
      pokes: messages
        .filter((message) => message.sender === "OWNER")
        .map((message) => presentOwnerPoke(message, messages, nowMs)),
    };
  });
}

export function postOwnerPoke(input) {
  if (!input || input.localDesk !== true) return reject("owner_poke_is_desk_only");
  const recipient = input.recipient === "SCOUT" || input.recipient === "CHATGPT" ? input.recipient : "";
  if (!recipient) return reject("recipient_not_permitted");
  return withMessageLock(() => {
    const messages = readMessages();
    const open = messages.find((message) => message.sender === "OWNER" && message.recipient === recipient && !pokeIsRead(message));
    if (open) {
      return {
        ok: true,
        reason: "poke_already_open",
        idempotent: true,
        stored: true,
        executed: false,
        message: presentOwnerPoke(open, messages),
      };
    }
    const built = buildRecord({
      ...input,
      messageId: `owner-poke-${recipient.toLowerCase()}-${Date.now()}`,
      packageId: input.packageId || "STUDIO-OPERATING-OWNER-CONSOLE-COMMS-DESK-1",
      kind: "message",
      body: typeof input.body === "string" && input.body.trim()
        ? input.body
        : `Owner desk note for ${recipient}. This is a note. It does not open ${recipient}.`,
      inReplyTo: null,
    }, "OWNER", recipient, messages);
    if (!built.ok || built.idempotent) return built;
    const file = messagesPath();
    mkdirSync(path.dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify(built.record)}\n`, "utf8");
    const visible = messages.concat(built.record);
    return {
      ok: true,
      reason: "accepted",
      idempotent: false,
      stored: true,
      executed: false,
      message: presentOwnerPoke(built.record, visible),
    };
  });
}

export function postScoutMessage(input) {
  if (!input || input.localScout !== true) return reject("scout_reply_is_local_only");
  return withMessageLock(() => {
    const messages = readMessages();
    const built = buildRecord(input, "SCOUT", "CHATGPT", messages);
    if (!built.ok || built.idempotent) return built;
    const file = messagesPath();
    mkdirSync(path.dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify(built.record)}\n`, "utf8");
    return {
      ok: true,
      reason: "accepted",
      idempotent: false,
      stored: true,
      executed: false,
      message: presentMessage(built.record, messages.concat(built.record)),
    };
  });
}

export function readBridgeMessages() {
  return withMessageLock(() => {
    const messages = readMessages();
    return {
      ok: true,
      executed: false,
      messages: messages.map((message) => presentMessage(message, messages)),
    };
  });
}

export function listBridgeMessages() {
  return withMessageLock(() => {
    const messages = readMessages();
    let changed = false;
    const now = new Date().toISOString();
    const visible = messages.map((message) => {
      if (message.recipient === "CHATGPT" && message.chatgptRetrievedAt == null) {
        changed = true;
        return { ...message, chatgptRetrievedAt: now, overdue: false };
      }
      return message;
    });
    if (changed) writeMessages(visible);
    return {
      ok: true,
      executed: false,
      messages: visible.map((message) => presentMessage(message, visible)),
    };
  });
}

export function markScoutConsumed(messageId, options = {}) {
  if (options.localScout !== true) return reject("scout_receipt_is_local_only");
  const id = plainLine(messageId, 80);
  if (!ID_PATTERN.test(id)) return reject("message_id_invalid");
  return withMessageLock(() => {
    const messages = readMessages();
    const index = messages.findIndex((message) => message.messageId === id);
    if (index < 0) return reject("message_not_found");
    const current = messages[index];
    if (current.recipient !== "SCOUT") return reject("not_addressed_to_scout");
    if (current.cursorScoutConsumed === true) {
      return { ok: true, reason: "accepted", idempotent: true, stored: true, executed: false, message: presentMessage(current, messages) };
    }
    const now = new Date().toISOString();
    messages[index] = {
      ...current,
      cursorScoutConsumed: true,
      cursorScoutConsumedAt: now,
      overdue: false,
    };
    writeMessages(messages);
    return {
      ok: true,
      reason: "accepted",
      idempotent: false,
      stored: true,
      executed: false,
      message: presentMessage(messages[index], messages),
    };
  });
}

export function noticeInbox(nowMs = Date.now()) {
  const configured = Number(process.env.OPS_BRIDGE_MESSAGE_OVERDUE_MS);
  const overdueMs = Number.isInteger(configured) && configured >= 0 && configured <= 86_400_000
    ? configured
    : 15 * 60 * 1000;
  return withMessageLock(() => {
    const messages = readMessages();
    let changed = false;
    const noticedAt = new Date(nowMs).toISOString();
    const next = messages.map((message) => {
      let updated = message;
      const pending = message.recipient === "SCOUT"
        ? message.cursorScoutConsumed !== true
        : message.chatgptRetrievedAt == null;
      if (pending && message.recipient === "SCOUT" && !message.scoutDetectedAt) {
        updated = { ...updated, scoutDetectedAt: noticedAt };
        changed = true;
      }
      if (pending && message.recipient === "CHATGPT" && !message.chatgptDetectedAt) {
        updated = { ...updated, chatgptDetectedAt: noticedAt };
        changed = true;
      }
      const receivedAt = Date.parse(message.bridgeReceivedAt || message.at || "");
      const age = nowMs - receivedAt;
      if (pending && Number.isFinite(age) && age >= overdueMs && updated.overdue !== true) {
        updated = { ...updated, overdue: true, overdueAt: noticedAt };
        changed = true;
      }
      if (!pending && updated.overdue === true) {
        updated = { ...updated, overdue: false };
        changed = true;
      }
      return updated;
    });
    if (changed) writeMessages(next);
    const visible = next.map((message) => presentMessage(message, next));
    return {
      ok: true,
      executed: false,
      noticed: visible.filter((message) => message.scoutDetectedAt || message.chatgptDetectedAt).length,
      pending: visible.filter((message) => message.pending).map((message) => message.messageId),
      overdue: visible.filter((message) => message.overdue).map((message) => message.messageId),
      messages: visible,
    };
  });
}

export function startInboxNotice(intervalMs = 15_000) {
  const run = () => {
    try {
      noticeInbox();
    } catch {
      /* a locked inbox must not stop the bridge */
    }
  };
  run();
  const timer = setInterval(run, intervalMs);
  if (typeof timer.unref === "function") timer.unref();
  return timer;
}

export const OPS_BRIDGE_OWNER_POKE_STALL_MS = OWNER_POKE_STALL_MS;
export const OPS_BRIDGE_MESSAGE_PARTIES = [...PARTIES];
export const OPS_BRIDGE_MESSAGE_KINDS = [...KINDS];
