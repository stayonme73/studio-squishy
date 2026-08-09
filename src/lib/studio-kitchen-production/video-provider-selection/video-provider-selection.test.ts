import { describe, expect, it } from "vitest";
import {
  ACTIVE_SERVICE_SKU,
  CUSTOMER_READINESS_AFTER_SELECTION,
  PROVIDER_EVALUATIONS,
  PROVIDER_SELECTION_DECISION,
  PROVIDER_SELECTION_STARTING_CONTROL,
  PROPOSED_ENV_VARS,
  assertSelectionIntegrity,
} from "./index";

describe("KITCHEN-VIDEO-PROVIDER-SELECTION-1", () => {
  it("starts from sealed VIDEO-OPERATIONAL tip", () => {
    expect(PROVIDER_SELECTION_STARTING_CONTROL.startsWith("7377c47")).toBe(
      true,
    );
  });

  it("keeps short-video readiness blocked after selection", () => {
    expect(ACTIVE_SERVICE_SKU).toBe("v2-rtu-short-video");
    expect(CUSTOMER_READINESS_AFTER_SELECTION).toContain("NOT CUSTOMER READY");
    expect(CUSTOMER_READINESS_AFTER_SELECTION).toContain("NOT CERTIFIED");
  });

  it("selects exactly one hard-gate-passing winner", () => {
    expect(PROVIDER_SELECTION_DECISION.decision).toBe("SELECT");
    if (PROVIDER_SELECTION_DECISION.decision !== "SELECT") return;
    expect(PROVIDER_SELECTION_DECISION.winner).toBe("shotstack");
    expect(PROVIDER_SELECTION_DECISION.runnerUp).toBe("creatomate");
    assertSelectionIntegrity();
  });

  it("does not let a hard-gate failure win on score", () => {
    for (const provider of PROVIDER_EVALUATIONS) {
      if (provider.hardGateOverall === "FAIL") {
        expect(PROVIDER_SELECTION_DECISION.decision).not.toBe("SELECT");
      }
    }
    const passers = PROVIDER_EVALUATIONS.filter(
      (p) => p.hardGateOverall === "PASS",
    );
    expect(passers.length).toBe(3);
  });

  it("defines integration env boundary without implementing provider calls", () => {
    expect(PROPOSED_ENV_VARS).toContain("SHOTSTACK_API_KEY");
    expect(PROPOSED_ENV_VARS).toContain("SHOTSTACK_API_BASE_URL");
  });
});
