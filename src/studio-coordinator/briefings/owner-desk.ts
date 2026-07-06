import { evaluateEscalation } from "@/decision-core";
import { ownerConsole, ownerConsoleOutcomeByKind } from "@/config/owner-console";
import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";
import type { OwnerConsoleDecisionCard } from "@/lib/campaign-tasks/owner-console-view";
import type {
  OwnerConsoleSequentialDeskView,
  OwnerConsoleSequentialItem,
  OwnerConsoleTrayId,
} from "@/lib/campaign-tasks/owner-console-sequential";
import type { OwnerDeskItem } from "@/lib/job-control/owner-desk";
import { greetingPeriodFromDate, type GreetingPeriod } from "@/lib/studio-board-view";

export type OwnerDeskGreetingParts = {
  period: GreetingPeriod;
  ownerDisplayName: string;
  /** Squishy briefing — useful desk context after the salutation. */
  briefing: string;
};

export type OwnerDeskBreakdownLine = {
  count: number;
  label: string;
};

export type OwnerDeskSummary = {
  folderCount: number;
  breakdownLines: readonly OwnerDeskBreakdownLine[];
  estimatedMinutes: number;
  estimatedReviewLabel: string;
};

export type OwnerDeskBriefingFacts = {
  campaignName?: string;
  exceptionKind?: CampaignExceptionKind;
  deskReason?: OwnerDeskItem["reason"];
  trayLabel?: string;
  waitingDurationLabel?: string;
  humanReviewRequired?: boolean;
};

export type OwnerDeskBriefing = {
  greetingLine: string;
  squishySays: string;
  folderContext: string;
  whyReached: string;
  coordinatorTrace: string;
  facts: OwnerDeskBriefingFacts;
};

export type OwnerPostDecisionDestination =
  | "production"
  | "client"
  | "waiting_on_client"
  | "waiting_internal"
  | "recently_handled"
  | "closed";

export type OwnerPostDecisionBriefing = {
  message: string;
  destination: OwnerPostDecisionDestination;
};

type OwnerConsoleTaskAction =
  | "resolve_exception"
  | "approve_client_request"
  | "assign_exception"
  | "decline_promotion"
  | "owner_clear_compliance_hold"
  | "owner_hold_compliance_hold"
  | "owner_ask_team_compliance_hold"
  | "owner_assign_compliance_hold";

export type OwnerComplianceHoldAction =
  | "owner_clear_compliance_hold"
  | "owner_hold_compliance_hold"
  | "owner_ask_team_compliance_hold"
  | "owner_assign_compliance_hold";

export type OwnerDeskJobAction =
  | "owner_approve_for_review"
  | "owner_send_back_for_review"
  | "owner_hold_review_gate"
  | "owner_ask_team_review_gate"
  | "owner_ask_client_review_gate"
  | "owner_final_release"
  | "owner_send_back_for_release"
  | "owner_hold_release_gate"
  | "owner_ask_team_release_gate";

/** Presentation-only — helps the desk feel manageable, not authoritative scheduling. */
const ESTIMATED_MINUTES_PER_TRAY: Record<
  "needs_my_decision" | "needs_my_approval" | "ready_to_release",
  number
> = {
  needs_my_decision: 3,
  needs_my_approval: 1,
  ready_to_release: 2,
};

function trayCount(
  trays: OwnerConsoleSequentialDeskView["trays"],
  id: OwnerConsoleTrayId,
): number {
  return trays.find((tray) => tray.id === id)?.count ?? 0;
}

function formatEstimatedReviewLabel(minutes: number): string {
  if (minutes <= 1) return "Estimated review time: about 1 minute";
  return `Estimated review time: about ${minutes} minutes`;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

export function resolveOwnerDeskSummary(
  desk: Pick<OwnerConsoleSequentialDeskView, "trays" | "todaysDecisionCount" | "isEmpty">,
): OwnerDeskSummary {
  const decisions = trayCount(desk.trays, "needs_my_decision");
  const approvals = trayCount(desk.trays, "needs_my_approval");
  const releases = trayCount(desk.trays, "ready_to_release");

  const breakdownLines: OwnerDeskBreakdownLine[] = [];
  if (approvals > 0) {
    breakdownLines.push({
      count: approvals,
      label: plural(approvals, "quick approval", "quick approvals"),
    });
  }
  if (decisions > 0) {
    breakdownLines.push({
      count: decisions,
      label: plural(decisions, "decision", "decisions"),
    });
  }
  if (releases > 0) {
    breakdownLines.push({
      count: releases,
      label: plural(releases, "release", "releases"),
    });
  }

  const estimatedMinutes = desk.isEmpty
    ? 0
    : Math.max(
        1,
        decisions * ESTIMATED_MINUTES_PER_TRAY.needs_my_decision +
          approvals * ESTIMATED_MINUTES_PER_TRAY.needs_my_approval +
          releases * ESTIMATED_MINUTES_PER_TRAY.ready_to_release,
      );

  return {
    folderCount: desk.todaysDecisionCount,
    breakdownLines,
    estimatedMinutes,
    estimatedReviewLabel: formatEstimatedReviewLabel(estimatedMinutes),
  };
}

function resolveSquishySaysForItem(item: OwnerConsoleSequentialItem): string {
  if (item.deskItem) {
    switch (item.deskItem.reason) {
      case "approval_before_review":
        return "Production has finished this campaign. Your approval is required before the client can see it.";
      case "approval_before_delivery":
        return "The client approved this package. Your final release is required before they can receive it in Final Delivery.";
      case "revision_limit_reached":
        return "The client reached the revision limit. Your decision unlocks the next step.";
      case "scope_issue":
        return "The team needs your scope decision before production can continue.";
      case "deadline_exception":
      case "at_risk_job":
        return "A deadline needs your judgment before the team commits further.";
      default:
        return `${item.deskItem.reasonLabel}. ${item.deskItem.detail}`;
    }
  }

  const kind = item.exceptionCard?.row.kind;
  switch (kind) {
    case "revision_exhausted":
      return "The client used the last included revision. Your decision unlocks the next step.";
    case "scope_change":
      return "A scope change needs your decision before production can continue.";
    case "client_request":
    case "missing_client_fact":
      return "A client materials request needs your approval before anything goes to the client.";
    case "deadline_commitment":
    case "deadline_risk":
      return "A deadline commitment needs your sign-off before the team moves forward.";
    case "compliance_hold":
      return "Compliance needs your review before QA can pass this work.";
    case "direction_disagreement":
      return "Production is paused until you confirm the creative direction.";
    case "routine_internal":
      return "An internal blocker needs your decision before the assignee can continue.";
    default:
      if (item.exceptionCard?.whyOwner) {
        const firstSentence = item.exceptionCard.whyOwner.split(/(?<=[.!?])\s+/)[0]?.trim();
        if (firstSentence) return firstSentence;
      }
      return "This folder is first because it blocks the next client-visible step.";
  }
}

function resolveDeskBriefing(input: {
  desk: Pick<OwnerConsoleSequentialDeskView, "trays" | "isEmpty" | "todaysDecisionCount">;
  currentItem: OwnerConsoleSequentialItem | null;
}): string {
  if (input.desk.isEmpty || !input.currentItem) {
    return "Everything is running smoothly. Your desk is clear.";
  }

  const approvals = trayCount(input.desk.trays, "needs_my_approval");
  const decisions = trayCount(input.desk.trays, "needs_my_decision");
  const releases = trayCount(input.desk.trays, "ready_to_release");
  const total = input.desk.todaysDecisionCount;

  const item = input.currentItem;
  const isReleaseFirst =
    item.trayId === "ready_to_release" || item.deskItem?.reason === "approval_before_delivery";

  if (isReleaseFirst) {
    if (releases > 1) {
      return `${releases} releases are ready. This one is the oldest.`;
    }
    return "The first item needs your sign-off before final delivery can go to the client.";
  }

  const isApprovalFirst =
    item.trayId === "needs_my_approval" || item.deskItem?.reason === "approval_before_review";

  if (isApprovalFirst) {
    if (approvals > 1) {
      return `${approvals} clients are waiting on Owner approval. This one is the oldest.`;
    }
    return "The first item needs your approval before the client can review it.";
  }

  if (releases > 0 && item.trayId === "ready_to_release" && decisions === 0 && approvals === 0) {
    return total === 1
      ? "One release is ready for your sign-off."
      : `${releases} releases are ready. I put the most urgent one on your desk first.`;
  }

  if (decisions > 0 && item.trayId === "needs_my_decision") {
    if (decisions > 1) {
      return `${decisions} decisions need you. I sorted them by urgency — this folder is first.`;
    }
    return "One decision needs you before production can continue.";
  }

  if (total === 1) {
    return "One folder is ready on your desk.";
  }

  return `I organized today's ${total} folders by urgency. This one is first.`;
}

function exceptionRecordFromCard(card: OwnerConsoleDecisionCard) {
  return {
    id: card.id,
    campaignId: card.campaignId,
    kind: card.row.kind,
    status: card.row.status,
    title: card.row.title,
    createdAt: card.updatedAt,
    updatedAt: card.updatedAt,
    raisedByUserId: "system",
    raisedByDisplayName: card.row.raisedByDisplayName,
    raisedByRole: "producer_dispatcher" as const,
  };
}

export function resolveCoordinatorTraceForCard(card: OwnerConsoleDecisionCard): string {
  const outcome = evaluateEscalation({
    domain: "escalation",
    campaignId: card.campaignId,
    actor: "system",
    trigger: { type: "exception_evaluated" },
    occurredAt: card.updatedAt,
    facts: { exception: exceptionRecordFromCard(card) },
  });

  if (!outcome.matchedRules.length) {
    return "Studio policy requires Owner review before work continues.";
  }

  return outcome.matchedRules
    .map((rule) =>
      rule.ruleId
        .replace(/^campaign-exceptions:kind:/, "Policy: ")
        .replace(/^campaign-tasks\/exceptions-view:/, "Routing: "),
    )
    .join(" ");
}

function resolveWhyReachedForItem(item: OwnerConsoleSequentialItem): string {
  if (item.exceptionCard) {
    return item.exceptionCard.whyOwner;
  }
  if (item.deskItem) {
    return `${item.deskItem.reasonLabel}. ${item.deskItem.detail}`;
  }
  return ownerConsole.selectedCardHint;
}

function resolveFolderContextForItem(item: OwnerConsoleSequentialItem): string {
  return resolveSquishySaysForItem(item);
}

export function resolveOwnerDeskGreetingParts(input: {
  ownerDisplayName: string;
  desk: Pick<OwnerConsoleSequentialDeskView, "trays" | "isEmpty" | "todaysDecisionCount">;
  currentItem: OwnerConsoleSequentialItem | null;
  now?: Date;
}): OwnerDeskGreetingParts {
  const period = greetingPeriodFromDate(input.now ?? new Date());
  const name = input.ownerDisplayName.trim() || "Tagia";

  return {
    period,
    ownerDisplayName: name,
    briefing: resolveDeskBriefing({
      desk: input.desk,
      currentItem: input.currentItem,
    }),
  };
}

export function resolveOwnerDeskGreeting(input: {
  ownerDisplayName: string;
  desk: Pick<OwnerConsoleSequentialDeskView, "trays" | "isEmpty" | "todaysDecisionCount">;
  currentItem: OwnerConsoleSequentialItem | null;
  now?: Date;
}): string {
  const parts = resolveOwnerDeskGreetingParts(input);
  return `Good ${parts.period}, ${parts.ownerDisplayName}. ${parts.briefing}`;
}

export function resolveOwnerDeskBriefing(input: {
  currentItem: OwnerConsoleSequentialItem | null;
  now?: Date;
}): OwnerDeskBriefing | null {
  const item = input.currentItem;
  if (!item) return null;

  const now = input.now ?? new Date();
  const squishySays = resolveSquishySaysForItem(item);
  const whyReached = resolveWhyReachedForItem(item);
  const folderContext = resolveFolderContextForItem(item);
  const coordinatorTrace = item.exceptionCard
    ? resolveCoordinatorTraceForCard(item.exceptionCard)
    : "Production gate requires Owner sign-off before the next client-visible step.";

  const anchorMs = new Date(item.updatedAt).getTime();
  const duration =
    Number.isNaN(anchorMs) || now.getTime() < anchorMs
      ? null
      : formatWaitingDuration(item.updatedAt, now);

  return {
    greetingLine: "",
    squishySays,
    folderContext,
    whyReached,
    coordinatorTrace,
    facts: {
      campaignName: item.campaignName,
      exceptionKind: item.exceptionCard?.row.kind,
      deskReason: item.deskItem?.reason,
      trayLabel: item.tabLabel,
      waitingDurationLabel: duration ?? undefined,
      humanReviewRequired: item.exceptionCard?.row.ownerReviewRequired ?? true,
    },
  };
}

function formatWaitingDuration(updatedAt: string, now: Date): string | null {
  const anchorMs = new Date(updatedAt).getTime();
  const nowMs = now.getTime();
  if (Number.isNaN(anchorMs) || nowMs < anchorMs) return null;

  const hours = Math.floor((nowMs - anchorMs) / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);

  if (days >= 1) return days === 1 ? "1 day" : `${days} days`;
  if (hours >= 1) return hours === 1 ? "1 hour" : `${hours} hours`;
  return null;
}

export function resolveOwnerDeskBriefingByItemId(
  items: readonly OwnerConsoleSequentialItem[],
  itemId: string,
  now?: Date,
): OwnerDeskBriefing | null {
  const item = items.find((entry) => entry.id === itemId) ?? null;
  return resolveOwnerDeskBriefing({ currentItem: item, now });
}

function destinationForResolve(kind: CampaignExceptionKind): OwnerPostDecisionDestination {
  switch (kind) {
    case "client_request":
    case "missing_client_fact":
      return "waiting_on_client";
    case "routine_internal":
      return "waiting_internal";
    default:
      return "production";
  }
}

function ownerConfirmationSuffix(): string {
  return "Confirmed: destination assigned, notifications queued, record updated, desk clear.";
}

export function resolveOwnerComplianceHoldPostDecisionBriefing(
  action: OwnerComplianceHoldAction,
): OwnerPostDecisionBriefing {
  switch (action) {
    case "owner_clear_compliance_hold":
      return {
        destination: "production",
        message: `Hold cleared. This folder left your desk — production and QA will continue from here. ${ownerConfirmationSuffix()}`,
      };
    case "owner_hold_compliance_hold":
      return {
        destination: "waiting_internal",
        message: `Held for internal QA review. This folder left your desk — the team will follow up internally. ${ownerConfirmationSuffix()}`,
      };
    case "owner_ask_team_compliance_hold":
      return {
        destination: "waiting_internal",
        message: `Routed to QA or production for investigation. This folder left your desk. ${ownerConfirmationSuffix()}`,
      };
    case "owner_assign_compliance_hold":
      return {
        destination: "waiting_internal",
        message: `Routed to the assignee. This folder left your desk — it will not return here unless re-raised. ${ownerConfirmationSuffix()}`,
      };
    default:
      return {
        destination: "recently_handled",
        message: `Folder archived. Your decision is recorded and this desk stays clear. ${ownerConfirmationSuffix()}`,
      };
  }
}

export function resolveOwnerDeskJobPostDecisionBriefing(
  action: OwnerDeskJobAction,
): OwnerPostDecisionBriefing {
  switch (action) {
    case "owner_approve_for_review":
      return {
        destination: "client",
        message:
          "Routed to the client Review Room. This folder left your desk — Squishy will notify the client that review is ready.",
      };
    case "owner_send_back_for_review":
      return {
        destination: "production",
        message:
          "Routed back to production for revision. This folder left your desk — the client will not see this work until you approve again.",
      };
    case "owner_hold_review_gate":
      return {
        destination: "waiting_internal",
        message:
          "Held for internal clarification. This folder left your desk — QA and production will follow up internally.",
      };
    case "owner_ask_team_review_gate":
      return {
        destination: "waiting_internal",
        message:
          "Routed to the assignee. This folder left your desk — the team will act from their office.",
      };
    case "owner_ask_client_review_gate":
      return {
        destination: "waiting_on_client",
        message:
          "Routed to the client queue. This folder left your desk — Squishy will track the response.",
      };
    case "owner_final_release":
      return {
        destination: "client",
        message:
          "Routed to Final Delivery. This folder left your desk — Squishy will notify the client that delivery is ready.",
      };
    case "owner_send_back_for_release":
      return {
        destination: "production",
        message:
          "Routed back to production for final package revision. This folder left your desk — the client will not see delivery until you release again.",
      };
    case "owner_hold_release_gate":
      return {
        destination: "waiting_internal",
        message:
          "Held for internal final QA clarification. This folder left your desk — production and QA will follow up internally.",
      };
    case "owner_ask_team_release_gate":
      return {
        destination: "waiting_internal",
        message:
          "Routed to the assignee for final QA. This folder left your desk — the team will act from their office.",
      };
    default:
      return {
        destination: "closed",
        message: "Folder archived. Your decision is recorded and this desk stays clear.",
      };
  }
}

export function resolveOwnerPostDecisionBriefing(
  action: OwnerConsoleTaskAction,
  card: OwnerConsoleDecisionCard | null,
): OwnerPostDecisionBriefing {
  const kind = card?.row.kind;

  switch (action) {
    case "approve_client_request":
      return {
        destination: "waiting_on_client",
        message:
          "Routed to the client queue. This folder left your desk — Squishy will track the response.",
      };
    case "assign_exception":
      return {
        destination: "waiting_internal",
        message:
          "Routed to the assignee's Team Office. This folder left your desk — it will not return here.",
      };
    case "decline_promotion":
      return {
        destination: "waiting_internal",
        message:
          "Kept internal. This folder left your desk — the team handles follow-up from their office.",
      };
    case "resolve_exception":
    default: {
      const destination = kind ? destinationForResolve(kind) : "recently_handled";
      const outcomeHint = kind ? ownerConsoleOutcomeByKind[kind] : null;
      if (destination === "waiting_on_client") {
        return {
          destination,
          message:
            "Routed to the client journey. This folder left your desk — it will not land back here.",
        };
      }
      if (destination === "production") {
        return {
          destination,
          message: outcomeHint
            ? `Routed to production. This folder left your desk — ${outcomeHint}`
            : "Routed to production. This folder left your desk — the team continues from here.",
        };
      }
      return {
        destination: "recently_handled",
        message: outcomeHint
          ? `Folder archived. ${outcomeHint}`
          : "Folder archived. Your decision is recorded and this desk stays clear.",
      };
    }
  }
}
