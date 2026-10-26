/**
 * Durable production receipt for the existing Owner desk.
 * Heartbeat races must not hide a live packet.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PRODUCTION_STATUS_JSON = path.join(
  ROOT,
  "docs/launch/project-alpha-production-status.json",
);

export const PRODUCTION_STATES = ["RECEIVED", "WORKING", "ISSUE", "COMPLETE"];
/** Same window as the desk watchdog. An older receipt is not a live packet. */
export const PRODUCTION_RECEIPT_FRESH_MS = 10 * 60 * 1000;

const LINES = {
  RECEIVED: "Received. Production has your decision.",
  WORKING: "Working. The next packet is in the shop.",
  ISSUE: "Issue. Production is blocked.",
  COMPLETE: "Complete. The packet is coming back to your desk.",
  QUIET: "Quiet. No production packet is open.",
};

export function presentProductionReceipt(raw) {
  const state = PRODUCTION_STATES.includes(raw?.state) ? raw.state : "";
  const key = state || "QUIET";
  return {
    state,
    label: String(raw?.label || ""),
    detail: String(raw?.detail || LINES[key]),
    line: LINES[key],
    packetId: String(raw?.packetId || ""),
    updatedAt: raw?.updatedAt || null,
  };
}

export function productionReceiptForDesk(raw, now = Date.now()) {
  const stored = presentProductionReceipt(raw);
  if (!stored.state) {
    return { ...stored, stale: false, fresh: false, unavailable: false };
  }
  const updatedMs = Date.parse(stored.updatedAt || "");
  const fresh =
    Number.isFinite(updatedMs) && now - updatedMs < PRODUCTION_RECEIPT_FRESH_MS;
  if (fresh) {
    return { ...stored, stale: false, fresh: true, unavailable: false };
  }
  const when = stored.updatedAt || "an unknown time";
  return {
    ...stored,
    recordedState: stored.state,
    recordedDetail: stored.detail,
    state: "",
    line: LINES.QUIET,
    detail: `Stale. No production update since ${when}. The old record said: ${stored.detail}`,
    stale: true,
    fresh: false,
    unavailable: false,
  };
}

export function readProductionReceipt(now = Date.now()) {
  if (!existsSync(PRODUCTION_STATUS_JSON)) return productionReceiptForDesk(null, now);
  try {
    return productionReceiptForDesk(JSON.parse(readFileSync(PRODUCTION_STATUS_JSON, "utf8")), now);
  } catch {
    const quiet = productionReceiptForDesk(null, now);
    return {
      ...quiet,
      detail: "Unavailable. The production record could not be read.",
      unavailable: true,
    };
  }
}

export function writeProductionReceipt(input) {
  const next = presentProductionReceipt({
    ...input,
    updatedAt: input.updatedAt || new Date().toISOString(),
  });
  writeFileSync(
    PRODUCTION_STATUS_JSON,
    `${JSON.stringify(
      {
        packetId: next.packetId,
        label: next.label,
        state: next.state,
        detail: next.detail,
        updatedAt: next.updatedAt,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return next;
}
