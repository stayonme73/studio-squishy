"use client";

import { useSamsungGateActivate } from "@/lib/studio-samsung-activate";
import {
  LOCAL_TEST_FIXTURE_PATH,
  localTestFixturesCopy,
} from "@/lib/local-test-fixtures-copy";

/**
 * Next.js <Link> intercepts click for client navigation. Samsung Chrome
 * often never fires that click, so the control paints and prefetch may
 * hit the server while the tap is a no-op. Native href + same-tab assign.
 */
export default function LocalTestFixtureBoardControl() {
  const activate = useSamsungGateActivate<HTMLAnchorElement>(() => {
    window.location.assign(LOCAL_TEST_FIXTURE_PATH);
  });

  return (
    <div className="sb-local-test-fixture" data-local-test-fixture="materials">
      <p className="sb-local-test-fixture__eyebrow">{localTestFixturesCopy.eyebrow}</p>
      <a
        ref={activate.ref}
        className="utility-btn utility-btn--secondary sb-local-test-fixture__button"
        href={LOCAL_TEST_FIXTURE_PATH}
      >
        {localTestFixturesCopy.boardButton}
      </a>
    </div>
  );
}
