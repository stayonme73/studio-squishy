import Link from "next/link";

import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import {
  resolveCampaignPlanIncludes,
  resolveCampaignPlanLabel,
  resolveCampaignRevisionRounds,
} from "@/lib/approved-plan-display";
import { resolveProjectSnapshotDeliverables } from "@/lib/studio-board-project-snapshot";
import type { AccountPackageView, StudioBoardView } from "@/lib/studio-board-view";

type Props = {
  campaign: CampaignRecord | null;
  view: StudioBoardView;
  account: AccountPackageView;
};

function resolvePlanSnapshot(campaign: CampaignRecord) {
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
  const emptySnapshot = view.emptyBoardSnapshot;

  if (!view.hasCampaign) {
    return (
      <section className="sb-project-snapshot" aria-labelledby="sb-project-snapshot-title">
        <p id="sb-project-snapshot-title" className="sb-card__tab">
          PROJECT SNAPSHOT
        </p>

        <div className="sb-project-snapshot__stack">
          <section
            className="sb-project-snapshot__section"
            aria-labelledby="sb-project-snapshot-deliverables"
          >
            <h2 id="sb-project-snapshot-deliverables" className="sb-project-snapshot__heading">
              Deliverables
            </h2>
            <p className="sb-project-snapshot__empty">{emptySnapshot?.deliverables}</p>
          </section>

          <section className="sb-project-snapshot__section" aria-labelledby="sb-project-snapshot-plan">
            <h2 id="sb-project-snapshot-plan" className="sb-project-snapshot__heading">
              Your Studio Plan
            </h2>
            <p className="sb-project-snapshot__empty">{emptySnapshot?.plan}</p>
          </section>

          <section className="sb-project-snapshot__section" aria-labelledby="sb-project-snapshot-account">
            <h2 id="sb-project-snapshot-account" className="sb-project-snapshot__heading">
              Account
            </h2>
            <p className="sb-project-snapshot__empty">{emptySnapshot?.account}</p>
          </section>
        </div>
      </section>
    );
  }

  const deliverables = resolveProjectSnapshotDeliverables(campaign!, view.deliverablesProgress);
  const plan = resolvePlanSnapshot(campaign!);
  const accountSnapshot = resolveAccountSnapshot(account);

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
          {deliverables.kind === "unavailable" ? (
            <p className="sb-project-snapshot__empty">{deliverables.message}</p>
          ) : (
            <>
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
                <div
                  className="sb-project-snapshot__progress-fill"
                  style={{
                    width: `${Math.round(
                      Math.min(1, Math.max(0, deliverables.delivered / deliverables.total)) * 100,
                    )}%`,
                  }}
                />
              </div>
              {deliverables.showViewDeliverables ? (
                <Link href={routes.deliverables} className="sb-project-snapshot__link">
                  View deliverables →
                </Link>
              ) : null}
            </>
          )}
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
