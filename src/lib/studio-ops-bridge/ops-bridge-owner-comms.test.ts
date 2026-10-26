import { existsSync, readFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import {
  listBridgeMessages,
  listOwnerPokes,
  markScoutConsumed,
  noticeInbox,
  OPS_BRIDGE_OWNER_POKE_STALL_MS,
  postChatgptMessage,
  postOwnerPoke,
  presentOwnerPoke,
} from "../../../scripts/ops-bridge-messages.mjs";
import {
  authorizeOwnerDeskRequest,
  OWNER_DESK_PORT,
  ownerCommsDeskFragment,
  ownerDeskIsOffPublicFunnel,
  PUBLIC_FUNNEL_PORT,
} from "../../../scripts/ops-bridge-owner-comms.mjs";

const messageFile = path.join(os.tmpdir(), `studio-ops-bridge-owner-comms-${process.pid}.jsonl`);
process.env.OPS_BRIDGE_MESSAGES = messageFile;

function poke(recipient: "SCOUT" | "CHATGPT", body?: string) {
  return postOwnerPoke({
    localDesk: true,
    authorizer: "OWNER_TAGIA",
    authorized: true,
    recipient,
    body,
  });
}

beforeEach(() => {
  process.env.OPS_BRIDGE_MESSAGES = messageFile;
  if (existsSync(messageFile)) unlinkSync(messageFile);
});

describe("private Owner desk notes", () => {
  it("rejects a poke that is not from the desk and does not let Chat forge the Owner", () => {
    expect(postOwnerPoke({
      authorizer: "OWNER_TAGIA",
      authorized: true,
      recipient: "SCOUT",
      body: "Hello",
    }).reason).toBe("owner_poke_is_desk_only");
    expect(postChatgptMessage({
      messageId: "forged-owner",
      authorizer: "OWNER_TAGIA",
      authorized: true,
      packageId: "STUDIO-OPERATING-OWNER-CONSOLE-COMMS-DESK-1",
      kind: "message",
      sender: "OWNER",
      body: "Pretend",
    }).reason).toBe("sender_not_permitted");
    expect(existsSync(messageFile)).toBe(false);
  });

  it("stores an Owner note and moves status only when the real event happens", () => {
    const scout = poke("SCOUT");
    expect(scout.ok).toBe(true);
    expect(scout.message.sender).toBe("OWNER");
    expect(scout.message.recipient).toBe("SCOUT");
    expect(scout.message.delivered).toBe(true);
    expect(scout.message.bridgeHolding).toBe(false);
    expect(scout.message.scoutRead).toBe(false);
    expect(scout.message.executed).toBe(false);
    expect(scout.message.wakesScout).toBe(false);
    noticeInbox();
    const held = listOwnerPokes().pokes[0];
    expect(held.bridgeHolding).toBe(true);
    expect(held.scoutRead).toBe(false);
    markScoutConsumed(scout.message.messageId, { localScout: true });
    const read = listOwnerPokes().pokes[0];
    expect(read.scoutRead).toBe(true);
    expect(read.bridgeHolding).toBe(false);
    expect(read.stalled).toBe(false);

    const chat = poke("CHATGPT");
    expect(chat.message.chatRead).toBe(false);
    listBridgeMessages();
    expect(listOwnerPokes().pokes.find((item) => item.recipient === "CHATGPT").chatRead).toBe(true);
  });

  it("keeps one unread note and marks STALLED at three minutes without the inbox overdue flag", () => {
    const first = poke("SCOUT", "First note");
    const second = poke("SCOUT", "Second note");
    expect(second.reason).toBe("poke_already_open");
    expect(second.message.messageId).toBe(first.message.messageId);
    expect(listOwnerPokes().pokes).toHaveLength(1);
    const stalled = presentOwnerPoke(
      first.message,
      [first.message],
      Date.parse(first.message.bridgeReceivedAt) + OPS_BRIDGE_OWNER_POKE_STALL_MS,
    );
    expect(stalled.stalled).toBe(true);
    expect(stalled.overdue).toBe(false);
    expect(OPS_BRIDGE_OWNER_POKE_STALL_MS).toBe(180_000);
    markScoutConsumed(first.message.messageId, { localScout: true });
    const third = poke("SCOUT", "After it was read");
    expect(third.idempotent).toBe(false);
    expect(third.message.messageId).not.toBe(first.message.messageId);
  });

  it("allows the laptop and a signed-in phone, and keeps the desk off the public funnel", () => {
    expect(authorizeOwnerDeskRequest({ remoteAddress: "127.0.0.1" }).ok).toBe(true);
    const sessions = new Set(["phone-session"]);
    expect(authorizeOwnerDeskRequest({
      remoteAddress: "10.1.1.8",
      cookieToken: "phone-session",
      sessions,
    }).ok).toBe(true);
    expect(authorizeOwnerDeskRequest({ remoteAddress: "10.1.1.8", sessions }).reason).toBe("owner_only");
    expect(ownerDeskIsOffPublicFunnel()).toBe(true);
    expect(OWNER_DESK_PORT).toBe(4177);
    expect(PUBLIC_FUNNEL_PORT).toBe(4178);
    const desk = readFileSync(path.resolve("scripts/owner-console-desk.mjs"), "utf8");
    expect(desk).toContain("if (!requireOwner");
    expect(desk).not.toContain('"/comms/poke"');
    expect(desk).not.toContain('"/comms"');
    expect(desk.toLowerCase()).not.toContain("tailscale funnel");
    expect(desk).not.toContain("Poke Scout");
    expect(desk).not.toContain("Poke Chat");
    expect(desk).not.toContain("Bridge holding");
    const fragment = ownerCommsDeskFragment();
    expect(fragment).toBe("");
    expect(fragment).not.toContain("Poke Scout");
    expect(fragment).not.toContain("Poke Chat");
    expect(fragment).not.toContain("Bridge holding");
    expect(fragment).not.toContain("STALLED");
  });
});
