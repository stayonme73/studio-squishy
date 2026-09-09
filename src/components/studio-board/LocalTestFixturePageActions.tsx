"use client";

import { useEffect, useRef, useState } from "react";

import { useSamsungGateActivate } from "@/lib/studio-samsung-activate";
import {
  LOCAL_TEST_FIXTURE_FILENAME,
  localTestFixturesCopy,
} from "@/lib/local-test-fixtures-copy";
import {
  deliverLocalTestFixtureToPhone,
  prefetchLocalTestFixture,
  type LocalTestFixturePayload,
} from "@/lib/local-test-fixture-save";

/**
 * Samsung Chrome can skip click; Download Manager cannot use the self-signed
 * LAN cert. Prefetch in Chrome, then blob download. Never Web Share.
 * Never href the HTTPS API.
 */
export default function LocalTestFixturePageActions() {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const payloadRef = useRef<LocalTestFixturePayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    void prefetchLocalTestFixture().then((payload) => {
      if (cancelled) {
        URL.revokeObjectURL(payload.blobUrl);
        return;
      }
      created = payload.blobUrl;
      payloadRef.current = payload;
      setBlobUrl(payload.blobUrl);
    });
    return () => {
      cancelled = true;
      payloadRef.current = null;
      if (created) URL.revokeObjectURL(created);
    };
  }, []);

  const save = useSamsungGateActivate<HTMLAnchorElement>(() => {
    const payload = payloadRef.current;
    if (!payload) return;
    deliverLocalTestFixtureToPhone(payload);
  });
  const back = useSamsungGateActivate<HTMLAnchorElement>(() => {
    window.location.assign("/studio-board");
  });

  return (
    <>
      <a
        ref={save.ref}
        className="lobby-entry-film__cta"
        href={blobUrl ?? "#local-test-fixture-save"}
        download={LOCAL_TEST_FIXTURE_FILENAME}
        data-local-test-fixture-save={blobUrl ? "blob" : "pending"}
      >
        {localTestFixturesCopy.saveButton}
      </a>
      <p className="utility-note">
        <a ref={back.ref} href="/studio-board">
          {localTestFixturesCopy.returnButton}
        </a>
      </p>
    </>
  );
}
