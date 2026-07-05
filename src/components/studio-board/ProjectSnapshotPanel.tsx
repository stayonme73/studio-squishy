import Link from "next/link";

import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import {
  resolveCampaignPlanIncludes,
  resolveCampaignPlanLabel,
  resolveCampaignRevisionRounds,
} from "@/lib/approved-plan-display";
import type { AccountPackageView, StudioBoardView } from "@/lib/studio-board-view";

const SOCIAL_POSTS_JOB_ID = "v2-rtu-social-posts";
const SOCIAL_POSTS_LABEL = "Social Posts";
const SOCIAL_POSTS_TOTAL = 4;

type Props = {
  campaign: CampaignRecord | null;
  view: StudioBoardView;
  account: AccountPackageView;
};

function resolveSocialPostsDelivered(campaign: CampaignRecord | null) {
  const delivered = campaign?.deliverablesDelivered as Record<string, number> | undefined;
  return Math.min(SOCIAL_POSTS_TOTAL, Math.max(0, delivered?.[SOCIAL_POSTS_JOB_ID] ?? 0));
}

function resolveDeliverablesSnapshot(campaign: CampaignRecord | null, view: StudioBoardView) {
  const hasSocialPostsJob =
    campaign?.routeMapContext?.jobId === SOCIAL_POSTS_JOB_ID ||
    campaign?.approvedStudioPlan?.lineItems.some(
      (line) => (line.skuId ?? line.serviceId) === SOCIAL_POSTS_JOB_ID,
    );

  if (hasSocialPostsJob || !campaign) {
    return {
      label: SOCIAL_POSTS_LABEL,
      delivered: resolveSocialPostsDelivered(campaign),
      total: SOCIAL_POSTS_TOTAL,
    };
  }

  const firstProgressItem = view.deliverablesProgress[0];
  if (firstProgressItem) {
    return {
      label: firstProgressItem.label,
      delivered: firstProgressItem.delivered,
      total: firstProgressItem.total,
    };
  }

  return {
    label: SOCIAL_POSTS_LABEL,
    delivered: 0,
    total: SOCIAL_POSTS_TOTAL,
  };
}

function resolvePlanSnapshot(campaign: CampaignRecord | null) {
  if (!campaign) {
    return {
      planLabel: "Custom Studio Plan",
      serviceName: "Make My Social Media Posts",
      revisionLine: "1 revision round included",
    };
  }

  const revisions = resolveCampaignRevisionRounds(campaign);

  return {
    planLabel: resolveCampaignPlanLabel(campaign),
    serviceName: resolveCampaignPlanIncludes(campaign)[0] ?? "Make My Social Media Posts",
    revisionLine: `${revisions} revision round${revisions === 1 ? "" : "s"} included`,
  };
}

function resolveAccountSnapshot(account: AccountPackageView) {
  if (!account.isActive) {
    return {
      summary: `${account.paymentStatus} · ${account.packagePrice}`,
      detail: "Payment details pending",
    };
  }

  return {
    summary: `${account.paymentStatus} · ${account.packagePrice}`,
    detail: account.paymentDate ? `Paid ${account.paymentDate}` : "Payment details pending",
  };
}

export default function ProjectSnapshotPanel({ campaign, view, account }: Props) {
  const { routes } = studioBoard;
  const deliverables = resolveDeliverablesSnapshot(campaign, view);
  const plan = resolvePlanSnapshot(campaign);
  const accountSnapshot = resolveAccountSnapshot(account);
  const progressPercent =
    deliverables.total > 0
      ? Math.round(Math.min(1, Math.max(0, deliverables.delivered / deliverables.total)) * 100)
      : 0;

  return (
    <section className="sb-project-snapshot" aria-labelledby="sb-project-snapshot-title">
      <p id="sb-project-snapshot-title" className="sb-card__tab">
        PROJECT SNAPSHOT
      </p>

      <div className="sb-project-snapshot__stack">
        <section className="sb-project-snapshot__section" aria-labelledby="sb-project-snapshot-deliverables">
          <h2 id="sb-project-snapshot-deliverables" className="sb-project-snapshot__heading">
            Deliverables
          </h2>
          <p className="sb-project-snapshot__primary">{deliverables.label}</p>
          <p className="sb-project-snapshot__meta">
            {deliverables.delivered} of {deliverables.total} complete
          </p>
          <div
            className="sb-project-snapshot__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={deliverables.total}
            aria-valuenow={deliverables.delivered}
            aria-label={`${deliverables.label} progress`}
          >
            <div className="sb-project-snapshot__progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <Link href={routes.deliverables} className="sb-project-snapshot__link">
            View deliverables →
          </Link>
        </section>

        <section className="sb-project-snapshot__section" aria-labelledby="sb-project-snapshot-plan">
          <h2 id="sb-project-snapshot-plan" className="sb-project-snapshot__heading">
            Your Studio Plan
          </h2>
          <p className="sb-project-snapshot__primary">{plan.planLabel}</p>
          <ul className="sb-project-snapshot__checks">
            <li>
              <span aria-hidden>✓</span>
              {plan.serviceName}
            </li>
            <li>
              <span aria-hidden>✓</span>
              {plan.revisionLine}
            </li>
          </ul>
        </section>

        <section className="sb-project-snapshot__section" aria-labelledby="sb-project-snapshot-account">
          <h2 id="sb-project-snapshot-account" className="sb-project-snapshot__heading">
            Account
          </h2>
          <p className="sb-project-snapshot__primary">{accountSnapshot.summary}</p>
          <p className="sb-project-snapshot__meta">{accountSnapshot.detail}</p>
        </section>
      </div>
    </section>
  );
}
