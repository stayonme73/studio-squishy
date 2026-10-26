/**
 * Shared launch control register — read/write, stale detection, transport inventory.
 * Communication evidence only; does not execute bridge inbound actions.
 */
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const SHARED_LAUNCH_CONTROL_DIR = path.join(
  ROOT,
  "docs/launch/studio-shared-truth-and-communication-cert-1",
);
export const SHARED_LAUNCH_CONTROL_MARKDOWN = path.join(
  SHARED_LAUNCH_CONTROL_DIR,
  "STUDIO-SHARED-LAUNCH-CONTROL-v1.1.md",
);
export const SHARED_LAUNCH_CONTROL_REGISTER = path.join(
  SHARED_LAUNCH_CONTROL_DIR,
  "shared-launch-control-register.json",
);
export const SHARED_LAUNCH_CONTROL_EVENTS = path.join(
  SHARED_LAUNCH_CONTROL_DIR,
  "shared-launch-control-events.jsonl",
);
export const THREAD_HANDOFF_DIR = path.join(SHARED_LAUNCH_CONTROL_DIR, "thread-handoffs");

const CANONICAL_MD = path.join(
  ROOT,
  "docs/launch/studio-canonical-launch-truth-1/STUDIO-CANONICAL-LAUNCH-TRUTH.md",
);
const CANONICAL_TS = path.join(ROOT, "src/config/studio-canonical-launch-truth-v1.ts");

function readJson(file, fallback = null) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function sha256File(file) {
  if (!existsSync(file)) return null;
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

export function buildTransportInventory() {
  const bridgeDir = path.join(ROOT, "docs/launch/owner-bridge");
  return {
    assessedAt: new Date().toISOString(),
    authoritativeLaunchControl: {
      markdown: path.relative(ROOT, SHARED_LAUNCH_CONTROL_MARKDOWN).replace(/\\/g, "/"),
      register: path.relative(ROOT, SHARED_LAUNCH_CONTROL_REGISTER).replace(/\\/g, "/"),
      events: path.relative(ROOT, SHARED_LAUNCH_CONTROL_EVENTS).replace(/\\/g, "/"),
    },
    transports: [
      {
        id: "repo_files",
        readWrite: "Scout read/write local; ChatGPT read/write only with reachable clone or Owner copy",
        paths: [
          "docs/launch/owner-bridge/messages.jsonl",
          "docs/launch/owner-bridge/outbound-snapshot.json",
          "docs/launch/owner-bridge/inbound-decisions.jsonl",
          "docs/launch/owner-bridge/acknowledgements.jsonl",
        ],
        zeroCourier: false,
      },
      {
        id: "ops_bridge_https_local",
        readWrite: "GET snapshot/inbound ack; POST inbound when origin on 127.0.0.1:4178 running",
        chatgptDotComReachLocalhost: false,
      },
      {
        id: "ops_bridge_https_public_tunnel",
        readWrite: "Documented Cloudflare quick tunnel when running; not uptime guaranteed",
        zeroCourier: false,
        note: "See outbound-snapshot.json transport block for last known public base URL",
      },
      {
        id: "ops_bridge_mcp_oauth",
        readWrite: "studio_snapshot, studio_inbound, studio_message_send/read when MCP origin + OAuth live",
        zeroCourier: false,
      },
      {
        id: "github_owner_bridge_branch",
        readWrite: "Read-only narrow publish historical; GitHub connector rejected for write",
        branch: "owner-bridge",
      },
      {
        id: "owner_desk_4177",
        readWrite: "Owner poke Scout/Chat; PIN gated; not ChatGPT autonomous transport",
      },
      {
        id: "dropbox",
        readWrite: "Owner handoff surface from 2026-10-24; not months-long historical authority",
      },
      {
        id: "chatgpt_dot_com",
        readWrite: "No continuous repo access; requires MCP/tunnel/copy round trip",
        autonomousSync: false,
      },
    ],
    bridgeFilesPresent: {
      messagesJsonl: existsSync(path.join(bridgeDir, "messages.jsonl")),
      snapshotJson: existsSync(path.join(bridgeDir, "outbound-snapshot.json")),
    },
  };
}

export function detectStaleLaunchRecords() {
  const stale = [];
  if (existsSync(CANONICAL_MD) && existsSync(CANONICAL_TS)) {
    const md = readFileSync(CANONICAL_MD, "utf8");
    const ts = readFileSync(CANONICAL_TS, "utf8");
    if (/four homepage packages|four_package|four-package/i.test(md) && /three_package_door/.test(ts)) {
      stale.push({
        gateId: "C-02",
        reason: "Markdown four-package ruling vs TS three_package_door",
        evidence: [
          path.relative(ROOT, CANONICAL_MD).replace(/\\/g, "/"),
          path.relative(ROOT, CANONICAL_TS).replace(/\\/g, "/"),
        ],
      });
    }
  }
  const cutover = path.join(
    ROOT,
    "docs/launch/studio-prelaunch-infrastructure-completion-1/PRODUCTION-CUTOVER-CHECKLIST.md",
  );
  if (existsSync(cutover)) {
    const text = readFileSync(cutover, "utf8");
    if (/FS object store|flyer, FS/i.test(text)) {
      stale.push({
        gateId: "T-03",
        reason: "Cutover checklist still mentions FS Phase B; Oct 2025 Supabase Phase B proof supersedes wording",
        evidence: [path.relative(ROOT, cutover).replace(/\\/g, "/")],
      });
    }
  }
  const snapshotPath = path.join(ROOT, "docs/launch/owner-bridge/outbound-snapshot.json");
  const snap = readJson(snapshotPath);
  if (snap?.counts?.launchPackageCount === 3) {
    stale.push({
      gateId: "OPS-SNAPSHOT-COUNTS",
      reason: "Outbound snapshot counts still three_package_door",
      evidence: [path.relative(ROOT, snapshotPath).replace(/\\/g, "/")],
    });
  }
  return stale;
}

export function ensureRegisterDefaults() {
  mkdirSync(SHARED_LAUNCH_CONTROL_DIR, { recursive: true });
  if (!existsSync(SHARED_LAUNCH_CONTROL_REGISTER)) {
    const initial = {
      schemaVersion: 1,
      registerId: "STUDIO-SHARED-LAUNCH-CONTROL-REGISTER-1",
      markdownVersion: "v1.1",
      asOfEvidenceDate: "2026-10-25",
      authoritativeMarkdown: path
        .relative(ROOT, SHARED_LAUNCH_CONTROL_MARKDOWN)
        .replace(/\\/g, "/"),
      lastEventAt: null,
      lastEventId: null,
      transportInventoryAt: null,
    };
    writeFileSync(SHARED_LAUNCH_CONTROL_REGISTER, `${JSON.stringify(initial, null, 2)}\n`, "utf8");
  }
  return readJson(SHARED_LAUNCH_CONTROL_REGISTER);
}

export function appendLaunchControlEvent(event) {
  ensureRegisterDefaults();
  const eventId = event.eventId || `evt-${Date.now()}`;
  const at = event.at || new Date().toISOString();
  const row = {
    eventId,
    at,
    packageId: event.packageId || "STUDIO-SHARED-LAUNCH-CONTROL-REGISTER-1",
    kind: event.kind || "update",
    gateId: event.gateId ?? null,
    status: event.status ?? null,
    verifiedBy: event.verifiedBy || "SCOUT",
    evidencePaths: event.evidencePaths ?? [],
    note: event.note ?? "",
    relatedMessageId: event.relatedMessageId ?? null,
  };
  appendFileSync(SHARED_LAUNCH_CONTROL_EVENTS, `${JSON.stringify(row)}\n`, "utf8");
  const register = readJson(SHARED_LAUNCH_CONTROL_REGISTER);
  register.lastEventAt = at;
  register.lastEventId = eventId;
  register.markdownSha256 = sha256File(SHARED_LAUNCH_CONTROL_MARKDOWN);
  register.staleFlags = detectStaleLaunchRecords();
  register.transport = buildTransportInventory();
  register.transportInventoryAt = register.transport.assessedAt;
  writeFileSync(SHARED_LAUNCH_CONTROL_REGISTER, `${JSON.stringify(register, null, 2)}\n`, "utf8");
  return row;
}

export function readSharedLaunchControlSummary() {
  ensureRegisterDefaults();
  const register = readJson(SHARED_LAUNCH_CONTROL_REGISTER);
  const staleFlags = detectStaleLaunchRecords();
  let markdownMtime = null;
  if (existsSync(SHARED_LAUNCH_CONTROL_MARKDOWN)) {
    markdownMtime = new Date(statSync(SHARED_LAUNCH_CONTROL_MARKDOWN).mtimeMs).toISOString();
  }
  return {
    registerPath: path.relative(ROOT, SHARED_LAUNCH_CONTROL_REGISTER).replace(/\\/g, "/"),
    markdownPath: path.relative(ROOT, SHARED_LAUNCH_CONTROL_MARKDOWN).replace(/\\/g, "/"),
    markdownVersion: register?.markdownVersion ?? "v1.1",
    lastEventAt: register?.lastEventAt ?? null,
    lastEventId: register?.lastEventId ?? null,
    markdownSha256: register?.markdownSha256 ?? sha256File(SHARED_LAUNCH_CONTROL_MARKDOWN),
    markdownMtime,
    staleFlags,
    messageInboxPath: "docs/launch/owner-bridge/messages.jsonl",
    certPackageId: "STUDIO-SHARED-TRUTH-AND-COMMUNICATION-CERT-1",
  };
}

export function writeThreadHandoffStub({ handoffId, originAssistant, synthetic = true }) {
  mkdirSync(THREAD_HANDOFF_DIR, { recursive: true });
  const summary = readSharedLaunchControlSummary();
  const at = new Date().toISOString();
  const file = path.join(THREAD_HANDOFF_DIR, `${handoffId}.md`);
  const body = `# STUDIO thread handoff (${synthetic ? "synthetic cert" : "live"})

**Handoff id:** ${handoffId}  
**Written at (UTC):** ${at}  
**Origin assistant:** ${originAssistant}  
**Destination:** new thread (ChatGPT or Scout)

## One-sentence state
Four homepage packages are doc-reconciled and unpublished; shared launch control v1.1 lives in-repo; ops-bridge inbox carries ChatGPT↔Scout messages when transport is up; launch engineering remains blocked pending Owner authorization.

## Authoritative register
- Markdown: \`${summary.markdownPath}\`
- Register: \`${summary.registerPath}\`
- Last event: ${summary.lastEventAt ?? "none"}
- Stale flags: ${summary.staleFlags.length ? summary.staleFlags.map((s) => s.gateId).join(", ") : "none detected"}

## Permission boundary
No commit, merge, push, deploy, publication, production writes, or protected surface reopen unless Owner explicitly authorizes.

## Continuity check (new thread)
1. Read register JSON and latest events jsonl tail.
2. Read Shared Launch Control markdown v1.1.
3. List stale flags and CONFLICT rows (C-08, T-08, R-03).
4. Do not invent timeline or package order without Owner grant.
`;
  writeFileSync(file, body, "utf8");
  return { handoffId, path: path.relative(ROOT, file).replace(/\\/g, "/"), writtenAt: at };
}
