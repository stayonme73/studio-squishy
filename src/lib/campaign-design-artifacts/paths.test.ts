import { describe, expect, it } from "vitest";

import {
  campaignDesignArtifactRelPath,
  relPathToStorageObjectPath,
  storageObjectPathToRelPath,
} from "./paths";

describe("campaign design artifact paths", () => {
  it("maps repo-relative paths to private Storage keys", () => {
    const rel = campaignDesignArtifactRelPath("camp-1", "production-team/log.json");
    expect(relPathToStorageObjectPath(rel)).toBe(
      "campaign-design-artifacts/camp-1/production-team/log.json",
    );
    expect(storageObjectPathToRelPath(relPathToStorageObjectPath(rel))).toBe(rel);
  });
});
