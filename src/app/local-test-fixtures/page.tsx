import { notFound } from "next/navigation";

import LocalTestFixturePageActions from "@/components/studio-board/LocalTestFixturePageActions";
import StudioMobileLoungeShell from "@/components/shared/StudioMobileLoungeShell";
import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import {
  LOCAL_TEST_FIXTURE_PREVIEW_PATH,
  localTestFixturesCopy,
} from "@/lib/local-test-fixtures-copy";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

export const metadata = {
  title: "Studio test file",
};

export default function LocalTestFixturesPage() {
  if (!isLocalAuthFixtureAvailable()) {
    notFound();
  }

  return (
    <StudioMobileLoungeShell
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col`}
    >
      <div className="utility-page local-test-fixture-page">
        <div className="utility-shell utility-shell--narrow">
          <section
            className="studio-tile--standard local-test-fixture-card"
            aria-labelledby="local-test-fixture-title"
          >
            <p className="utility-eyebrow">{localTestFixturesCopy.eyebrow}</p>
            <h1 id="local-test-fixture-title" className="utility-title">
              {localTestFixturesCopy.pageTitle}
            </h1>
            <p className="utility-lead">{localTestFixturesCopy.lead}</p>
            <p className="utility-note">{localTestFixturesCopy.note}</p>
            <img
              className="local-test-fixture__preview"
              src={LOCAL_TEST_FIXTURE_PREVIEW_PATH}
              alt="Pine and Petal ordinary mark test file"
              width={240}
              height={240}
            />
            <LocalTestFixturePageActions />
          </section>
        </div>
      </div>
    </StudioMobileLoungeShell>
  );
}
