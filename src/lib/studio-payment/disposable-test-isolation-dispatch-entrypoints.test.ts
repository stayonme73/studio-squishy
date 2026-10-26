import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Dispatch is centralized on ensureDispatchExecution; direct callers must stay
 * behind the shared isolation guard in ensure.ts.
 */
const DISPATCH_CALLER_PATHS = [
  "src/lib/studio-paid-activation-recovery/recover.ts",
  "src/lib/studio-payment/intake-submit.ts",
  "src/app/api/campaigns/[campaignId]/materials/route.ts",
  "src/app/api/campaigns/[campaignId]/jobs/[jobId]/review/route.ts",
] as const;

describe("disposable test dispatch entrypoints", () => {
  it("routes every known ensureDispatchExecution caller through ensure.ts guard", () => {
    const ensureSource = readFileSync(
      path.join(process.cwd(), "src/lib/studio-dispatch/ensure.ts"),
      "utf8",
    );
    expect(ensureSource).toContain("resolveDispatchExecutionIsolationBlock");

    for (const relative of DISPATCH_CALLER_PATHS) {
      const source = readFileSync(path.join(process.cwd(), relative), "utf8");
      expect(source).toContain("ensureDispatchExecution");
    }
  });
});
