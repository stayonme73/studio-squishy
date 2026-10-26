import CopyCampaignBriefButton from "@/components/campaign-details/CopyCampaignBriefButton";
import HelpCenterLink from "@/components/shared/HelpCenterLink";
import { helpCenter } from "@/config/help-center";
import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { resolveCampaignDetailsView } from "@/lib/campaign-details-view";

const { campaignDetails: copy } = studioBoard;

type Props = {
  campaign: CampaignRecord;
};

/** Submitted project facts that used to live on the Project Record room. */
export default function BoardProjectRecordFacts({ campaign }: Props) {
  const view = resolveCampaignDetailsView(campaign);
  const revisionPolicy = helpCenter.campaignLinks.revisionTracker.find(
    (link) => link.label === "Revision policy",
  );

  return (
    <div className="sb-record-facts">
      <dl className="sb-record-facts__facts">
        <div>
          <dt>{copy.overviewLabels.createdDate}</dt>
          <dd>{view.createdDate}</dd>
        </div>
        <div>
          <dt>{copy.overviewLabels.estimatedCompletion}</dt>
          <dd>{view.estimatedCompletion}</dd>
        </div>
      </dl>

      <section aria-labelledby="sb-record-vision">
        <div className="sb-record-facts__head">
          <h3 id="sb-record-vision">{copy.sections.visionSummary}</h3>
          <CopyCampaignBriefButton campaign={campaign} />
        </div>
        {view.visionSummary.length > 0 ? (
          view.visionSummary.map((section) => (
            <div key={section.step} className="sb-record-facts__block">
              <p className="sb-record-facts__kicker">{section.eyebrow}</p>
              {section.entries.map((entry, index) => (
                <p key={`${section.step}-${index}`} className="sb-record-facts__value">
                  {entry.label ? <span className="sb-record-facts__kicker">{entry.label}</span> : null}
                  {entry.value}
                </p>
              ))}
            </div>
          ))
        ) : (
          <p className="sb-record-facts__value">{copy.sections.visionEmpty}</p>
        )}
      </section>

      {view.hasProjectDetailsSummary ? (
        <section aria-labelledby="sb-record-told">
          <h3 id="sb-record-told">What you told us</h3>
          {view.projectDetailsSummary.map((section) => (
            <div key={section.title} className="sb-record-facts__block">
              <p className="sb-record-facts__kicker">{section.title}</p>
              {section.items.map((item) => (
                <p key={`${section.title}-${item.label}`} className="sb-record-facts__value">
                  <span className="sb-record-facts__kicker">{item.label}</span>
                  {item.value}
                </p>
              ))}
            </div>
          ))}
        </section>
      ) : null}

      {view.hasRouteMapClientSummary && view.routeMapClientSummary ? (
        <section aria-labelledby="sb-record-route">
          <h3 id="sb-record-route">{view.routeMapClientSummary.title}</h3>
          {view.routeMapClientSummary.items.map((item) => (
            <p key={item.label} className="sb-record-facts__value">
              <span className="sb-record-facts__kicker">{item.label}</span>
              {item.value}
            </p>
          ))}
        </section>
      ) : null}

      {view.revisionTracker ? (
        <section aria-labelledby="sb-record-revisions">
          <h3 id="sb-record-revisions">{copy.sections.revisionTracker}</h3>
          <dl className="sb-record-facts__facts">
            <div>
              <dt>Included</dt>
              <dd>{view.revisionTracker.included}</dd>
            </div>
            <div>
              <dt>Used</dt>
              <dd>{view.revisionTracker.used}</dd>
            </div>
            <div>
              <dt>Remaining</dt>
              <dd>{view.revisionTracker.remaining}</dd>
            </div>
          </dl>
          {revisionPolicy ? (
            <HelpCenterLink
              label={revisionPolicy.label}
              anchor={revisionPolicy.anchor}
              from="studio-board"
            />
          ) : null}
        </section>
      ) : null}

      {view.studioUpdates.length > 0 ? (
        <section aria-labelledby="sb-record-notes">
          <h3 id="sb-record-notes">{copy.sections.updates}</h3>
          <ul className="sb-record-facts__notes">
            {view.studioUpdates.map((update) => (
              <li key={`${update.date}-${update.message}`}>
                <span className="sb-record-facts__kicker">{update.date}</span>
                <span className="sb-record-facts__value">{update.message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
