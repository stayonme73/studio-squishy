"use client";

import Link from "next/link";

import {
  helpFromForPackage,
  studioCustomerJourneyCondenseV1,
  type PackageDetailModel,
} from "@/config/studio-customer-journey-condense-v1";
import {
  applyPackageIdentity,
  readCondensedJourneyDraft,
  writeCondensedJourneyDraft,
} from "@/lib/studio-customer-journey-condense/draft";

import JourneyPageChrome, { AskStudioVoiceButton } from "./JourneyPageChrome";
import PackageDetailCards from "./PackageDetailCards";

function purposeLineParts(line: string): string[] {
  const breakAt = line.indexOf(". ");
  if (breakAt === -1) return [line];
  return [line.slice(0, breakAt + 1), line.slice(breakAt + 2)];
}

export default function PackageDetailPage({ model }: { model: PackageDetailModel }) {
  const copy = studioCustomerJourneyCondenseV1;

  function startPackage() {
    const draft = readCondensedJourneyDraft();
    writeCondensedJourneyDraft(applyPackageIdentity(draft, model.id));
  }

  return (
    <JourneyPageChrome page="package-detail" helpFrom={helpFromForPackage(model.id)}>
      <section
        className="studio-homepage__section"
        data-selected-package={model.id}
        data-selected-price={model.priceDisplay}
      >
        <div className="studio-homepage__inner">
          <Link href={model.homeHref} className="studio-homepage__card-link studio-journey__back">
            ← Back to Home
          </Link>
          <p className="studio-homepage__kicker">Package Detail</p>
          <h1 className="studio-homepage__section-title">{model.name}</h1>
          <p className="studio-journey__price">{model.priceDisplay}</p>
          <p className="studio-homepage__card-detail">
            {purposeLineParts(model.purposeLine).map((part, index) => (
              <span key={part}>
                {index > 0 ? <br /> : null}
                {part}
              </span>
            ))}
          </p>
          <div className="studio-journey__doc">
            <PackageDetailCards name={model.name} sections={model.sections} />
          </div>
          <div className="studio-journey__actions">
            <Link
              href={model.startHref}
              className="studio-homepage__btn-primary studio-homepage__choose"
              data-package-cta="start"
              onClick={startPackage}
            >
              {copy.startThisPackage}
              <span className="studio-homepage__choose-arrow" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
            <AskStudioVoiceButton label={copy.askStudioVoice} dataAttribute="voice" />
          </div>
        </div>
      </section>
    </JourneyPageChrome>
  );
}
