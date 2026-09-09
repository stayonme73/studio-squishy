import {
  LOCAL_TEST_FIXTURE_FILENAME,
  LOCAL_TEST_FIXTURE_PREVIEW_PATH,
} from "@/lib/local-test-fixtures-copy";

/**
 * Local/test-only Samsung save.
 * Do not use HTTPS attachment href (Download Manager rejects the self-signed
 * LAN cert). Do not use Web Share (this Samsung has no Files/My Files target).
 * Prefetch in already-trusted Chrome, then blob:<a download>.
 */
export type LocalTestFixturePayload = {
  blob: Blob;
  blobUrl: string;
};

export async function prefetchLocalTestFixture(): Promise<LocalTestFixturePayload> {
  const response = await fetch(LOCAL_TEST_FIXTURE_PREVIEW_PATH, {
    cache: "force-cache",
  });
  if (!response.ok) {
    throw new Error("Local fixture file is unavailable.");
  }
  const blob = await response.blob();
  return {
    blob,
    blobUrl: URL.createObjectURL(blob),
  };
}

export function deliverLocalTestFixtureToPhone(payload: LocalTestFixturePayload): void {
  const link = document.createElement("a");
  link.href = payload.blobUrl;
  link.download = LOCAL_TEST_FIXTURE_FILENAME;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}
