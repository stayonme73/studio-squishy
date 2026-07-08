import Link from "next/link";

import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import {
  campaignHasApprovedStudioPlan,
  resolveCampaignPlanIncludes,
  resolveCampaignPlanLabel,
  resolveCampaignRevisionRounds,
} from "@/lib/approved-plan-display";
import { helpCenterHref } from "@/config/help-center";

const { packageSummary: copy } = studioBoard;

type Props = {
  campaign: CampaignRecord | null;
};

/** Package label + included deliverables — reduces "what did I buy?" confusion. */
export default function PackageSummaryPanel({ campaign }: Props) {
  if (!campaign?.packageId) {
    return (
      <section className="sb-package-summary" aria-labelledby="sb-package-summary-title">
        <p id="sb-package-summary-title" className="sb-card__tab">
          {copy.heading}
        </p>
        <p className="sb-package-summary__empty">{copy.emptyHint}</p>
      </section>
    );
  }

  const includes = resolveCampaignPlanIncludes(campaign);
  const revisions = resolveCampaignRevisionRounds(campaign);
  const planLabel = resolveCampaignPlanLabel(campaign);
  const showCompareLink = !campaignHasApprovedStudioPlan(campaign);

  return (
    <section className="sb-package-summary" aria-labelledby="sb-package-summary-title">
      <p id="sb-package-summary-title" className="sb-card__tab">
        {copy.heading}
      </p>
      <p className="sb-package-summary__package">{planLabel}</p>
      <ul className="sb-package-summary__list">
        {includes.map((item) => (
          <li key={item} className="sb-package-summary__item">
            <span className="sb-package-summary__check" aria-hidden>
              ✓
            </span>
            {item}
          </li>
        ))}
        <li className="sb-package-summary__item">
          <span className="sb-package-summary__check" aria-hidden>
            ✓
          </span>
          {copy.revisionLine(revisions)}
        </li>
      </ul>
      {showCompareLink ? (
        <Link href={helpCenterHref("quick-guide", "studio-board")} className="sb-package-summary__link">
          {copy.compareLink} →
        </Link>
      ) : null}
    </section>
  );
}
