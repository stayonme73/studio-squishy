/**
 * Local/test Materials fixture pickup copy.
 * Safe for client components — no server or secret imports.
 */
export const localTestFixturesCopy = {
  eyebrow: "LOCAL DEVELOPER TEST",
  boardButton: "Save Studio fixture file",
  pageTitle: "Studio test file",
  lead: "This is a Studio-owned test mark. It is not a personal photo. Save it to this phone, then return to Studio Board.",
  saveButton: "Save this file to the phone",
  returnButton: "Return to Studio Board",
  note: "Stay in this Chrome tab. Do not paste a new address.",
} as const;

export const LOCAL_TEST_FIXTURE_PATH = "/local-test-fixtures" as const;
export const LOCAL_TEST_FIXTURE_DOWNLOAD_PATH =
  "/api/local-test-fixtures/pine-petal-ordinary-mark" as const;
export const LOCAL_TEST_FIXTURE_PREVIEW_PATH =
  "/mobile-customer-journey-cert-1/pine-petal-ordinary-mark.png" as const;
export const LOCAL_TEST_FIXTURE_FILENAME = "pine-petal-ordinary-mark.png" as const;
