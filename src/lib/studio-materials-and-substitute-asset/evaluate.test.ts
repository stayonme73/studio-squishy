import { describe, expect, it } from "vitest";

import { studioMaterialsAndSubstituteAssetV1 } from "@/config/studio-materials-and-substitute-asset-v1";
import { classifyEscalation } from "@/lib/studio-orchestration/escalation";
import { missingMaterialsMayReachOwner } from "./evaluate";
import {
  evaluateMaterialsAndSubstituteAsset,
  materialsRuleBlocksProduction,
  type MaterialsRuleFacts,
} from "./index";

function facts(overrides: Partial<MaterialsRuleFacts> = {}): MaterialsRuleFacts {
  return {
    customerPromisedMaterials: false,
    customerMaterialsReceived: false,
    rightsPass: false,
    customerAuthorizedStudioCreatedVisuals: false,
    studioCreatedAuthorizationRecorded: false,
    studioCreatedRightsPass: false,
    studioCreatedLabeledAsStudioCreated: false,
    assetKind: "customer_supplied",
    treatedAsCustomerSupplied: false,
    testOrControlledScenarioAllowsFixture: false,
    authorizedProductionRuleAllowsFixture: false,
    customerRequestsMaterialsException: false,
    pathConflictsWithExistingRule: false,
    rightsOrSourceAmbiguous: false,
    machineCannotResolveUnderExistingRules: false,
    ...overrides,
  };
}

describe("Studio Materials + Substitute-Asset Rule", () => {
  it("is a shared playbook, not a Moss-only patch", () => {
    expect(studioMaterialsAndSubstituteAssetV1.notAMossOnlyPatch).toBe(true);
    expect(studioMaterialsAndSubstituteAssetV1.sharedAcross).toEqual([
      "Studio Voice",
      "Machine",
      "Production",
      "Owner Console escalation",
    ]);
    expect(studioMaterialsAndSubstituteAssetV1.missingPromisedMaterialsAreNotOwnerEscalation).toBe(
      true,
    );
  });

  it("customer promised photos but has not sent them → WAIT, no Owner escalation", () => {
    const decision = evaluateMaterialsAndSubstituteAsset(
      facts({
        customerPromisedMaterials: true,
        customerMaterialsReceived: false,
      }),
    );
    expect(decision.path).toBe("WAIT_FOR_CUSTOMER_MATERIALS");
    expect(decision.ownerEscalation).toBe(false);
    expect(decision.productionMayProceed).toBe(false);
    expect(decision.voiceAction).toBe("follow_up_for_promised_materials");
    expect(decision.machineState).toBe("waiting_on_customer_materials");
    expect(decision.voiceCopy).toContain("waiting on those materials");
    expect(missingMaterialsMayReachOwner(facts({ customerPromisedMaterials: true }))).toBe(
      false,
    );
    expect(materialsRuleBlocksProduction(facts({ customerPromisedMaterials: true }))).toBeTruthy();
    expect(
      classifyEscalation({
        question: "customer has not sent promised photos",
        internalAttemptCount: 0,
      }).ownerOnly,
    ).toBe(false);
  });

  it("customer sends photos and rights pass → Production may proceed", () => {
    const decision = evaluateMaterialsAndSubstituteAsset(
      facts({
        customerPromisedMaterials: true,
        customerMaterialsReceived: true,
        rightsPass: true,
        assetKind: "customer_supplied",
      }),
    );
    expect(decision.path).toBe("PRODUCTION_MAY_PROCEED");
    expect(decision.productionMayProceed).toBe(true);
    expect(decision.ownerEscalation).toBe(false);
    expect(decision.machineState).toBe("ready_for_production");
    expect(
      materialsRuleBlocksProduction(
        facts({
          customerPromisedMaterials: true,
          customerMaterialsReceived: true,
          rightsPass: true,
          assetKind: "customer_supplied",
        }),
      ),
    ).toBeUndefined();
  });

  it("customer says create the visuals for me → Studio-created visual path", () => {
    const opened = evaluateMaterialsAndSubstituteAsset(
      facts({
        customerPromisedMaterials: true,
        customerMaterialsReceived: false,
        customerAuthorizedStudioCreatedVisuals: true,
      }),
    );
    expect(opened.path).toBe("STUDIO_CREATED_VISUAL_PATH");
    expect(opened.productionMayProceed).toBe(false);
    expect(opened.machineState).toBe("route_studio_created_visual_path");
    expect(opened.voiceAction).toBe("record_studio_created_path");

    const ready = evaluateMaterialsAndSubstituteAsset(
      facts({
        customerAuthorizedStudioCreatedVisuals: true,
        studioCreatedAuthorizationRecorded: true,
        studioCreatedRightsPass: true,
        studioCreatedLabeledAsStudioCreated: true,
        assetKind: "studio_created",
      }),
    );
    expect(ready.path).toBe("STUDIO_CREATED_VISUAL_PATH");
    expect(ready.productionMayProceed).toBe(true);
  });

  it("certification fixture exists → must NOT be silently substituted", () => {
    const silent = evaluateMaterialsAndSubstituteAsset(
      facts({
        customerPromisedMaterials: true,
        customerMaterialsReceived: false,
        assetKind: "certification_fixture",
        treatedAsCustomerSupplied: true,
      }),
    );
    expect(silent.path).toBe("REFUSE_FIXTURE_SUBSTITUTION");
    expect(silent.productionMayProceed).toBe(false);
    expect(silent.ownerEscalation).toBe(false);
    expect(silent.machineState).toBe("blocked_fixture_substitution");

    const unlabeledReuse = evaluateMaterialsAndSubstituteAsset(
      facts({
        assetKind: "certification_fixture",
        treatedAsCustomerSupplied: false,
        testOrControlledScenarioAllowsFixture: false,
      }),
    );
    expect(unlabeledReuse.path).toBe("REFUSE_FIXTURE_SUBSTITUTION");
    expect(unlabeledReuse.productionMayProceed).toBe(false);
  });
});
