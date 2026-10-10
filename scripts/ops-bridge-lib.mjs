/**
 * ChatGPT ↔ Scout ops bridge library.
 * Pulse writes the outbound snapshot. Scout consumes only authorized inbound lines.
 * Does not grant merge/push. Does not become customer job truth.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRIDGE_DIR = path.join(ROOT, "docs/launch/owner-bridge");
const SNAPSHOT_JSON = path.join(BRIDGE_DIR, "outbound-snapshot.json");
const SNAPSHOT_MD = path.join(BRIDGE_DIR, "outbound-snapshot.md");
const INBOUND_JSONL = path.join(BRIDGE_DIR, "inbound-decisions.jsonl");
const ACK_JSONL = path.join(BRIDGE_DIR, "acknowledgements.jsonl");
const HEARTBEAT_JSON = path.join(ROOT, "docs/launch/project-alpha-work-heartbeat.json");
const ATTENTION_JSON = path.join(ROOT, "docs/launch/project-alpha-attention-state.json");
const DAILY_BRIDGE = path.join(ROOT, "docs/launch/PROJECT-ALPHA-DAILY-OPERATING-BRIDGE.md");
const CONSUMED_PATH = path.join(BRIDGE_DIR, "consumed-decision-ids.json");

export const OPS_BRIDGE_STALE_MS = 14_400_000;
export const OPS_BRIDGE_AUTHORIZER = "OWNER_TAGIA";
export const OPS_BRIDGE_ACTIONS = [
  "authorize_package",
  "stop",
  "hold",
  "accept_proof",
  "reject_proof",
  "request_correction",
  "publish_authorization",
  "merge_authorization",
  "push_authorization",
  "acknowledge",
];
export const OPS_BRIDGE_PROTECTED_ACTIONS = [
  "publish_authorization",
  "merge_authorization",
  "push_authorization",
];

const SECRET_PATTERNS = [
  /\bsk_(?:live|test)_[A-Za-z0-9]+\b/g,
  /\brk_(?:live|test)_[A-Za-z0-9]+\b/g,
  /\bwhsec_[A-Za-z0-9]+\b/g,
  /\bBearer\s+[A-Za-z0-9._\-]+\b/gi,
  /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^"'\s]+/gi,
  /\bAIza[0-9A-Za-z\-_]{20,}\b/g,
];

const FORBIDDEN_PATH_HINTS = [".env", "credentials", "secret", "customer-life", "campaign-design-artifacts"];

export function redactSecrets(value) {
  if (value == null) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item));
  if (typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (
        /(?:^|_)(?:api[_-]?key|access_token|secret|password|bearer)$/i.test(key) ||
        /^(?:STRIPE_|RESEND_|OPENAI_|ANTHROPIC_|DEEPGRAM_|SHOTSTACK_|SESSION_SECRET)/i.test(
          key,
        )
      ) {
        out[key] = "[REDACTED]";
        continue;
      }
      out[key] = redactSecrets(nested);
    }
    return out;
  }
  let text = String(value);
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "[REDACTED]");
  }
  return text;
}

function readJson(file, fallback = {}) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function listChangedFiles() {
  try {
    const raw = execFileSync("git", ["status", "--short"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[A-Z?]{1,2}\s+/, "").replace(/^.* -> /, ""))
      .filter((file) => !FORBIDDEN_PATH_HINTS.some((hint) => file.includes(hint)))
      .slice(0, 40);
  } catch {
    return [];
  }
}

/** Launch truth mirrors src/config/studio-canonical-launch-truth-v1.ts. The legacy counts describe the old shelf only. */
function publicCounts() {
  return {
    canonicalLaunchMenu: "three_package_door",
    launchPackageCount: 3,
    publishedPubliclyCount: 0,
    launchAuthority: "docs/launch/studio-canonical-launch-truth-1/STUDIO-CANONICAL-LAUNCH-TRUTH.md",
    publicLaunchNowPublishedCount: 11,
    internalSellNowCount: 11,
    liveDiscoveryShelfJobs: 16,
    shelfHonesty: "PARKED — 11 certified public vs 16 live shelf jobs. Not this package.",
  };
}

export function buildOutboundSnapshot(now = new Date().toISOString(), extras = {}) {
  const heartbeat = readJson(HEARTBEAT_JSON);
  const attention = readJson(ATTENTION_JSON);
  const consumed = readJson(CONSUMED_PATH, { ids: [] });
  const snapshot = redactSecrets({
    schemaVersion: 1,
    kind: "chatgpt_scout_ops_snapshot",
    writtenAt: now,
    authority: {
      gitIsEngineeringAuthority: true,
      machineIsCustomerJobTruth: true,
      scoutIsFactoryEngineer: true,
      ownerIsFinalForProtectedActions: true,
      noMergeWithoutExplicitAuthorization: true,
      noPushWithoutExplicitAuthorization: true,
    },
    packageId: heartbeat.packageId ?? null,
    workState: heartbeat.workState ?? null,
    currentTask: heartbeat.currentTask ?? null,
    whatHappensNext: heartbeat.whatHappensNext ?? null,
    attentionState: heartbeat.attentionState ?? attention.state ?? null,
    tagiaMustAct: Boolean(heartbeat.tagiaMustAct),
    lastActivityAt: heartbeat.lastActivityAt ?? null,
    filesChanged: listChangedFiles(),
    testsResults: extras.testsResults ?? "See latest package stamp. Pulse does not invent test outcomes.",
    defectsBlockers: extras.defectsBlockers ?? heartbeat.blocker ?? null,
    evidenceStamps: extras.evidenceStamps ?? [
      "docs/launch/studio-operating-business-os-audit-1/STUDIO-OPERATING-BUSINESS-OS-AUDIT.md",
      "docs/launch/studio-operating-launch-shell-audit-1/STUDIO-OPERATING-LAUNCH-SHELL-AUDIT.md",
    ],
    counts: publicCounts(),
    protectedStateReminders: [
      "Do not reopen frozen service factories unless a genuine regression appears.",
      "Do not remint Maya.",
      "Do not rebuild Owner Console.",
      "Do not start website, beta, or marketing from this bridge.",
      "Shelf 16 vs public 11 is parked, not this package.",
      "No merge. No push. Unless a consumed inbound line explicitly authorizes that protected action.",
    ],
    nextDecisionRequired: extras.nextDecisionRequired ?? heartbeat.whatHappensNext ?? null,
    transport: {
      githubConnectorRejected: true,
      githubRejectionReason: "GitHub connector required broader repository write than Owner permits.",
      ownerDeskNotTheChatgptTransport: true,
      localHttpsBridge: "https://127.0.0.1:4178/v1/snapshot",
      localHttpsInbound: "https://127.0.0.1:4178/v1/inbound",
      localHttpsAcknowledgement: "https://127.0.0.1:4178/v1/acknowledgement",
      chatgptDotComCanReachLocalhost: false,
      publicHttpsHosted: true,
      publicHttpsBaseUrl: "https://cool-proposals-assessments-studying.trycloudflare.com",
      publicHttpsFront: "cloudflare_quick_tunnel",
      zeroCourierAchieved: false,
      missingConnection:
        "Public HTTPS ops-bridge is up. Zero-courier is not certified until ChatGPT independently reads the snapshot, writes one authorized inbound line, and reads the acknowledgement through Plugin Creator. GitHub write stays rejected.",
    },
    lastInboundAcknowledgement: extras.lastInboundAcknowledgement ?? null,
    consumedDecisionIds: consumed.ids ?? [],
  });
  return snapshot;
}

export function renderOutboundMarkdown(snapshot) {
  const files = (snapshot.filesChanged ?? []).map((file) => `- \`${file}\``).join("\n") || "- none listed";
  const reminders = (snapshot.protectedStateReminders ?? []).map((line) => `- ${line}`).join("\n");
  return `# ChatGPT ↔ Scout operations snapshot

Written: ${snapshot.writtenAt}

| Field | Value |
|---|---|
| Package | ${snapshot.packageId ?? "—"} |
| Work state | ${snapshot.workState ?? "—"} |
| Task | ${snapshot.currentTask ?? "—"} |
| Attention | ${snapshot.attentionState ?? "—"} |
| Tagia must act | ${snapshot.tagiaMustAct ? "Yes" : "No"} |
| Launch menu | ${snapshot.counts?.launchPackageCount ?? "—"} packages (three-package door) |
| Published publicly | ${snapshot.counts?.publishedPubliclyCount ?? "—"} |
| Zero-courier | ${snapshot.transport?.zeroCourierAchieved ? "Yes" : "No"} |

## Files changed
${files}

## Tests / results
${snapshot.testsResults ?? "—"}

## Defects / blockers
${snapshot.defectsBlockers ?? "None recorded."}

## Evidence / stamps
${(snapshot.evidenceStamps ?? []).map((item) => `- ${item}`).join("\n")}

## Protected-state reminders
${reminders}

## Next decision required
${snapshot.nextDecisionRequired ?? "—"}

## Transport
${snapshot.transport?.missingConnection ?? "—"}
`;
}

function dailyBridgeLiveBlock(snapshot) {
  const changed = new Date(snapshot.writtenAt).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `# WORK STATE: ${String(snapshot.workState ?? "UNKNOWN").replaceAll("_", " ")}
**Changed at:** ${changed} ET  
**Source:** Pulse / ops-bridge snapshot. Do not hand-edit this live block.

Owner attention: **${snapshot.attentionState ?? "—"}.** ${snapshot.currentTask ?? ""}

**Live desk:** \`http://127.0.0.1:4177/\`  
**Ops snapshot:** \`docs/launch/owner-bridge/outbound-snapshot.json\`

**Doing now:** ${snapshot.currentTask ?? "—"}

**Next:** ${snapshot.nextDecisionRequired ?? "—"}

---

| Field | Value |
|-------|--------|
| Updated | ${changed} ET |
| Package | \`${snapshot.packageId ?? "—"}\` |
| Work state | **${String(snapshot.workState ?? "UNKNOWN").replaceAll("_", " ") }** |
| Attention | **${snapshot.attentionState ?? "—"}** |
| Tagia must intervene now | **${snapshot.tagiaMustAct ? "Yes" : "No"}** |
| Launch menu / Published | **${snapshot.counts?.launchPackageCount ?? "—"} / ${snapshot.counts?.publishedPubliclyCount ?? "—"}** |
| Zero-courier ChatGPT ↔ Scout | **${snapshot.transport?.zeroCourierAchieved ? "Yes" : "No"}** |
| Model | Cursor Grok 4.6 |
`;
}

export function writeDailyBridgeLiveBlock(snapshot) {
  if (!existsSync(DAILY_BRIDGE)) return;
  const existing = readFileSync(DAILY_BRIDGE, "utf8");
  const begin = "<!-- OPS-BRIDGE-LIVE:BEGIN -->";
  const end = "<!-- OPS-BRIDGE-LIVE:END -->";
  const block = `${begin}\n${dailyBridgeLiveBlock(snapshot)}\n${end}`;
  if (existing.includes(begin) && existing.includes(end)) {
    const next = existing.replace(
      new RegExp(`${begin}[\\s\\S]*?${end}`),
      block.replace(/\$/g, "$$$$"),
    );
    writeFileSync(DAILY_BRIDGE, next, "utf8");
    return;
  }
  writeFileSync(
    DAILY_BRIDGE,
    `${block}\n\n${existing.replace(/^# PROJECT ALPHA — DAILY OPERATING BRIDGE\s*\n+/, "# PROJECT ALPHA — DAILY OPERATING BRIDGE\n\n")}`,
    "utf8",
  );
}

export function writeOutboundSnapshot(extras = {}, now = new Date().toISOString()) {
  mkdirSync(BRIDGE_DIR, { recursive: true });
  const snapshot = buildOutboundSnapshot(now, extras);
  writeFileSync(SNAPSHOT_JSON, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  writeFileSync(SNAPSHOT_MD, `${renderOutboundMarkdown(snapshot)}\n`, "utf8");
  writeDailyBridgeLiveBlock(snapshot);
  if (!existsSync(INBOUND_JSONL)) writeFileSync(INBOUND_JSONL, "", "utf8");
  if (!existsSync(ACK_JSONL)) writeFileSync(ACK_JSONL, "", "utf8");
  return snapshot;
}

function isIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function validateInboundDecision(decision, nowMs = Date.now(), expectedPackageId = null) {
  if (!decision || typeof decision !== "object") {
    return { ok: false, reason: "unsigned_or_unapproved", detail: "Decision is missing." };
  }
  if (decision.authorized !== true || decision.authorizer !== OPS_BRIDGE_AUTHORIZER) {
    return { ok: false, reason: "unsigned_or_unapproved", detail: "Owner authorization is required." };
  }
  if (typeof decision.decisionId !== "string" || !decision.decisionId.trim()) {
    return { ok: false, reason: "unsigned_or_unapproved", detail: "decisionId is required." };
  }
  if (!isIsoDate(decision.at)) {
    return { ok: false, reason: "unsigned_or_unapproved", detail: "timestamp is required." };
  }
  if (!OPS_BRIDGE_ACTIONS.includes(decision.action)) {
    return { ok: false, reason: "scope_expansion", detail: `Unknown action: ${decision.action}` };
  }
  if (typeof decision.packageId !== "string" || !decision.packageId.trim()) {
    return { ok: false, reason: "scope_expansion", detail: "packageId is required." };
  }
  if (typeof decision.permittedAction !== "string" || !decision.permittedAction.trim()) {
    return { ok: false, reason: "scope_expansion", detail: "permittedAction is required." };
  }
  if (
    expectedPackageId &&
    decision.packageId !== expectedPackageId &&
    decision.action !== "authorize_package"
  ) {
    return {
      ok: false,
      reason: "scope_expansion",
      detail: `Decision package ${decision.packageId} is outside ${expectedPackageId}.`,
    };
  }
  const writtenAt = Date.parse(decision.at);
  if (nowMs - writtenAt > OPS_BRIDGE_STALE_MS) {
    return { ok: false, reason: "stale_decision", detail: "Decision is older than 4 hours." };
  }
  if (decision.expiresAt && Date.parse(decision.expiresAt) < nowMs) {
    return { ok: false, reason: "stale_decision", detail: "Decision expired." };
  }
  const protectedAction = OPS_BRIDGE_PROTECTED_ACTIONS.includes(decision.action);
  if (decision.action === "merge_authorization" && decision.mergeAuthorized !== true) {
    return { ok: false, reason: "merge_push_not_authorized", detail: "Merge requires mergeAuthorized: true." };
  }
  if (decision.action === "push_authorization" && decision.pushAuthorized !== true) {
    return { ok: false, reason: "merge_push_not_authorized", detail: "Push requires pushAuthorized: true." };
  }
  if (protectedAction && decision.protectedAction !== true) {
    return {
      ok: false,
      reason: "merge_push_not_authorized",
      detail: "Protected actions require protectedAction: true.",
    };
  }
  return { ok: true, protectedAction };
}

export function payloadContainsSecrets(value) {
  const text = JSON.stringify(value ?? "");
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) return true;
  }
  return false;
}

export function performSnapshot() {
  if (!existsSync(SNAPSHOT_JSON)) {
    return { status: 404, payload: { ok: false, error: "snapshot_not_written" } };
  }
  const snapshot = redactSecrets(JSON.parse(readFileSync(SNAPSHOT_JSON, "utf8")));
  if (payloadContainsSecrets(snapshot)) {
    return { status: 500, payload: { ok: false, error: "payload_withheld" } };
  }
  return { status: 200, payload: snapshot };
}

export function performAcknowledgement(decisionId = null) {
  return {
    status: 200,
    payload: { ok: true, acknowledgement: readLastAcknowledgement(decisionId) },
  };
}

export function performInbound(decision, expectedPackageId = null) {
  const result = consumeInboundDecision(decision, { expectedPackageId });
  return {
    status: result.ok ? 200 : 400,
    payload: {
      ok: result.ok,
      reason: result.reason ?? null,
      detail: result.detail ?? null,
      acknowledgement: result.acknowledgement ?? null,
    },
  };
}

export function readLastAcknowledgement(decisionId = null) {
  if (!existsSync(ACK_JSONL)) return null;
  const parsed = [];
  for (const line of readFileSync(ACK_JSONL, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      parsed.push(redactSecrets(JSON.parse(line)));
    } catch {
      /* skip a broken audit line */
    }
  }
  if (!parsed.length) return null;
  if (!decisionId) return parsed[parsed.length - 1];
  return parsed.findLast((item) => item.decisionId === decisionId) ?? null;
}

function persistInboundDecision(decision) {
  mkdirSync(BRIDGE_DIR, { recursive: true });
  appendFileSync(INBOUND_JSONL, `${JSON.stringify(redactSecrets(decision))}\n`, "utf8");
}

export function consumeInboundDecision(decision, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const expectedPackageId = options.expectedPackageId ?? null;
  if (decision && typeof decision === "object") persistInboundDecision(decision);
  const validation = validateInboundDecision(decision, nowMs, expectedPackageId);
  const consumed = readJson(CONSUMED_PATH, { ids: [] });
  const ids = new Set(consumed.ids ?? []);
  if (validation.ok && ids.has(decision.decisionId)) {
    return { ok: false, reason: "stale_decision", detail: "Decision was already consumed." };
  }
  const acknowledgement = {
    at: new Date(nowMs).toISOString(),
    decisionId: decision?.decisionId ?? null,
    action: decision?.action ?? null,
    packageId: decision?.packageId ?? null,
    ok: validation.ok,
    reason: validation.ok ? "accepted" : validation.reason,
    detail: validation.ok ? decision.permittedAction : validation.detail,
    scoutActed: Boolean(validation.ok && options.act !== false),
  };
  mkdirSync(BRIDGE_DIR, { recursive: true });
  appendFileSync(ACK_JSONL, `${JSON.stringify(acknowledgement)}\n`, "utf8");
  if (validation.ok) {
    ids.add(decision.decisionId);
    writeFileSync(CONSUMED_PATH, `${JSON.stringify({ ids: [...ids] }, null, 2)}\n`, "utf8");
  }
  writeOutboundSnapshot({
    lastInboundAcknowledgement: acknowledgement,
    testsResults: options.testsResults,
    defectsBlockers: options.defectsBlockers,
    nextDecisionRequired: options.nextDecisionRequired,
  });
  return { ...validation, acknowledgement };
}

export const OPS_BRIDGE_PATHS = {
  ROOT,
  BRIDGE_DIR,
  SNAPSHOT_JSON,
  SNAPSHOT_MD,
  INBOUND_JSONL,
  ACK_JSONL,
  DAILY_BRIDGE,
};
