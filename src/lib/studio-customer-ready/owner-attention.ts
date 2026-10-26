import { studioOwnerAttentionV1 } from "@/config/studio-owner-attention-v1";

import type {
  StudioOwnerAttentionKind,
  StudioOwnerAttentionResponder,
  StudioOwnerAttentionState,
} from "@/config/studio-owner-attention-v1";

export type OwnerAttentionRecord = {
  state: StudioOwnerAttentionState;
  label: string;
  updatedAt: string;
  packageId: string;
  reason: string;
  responder: StudioOwnerAttentionResponder | null;
  customerImpact: string;
  launchImpact: string;
  blockedFrom: string;
  nextRecommendedAction: string;
  tagiaMustInterveneNow: boolean;
  kind?: StudioOwnerAttentionKind;
  alertId?: string;
  exactOwnerAction?: string;
  expectedResult?: string;
  doNotDo?: string;
  reportBack?: string;
  acknowledgedAt?: string | null;
  audiblePlayedAt?: string | null;
  deferredReason?: string | null;
};

export function classifyOwnerWait(input: {
  scoutCannotContinueWithoutOwner: boolean;
  ownerUnavailableAndSafeToDefer: boolean;
  ordinaryWatchOnly?: boolean;
}): StudioOwnerAttentionKind {
  if (input.scoutCannotContinueWithoutOwner) {
    return input.ownerUnavailableAndSafeToDefer
      ? "OWNER_ACTION_REQUIRED_DEFERRED"
      : "OWNER_ACTION_REQUIRED_NOW";
  }
  if (input.ordinaryWatchOnly) return "WATCH";
  return "CONTINUE";
}

export function resolveOwnerAttentionKind(
  record: OwnerAttentionRecord,
): StudioOwnerAttentionKind {
  if (record.kind) return record.kind;
  if (record.state === "RED" && record.tagiaMustInterveneNow) {
    return "OWNER_ACTION_REQUIRED_NOW";
  }
  if (record.state === "YELLOW") return "WATCH";
  if (record.state === "GREEN") return "CONTINUE";
  return "WATCH";
}

export function labelForAttentionKind(kind: StudioOwnerAttentionKind): string {
  if (kind === "CONTINUE") return studioOwnerAttentionV1.greenLabel;
  if (kind === "WATCH") return studioOwnerAttentionV1.yellowLabel;
  if (kind === "OWNER_ACTION_REQUIRED_DEFERRED") {
    return studioOwnerAttentionV1.deferredLabel;
  }
  return studioOwnerAttentionV1.redLabel;
}

export function labelForAttentionState(
  state: StudioOwnerAttentionState,
): string {
  if (state === "GREEN") return studioOwnerAttentionV1.greenLabel;
  if (state === "YELLOW") return studioOwnerAttentionV1.yellowLabel;
  return studioOwnerAttentionV1.redLabel;
}

export function shouldScreamOwnerAttention(
  state: StudioOwnerAttentionState,
): boolean {
  return state === "RED";
}

export function shouldPlayAudibleOwnerAlert(
  record: OwnerAttentionRecord,
): boolean {
  const kind = resolveOwnerAttentionKind(record);
  if (kind !== "OWNER_ACTION_REQUIRED_NOW") return false;
  if (record.acknowledgedAt) return false;
  if (record.audiblePlayedAt) return false;
  return true;
}

export function printOwnerAttentionBanner(record: OwnerAttentionRecord): string {
  const kind = resolveOwnerAttentionKind(record);
  if (kind === "OWNER_ACTION_REQUIRED_NOW") {
    const line = "█".repeat(72);
    return [
      "",
      line,
      "",
      `   🚨  ${studioOwnerAttentionV1.redNowBannerText}  🚨`,
      "",
      `   Responder: ${record.responder ?? "OWNER_TAGIA"}`,
      `   ${record.exactOwnerAction ?? record.nextRecommendedAction}`,
      "",
      `   Open: ${studioOwnerAttentionV1.redHtmlPath}`,
      "",
      line,
      "",
    ].join("\n");
  }

  if (kind === "OWNER_ACTION_REQUIRED_DEFERRED") {
    return `ATTENTION: OWNER ACTION REQUIRED — DEFERRED. ${record.deferredReason ?? record.reason} Continue only safe unattended work in this package.`;
  }

  if (record.state === "YELLOW" || kind === "WATCH") {
    return `ATTENTION: YELLOW — WATCH. ${record.reason} Tagia does not need to intervene yet.`;
  }

  return `ATTENTION: GREEN — CONTINUE. ${record.reason}`;
}

export function renderOwnerAttentionHtml(record: OwnerAttentionRecord): string {
  const kind = resolveOwnerAttentionKind(record);
  const isNow = kind === "OWNER_ACTION_REQUIRED_NOW";
  const isDeferred = kind === "OWNER_ACTION_REQUIRED_DEFERRED";
  const isYellow = record.state === "YELLOW" || kind === "WATCH";
  const yellowAcked = Boolean(record.acknowledgedAt);
  const bounceToHeartbeat = isYellow && yellowAcked;
  const background = isNow
    ? "#8b0000"
    : isDeferred
      ? "#4a3000"
      : bounceToHeartbeat
        ? "#11130f"
        : isYellow
          ? "#c9a227"
          : "#1f6b3a";
  const headline = isNow
    ? "OWNER ACTION REQUIRED NOW"
    : isDeferred
      ? "OWNER ACTION REQUIRED — DEFERRED"
      : bounceToHeartbeat
        ? "RETURNING TO LIVE HEARTBEAT"
        : isYellow
          ? "WATCH"
          : "CONTINUE";
  const emoji = isNow ? "🚨" : "●";
  const instruction = isNow
    ? escapeHtml(record.exactOwnerAction ?? record.nextRecommendedAction)
    : isDeferred
      ? escapeHtml(
          record.deferredReason ??
            "Tagia is unavailable. This owner action is recorded and deferred.",
        )
      : bounceToHeartbeat
        ? "YELLOW is only a watch badge. Opening the live work heartbeat."
        : isYellow
          ? "Authorized work can continue. Acknowledge this watch, then return to the live heartbeat."
          : "No Tagia or Studio Manager action required.";
  const alertId = escapeHtml(record.alertId ?? "unspecified");
  const heartbeatHref = "PROJECT-ALPHA-WORK-HEARTBEAT.html";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${bounceToHeartbeat ? `<meta http-equiv="refresh" content="0; url=${heartbeatHref}" />` : ""}
  <title>${headline} — Project Alpha</title>
  <style>
    :root { color-scheme: dark; }
    html, body {
      margin: 0;
      min-height: 100%;
      background: ${background};
      color: #fff8e7;
      font-family: Arial, Helvetica, sans-serif;
      font-kerning: none;
      font-variant-ligatures: none;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4vh 5vw;
      box-sizing: border-box;
    }
    main {
      width: min(1100px, 100%);
      text-align: center;
    }
    .emoji {
      display: block;
      font-size: ${isNow ? "12vw" : "4.5rem"};
      line-height: 1;
      margin: 0 0 2vh;
    }
    h1 {
      margin: 0 0 2vh;
      font-size: ${isNow ? "clamp(2.8rem, 8vw, 6.2rem)" : "clamp(2.4rem, 6vw, 4.6rem)"};
      letter-spacing: 0.02em;
      text-transform: uppercase;
      line-height: 1.05;
    }
    .state {
      font-size: clamp(1.1rem, 2.4vw, 1.6rem);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 2vh;
    }
    p, li, dd { font-size: clamp(1.05rem, 1.8vw, 1.35rem); line-height: 1.45; }
    .instruction {
      font-size: clamp(1.2rem, 2.2vw, 1.6rem);
      font-weight: 700;
      margin: 0 0 4vh;
    }
    dl {
      text-align: left;
      margin: 0 auto;
      max-width: 46rem;
    }
    dt {
      font-size: 0.85rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      opacity: 0.8;
      margin-top: 1.2rem;
    }
    dd { margin: 0.25rem 0 0; }
    .note {
      margin-top: 5vh;
      opacity: 0.8;
      font-size: 0.95rem;
    }
    .ack {
      margin: 3vh 0 0;
    }
    .ack button {
      font: inherit;
      font-size: 1.15rem;
      font-weight: 700;
      padding: 0.85rem 1.4rem;
      border: 0;
      border-radius: 0.4rem;
      background: #fff8e7;
      color: #8b0000;
      cursor: pointer;
    }
    .ack[data-acked="true"] button { display: none; }
    .ack-done { display: none; font-weight: 700; }
    .ack[data-acked="true"] .ack-done { display: block; }
    .return-live {
      display: inline-block;
      margin-top: 2.4vh;
      font-weight: 700;
      color: #fff8e7;
    }
  </style>
</head>
<body>
  <main data-attention-state="${record.state}" data-owner-wait="${kind}" data-alert-id="${alertId}" data-return-to-heartbeat="${heartbeatHref}">
    <span class="emoji" aria-hidden="true">${emoji}</span>
    <p class="state">${record.state} — ${escapeHtml(record.label)}</p>
    <h1>${headline}</h1>
    <p class="instruction">${instruction}</p>
    <dl>
      <dt>Responder</dt>
      <dd>${escapeHtml(record.responder ?? "none — watch only")}</dd>
      <dt>What to do</dt>
      <dd>${escapeHtml(record.exactOwnerAction ?? record.nextRecommendedAction)}</dd>
      <dt>What you should see</dt>
      <dd>${escapeHtml(record.expectedResult ?? record.reason)}</dd>
      <dt>What not to do</dt>
      <dd>${escapeHtml(record.doNotDo ?? "Do not start the next package.")}</dd>
      <dt>What Scout needs back</dt>
      <dd>${escapeHtml(record.reportBack ?? "Confirm the action is done.")}</dd>
      <dt>Scout is blocked from</dt>
      <dd>${escapeHtml(record.blockedFrom)}</dd>
    </dl>
    ${
      isNow
        ? `<div class="ack" id="owner-ack-box">
      <button type="button" id="owner-ack">Acknowledge — I have this</button>
      <p class="ack-done">Acknowledged. Returning to the live heartbeat.</p>
    </div>`
        : isYellow && !yellowAcked
          ? `<div class="ack" id="owner-ack-box">
      <button type="button" id="owner-ack">Acknowledge watch — return to heartbeat</button>
      <p class="ack-done">Acknowledged. Returning to the live heartbeat.</p>
    </div>`
          : ""
    }
    ${
      /five-screen|visual accept|visual-acceptance|champagne|close-up|closeups|thin-champagne|materials box|section.rule|board mobile|board laptop/i.test(
        `${record.exactOwnerAction ?? ""} ${record.nextRecommendedAction ?? ""} ${record.expectedResult ?? ""}`,
      )
        ? `<p><a class="return-live" href="PROJECT-ALPHA-OWNER-VISUAL-ACCEPTANCE.html">See the screens — Accept or Refuse</a></p>`
        : ""
    }
    <p><a class="return-live" href="${heartbeatHref}">Open live work heartbeat</a></p>
    <p class="note">
      Attention is GREEN / YELLOW / RED. Work state lives on the heartbeat.
      YELLOW does not replace the live dashboard after acknowledgement.
      Current recorded state is also in <code>docs/launch/project-alpha-attention-state.json</code>.
    </p>
  </main>
  ${
    isNow || (isYellow && !yellowAcked)
      ? `<script>
(function () {
  var main = document.querySelector("main");
  var box = document.getElementById("owner-ack-box");
  var button = document.getElementById("owner-ack");
  if (!main || !box || !button) return;
  var heartbeat = main.getAttribute("data-return-to-heartbeat") || "${heartbeatHref}";
  var key = "project-alpha-attention-ack:" + (main.getAttribute("data-alert-id") || "");
  function goLive() {
    window.location.replace(heartbeat);
  }
  function mark() {
    box.setAttribute("data-acked", "true");
    setTimeout(goLive, 400);
  }
  if (window.localStorage.getItem(key)) mark();
  button.addEventListener("click", function () {
    window.localStorage.setItem(key, new Date().toISOString());
    mark();
  });
})();
</script>`
      : bounceToHeartbeat
        ? `<script>window.location.replace("${heartbeatHref}");</script>`
        : ""
  }
</body>
</html>
`;
}

export function currentYellowWatchRecord(
  updatedAt = "2026-09-16",
): OwnerAttentionRecord {
  return {
    state: "YELLOW",
    kind: "WATCH",
    label: labelForAttentionKind("WATCH"),
    updatedAt,
    packageId: studioOwnerAttentionV1.packageId,
    reason:
      "Static Creative Lane independent review is still pending. The three-menu-surface decision is CLOSED.",
    responder: null,
    customerImpact:
      "No new customer-facing change in this package. Existing live-integration grades stand.",
    launchImpact:
      "Scout cannot make the next launch-readiness claim or start the next package until that independent review is complete.",
    blockedFrom:
      "Next launch-readiness claim; Step 2 (work supervision); any new Room 4 package.",
    nextRecommendedAction:
      "Complete the Static Creative Lane independent review. Do not ask Tagia to intervene yet.",
    tagiaMustInterveneNow: false,
    acknowledgedAt: null,
    audiblePlayedAt: null,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
