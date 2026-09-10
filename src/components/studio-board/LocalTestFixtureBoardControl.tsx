"use client";

import { useSamsungGateActivate } from "@/lib/studio-samsung-activate";
import {
  LOCAL_TEST_FIXTURE_PATH,
  localTestFixturesCopy,
} from "@/lib/local-test-fixtures-copy";

/**
 * Samsung Chrome often never fires Next <Link> click. Native button +
 * same-tab assign. Do not reuse Let’s Get Started — that Denim fill reads
 * brown through Lounge glass, with only the yellow trim showing.
 */
export default function LocalTestFixtureBoardControl() {
  const activate = useSamsungGateActivate<HTMLButtonElement>(() => {
    window.location.assign(LOCAL_TEST_FIXTURE_PATH);
  });

  return (
    <div className="sb-local-test-fixture" data-local-test-fixture="materials">
      <p className="sb-local-test-fixture__eyebrow">{localTestFixturesCopy.eyebrow}</p>
      <button type="button" ref={activate.ref} className="sb-local-test-fixture__button">
        {localTestFixturesCopy.boardButton}
      </button>
    </div>
  );
}
