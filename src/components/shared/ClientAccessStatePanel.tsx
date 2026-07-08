import Link from "next/link";

import AccessControlDeniedPanel from "@/components/shared/AccessControlDeniedPanel";
import NoActiveProjectPanel from "@/components/shared/NoActiveProjectPanel";
import type { NoActiveProjectCopy } from "@/config/access-control";
import { studioBoard } from "@/config/studio-board";
import type { CurrentCampaignAccessState } from "@/lib/use-current-campaign";

const { routes, clientAccess: copy } = studioBoard;

export type { NoActiveProjectCopy as NoActiveProjectAccessCopy };

type Props = {
  state: CurrentCampaignAccessState;
  onRetry?: () => void;
  noActiveProject?: NoActiveProjectCopy;
};

/** Client campaign access states — composes shared Access Control and No Active Project panels. */
export default function ClientAccessStatePanel({ state, onRetry, noActiveProject }: Props) {
  if (state === "no-active-project") {
    const content: NoActiveProjectCopy = {
      ...copy.noActiveProject,
      primaryHref: routes.newCampaign,
      secondaryHref: routes.helpCenter,
      ...noActiveProject,
    };
    return <NoActiveProjectPanel copy={content} titleId="client-access-title" />;
  }

  if (state === "auth-required") {
    const content = copy.authRequired;
    return (
      <div className="utility-page utility-page--access">
        <div className="utility-access-card-shell">
          <section className="utility-card" aria-labelledby="client-access-title">
            <p className="utility-eyebrow">{content.eyebrow}</p>
            <h1 id="client-access-title" className="utility-title">
              {content.title}
            </h1>
            <p className="utility-lead">{content.message}</p>
            <div className="utility-access-actions">
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
      <div className="utility-page utility-page--access">
        <div className="utility-access-card-shell">
          <section className="utility-card" aria-labelledby="client-access-title">
            <p className="utility-eyebrow">{content.eyebrow}</p>
            <h1 id="client-access-title" className="utility-title">
              {content.title}
            </h1>
            <p className="utility-lead">{content.message}</p>
            <div className="utility-access-actions">
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

  return <AccessControlDeniedPanel room="customer" titleId="client-access-title" />;
}
