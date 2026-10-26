/**
 * Shared Materials + Substitute-Asset evaluator.
 * Voice, Machine, Production, and Owner escalation read this. They do not invent a second rule.
 */

import {
  studioMaterialsAndSubstituteAssetV1 as rule,
  type MaterialsAssetKind,
  type MaterialsRulePath,
} from "@/config/studio-materials-and-substitute-asset-v1";

export type MaterialsRuleFacts = {
  customerPromisedMaterials: boolean;
  customerMaterialsReceived: boolean;
  rightsPass: boolean;
  customerAuthorizedStudioCreatedVisuals: boolean;
  studioCreatedAuthorizationRecorded: boolean;
  studioCreatedRightsPass: boolean;
  studioCreatedLabeledAsStudioCreated: boolean;
  assetKind: MaterialsAssetKind;
  treatedAsCustomerSupplied: boolean;
  testOrControlledScenarioAllowsFixture: boolean;
  authorizedProductionRuleAllowsFixture: boolean;
  customerRequestsMaterialsException: boolean;
  pathConflictsWithExistingRule: boolean;
  rightsOrSourceAmbiguous: boolean;
  machineCannotResolveUnderExistingRules: boolean;
};

export type MaterialsRuleDecision = {
  path: MaterialsRulePath;
  ownerEscalation: boolean;
  productionMayProceed: boolean;
  voiceAction: "follow_up_for_promised_materials" | "none" | "record_studio_created_path";
  machineState:
    | "waiting_on_customer_materials"
    | "ready_for_production"
    | "route_studio_created_visual_path"
    | "blocked_fixture_substitution"
    | "owner_exception";
  voiceCopy: string | null;
  why: string;
};

function silentFixtureSubstitution(facts: MaterialsRuleFacts): boolean {
  const fixture =
    facts.assetKind === "certification_fixture" || facts.assetKind === "test_asset";
  if (!fixture) return facts.assetKind === "invented";
  const explicitlyAllowed =
    facts.testOrControlledScenarioAllowsFixture ||
    facts.authorizedProductionRuleAllowsFixture;
  if (!explicitlyAllowed) return true;
  return facts.treatedAsCustomerSupplied;
}

function realOwnerException(facts: MaterialsRuleFacts): boolean {
  return (
    facts.customerRequestsMaterialsException ||
    facts.pathConflictsWithExistingRule ||
    facts.rightsOrSourceAmbiguous ||
    facts.machineCannotResolveUnderExistingRules
  );
}

export function evaluateMaterialsAndSubstituteAsset(
  facts: MaterialsRuleFacts,
): MaterialsRuleDecision {
  if (silentFixtureSubstitution(facts)) {
    return {
      path: "REFUSE_FIXTURE_SUBSTITUTION",
      ownerEscalation: false,
      productionMayProceed: false,
      voiceAction: "none",
      machineState: "blocked_fixture_substitution",
      voiceCopy: null,
      why: "Certification or test fixtures stay fixtures. Do not substitute them for customer materials.",
    };
  }

  if (
    facts.customerPromisedMaterials &&
    !facts.customerMaterialsReceived &&
    !facts.customerAuthorizedStudioCreatedVisuals
  ) {
    if (realOwnerException(facts)) {
      return {
        path: "OWNER_ESCALATION",
        ownerEscalation: true,
        productionMayProceed: false,
        voiceAction: "none",
        machineState: "owner_exception",
        voiceCopy: null,
        why: "A real materials exception needs Owner judgment.",
      };
    }
    return {
      path: "WAIT_FOR_CUSTOMER_MATERIALS",
      ownerEscalation: false,
      productionMayProceed: false,
      voiceAction: "follow_up_for_promised_materials",
      machineState: rule.machineWhenWaiting,
      voiceCopy: rule.voiceWhenWaiting,
      why: "The customer promised materials. The job waits. This is not an Owner escalation.",
    };
  }

  if (facts.customerAuthorizedStudioCreatedVisuals) {
    const ready =
      facts.studioCreatedAuthorizationRecorded &&
      facts.studioCreatedRightsPass &&
      facts.studioCreatedLabeledAsStudioCreated &&
      facts.assetKind === "studio_created";
    return {
      path: "STUDIO_CREATED_VISUAL_PATH",
      ownerEscalation: false,
      productionMayProceed: ready,
      voiceAction: ready ? "none" : "record_studio_created_path",
      machineState: "route_studio_created_visual_path",
      voiceCopy: null,
      why: ready
        ? "Customer authorized Studio-created visuals. Authorization, rights, and truthful labels are in place."
        : "Customer authorized Studio-created visuals. Record that authorization, run rights checks, and label the assets as Studio-created before production.",
    };
  }

  if (
    facts.customerMaterialsReceived &&
    facts.rightsPass &&
    facts.assetKind === "customer_supplied"
  ) {
    return {
      path: "PRODUCTION_MAY_PROCEED",
      ownerEscalation: false,
      productionMayProceed: true,
      voiceAction: "none",
      machineState: "ready_for_production",
      voiceCopy: null,
      why: "Customer materials arrived and rights passed. Production may proceed.",
    };
  }

  if (realOwnerException(facts)) {
    return {
      path: "OWNER_ESCALATION",
      ownerEscalation: true,
      productionMayProceed: false,
      voiceAction: "none",
      machineState: "owner_exception",
      voiceCopy: null,
      why: "Machine cannot resolve this materials path under existing rules.",
    };
  }

  return {
    path: "WAIT_FOR_CUSTOMER_MATERIALS",
    ownerEscalation: false,
    productionMayProceed: false,
    voiceAction: "follow_up_for_promised_materials",
    machineState: rule.machineWhenWaiting,
    voiceCopy: rule.voiceWhenWaiting,
    why: "Required materials are not ready. The job waits.",
  };
}

export function materialsRuleBlocksProduction(facts: MaterialsRuleFacts): string | undefined {
  const decision = evaluateMaterialsAndSubstituteAsset(facts);
  return decision.productionMayProceed ? undefined : decision.why;
}

export function missingMaterialsMayReachOwner(facts: MaterialsRuleFacts): boolean {
  return evaluateMaterialsAndSubstituteAsset(facts).ownerEscalation;
}
