import Link from "next/link";

import { studioBoard } from "@/config/studio-board";
import type { CurrentCampaignAccessState } from "@/lib/use-current-campaign";

const { routes, clientAccess: copy } = studioBoard;

type Props = {
  state: CurrentCampaignAccessState;
  onRetry?: () => void;
};

export default function ClientAccessStatePanel({ state, onRetry }: Props) {
  if (state === "no-active-project") {
    const content = copy.noActiveProject;
    return (
      <div className="utility-page">
        <div className="utility-shell utility-shell--narrow">
          <section className="utility-card" aria-labelledby="client-access-title">
            <p className="utility-eyebrow">{content.eyebrow}</p>
            <h1 id="client-access-title" className="utility-title">
              {content.title}
            </h1>
            <p className="utility-lead">{content.message}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href={routes.newCampaign} className="utility-btn utility-btn--primary">
                {content.primaryCta}
              </Link>
              <Link href={routes.helpCenter} className="utility-btn utility-btn--secondary">
                {content.secondaryCta}
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (state === "auth-required") {
    const content = copy.authRequired;
    return (
      <div className="utility-page">
        <div className="utility-shell utility-shell--narrow">
          <section className="utility-card" aria-labelledby="client-access-title">
            <p className="utility-eyebrow">{content.eyebrow}</p>
            <h1 id="client-access-title" className="utility-title">
              {content.title}
            </h1>
            <p className="utility-lead">{content.message}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/sign-in" className="utility-btn utility-btn--primary">
                {content.primaryCta}
              </Link>
              <Link href={routes.helpCenter} className="utility-btn utility-btn--secondary">
                {content.secondaryCta}
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (state === "error") {
    const content = copy.loadError;
    return (
      <div className="utility-page">
        <div className="utility-shell utility-shell--narrow">
          <section className="utility-card" aria-labelledby="client-access-title">
            <p className="utility-eyebrow">{content.eyebrow}</p>
            <h1 id="client-access-title" className="utility-title">
              {content.title}
            </h1>
            <p className="utility-lead">{content.message}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" className="utility-btn utility-btn--primary" onClick={onRetry}>
                {content.retryCta}
              </button>
              <Link href={routes.helpCenter} className="utility-btn utility-btn--secondary">
                {content.secondaryCta}
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const content = copy.denied;
  return (
    <div className="utility-page">
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="client-access-title">
          <p className="utility-eyebrow">{content.eyebrow}</p>
          <h1 id="client-access-title" className="utility-title">
            {content.title}
          </h1>
          <p className="utility-lead">{content.message}</p>
          {content.note ? <p className="utility-note">{content.note}</p> : null}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href={routes.studioBoard} className="utility-btn utility-btn--primary">
              Studio Board
            </Link>
            <Link href={routes.helpCenter} className="utility-btn utility-btn--secondary">
              Help Center
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
