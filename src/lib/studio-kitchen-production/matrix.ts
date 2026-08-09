import { ACTIVE_CUSTOMER_FACING_SKUS } from "./active-set";
import {
  PRODUCTION_READINESS_LABELS,
  resolveServiceProductionContract,
} from "./resolve-contract";
import type { ProductionCapabilityMatrixRow } from "./types";

function canProceedToProductionQualityTesting(
  readiness: ProductionCapabilityMatrixRow["readiness"],
): boolean {
  return (
    readiness === "contract_ready" ||
    readiness === "contract_ready_integration_required"
  );
}

/**
 * Deterministic production capability matrix for all locked active SKUs.
 * Evidence base for later real service production-quality testing — not a write model,
 * and not customer/launch certification.
 */
export function buildProductionCapabilityMatrix(): readonly ProductionCapabilityMatrixRow[] {
  return ACTIVE_CUSTOMER_FACING_SKUS.map((skuId) => {
    const result = resolveServiceProductionContract(skuId);
    if (result.status !== "resolved") {
      return {
        skuId,
        serviceName: skuId,
        producerRole: "producer_dispatcher",
        primaryToolLabel: "unavailable",
        requiredInputsSummary: "Contract unresolved",
        productionMethodSummary: result.message,
        qaSummary: "unavailable",
        customerReceivesSummary: "unavailable",
        limitationsSummary: "unavailable",
        readiness: "unsupported",
        readinessLabel: PRODUCTION_READINESS_LABELS.unsupported,
        canProceedToProductionQualityTesting: false,
      };
    }

    const { contract } = result;
    return {
      skuId: contract.skuId,
      serviceName: contract.serviceName,
      producerRole: contract.producerRole,
      primaryToolLabel: `${contract.primaryTool.label} (${contract.primaryTool.toolReadiness})`,
      requiredInputsSummary: contract.requiredCustomerInputs.join("; "),
      productionMethodSummary: contract.productionSteps.map((step) => step.label).join(" → "),
      qaSummary: `${contract.qaItems.length} checks (catalog + phase + SKU)`,
      customerReceivesSummary: contract.deliverables.join("; "),
      limitationsSummary: contract.limitations.slice(0, 4).join("; "),
      readiness: contract.readiness,
      readinessLabel: PRODUCTION_READINESS_LABELS[contract.readiness],
      canProceedToProductionQualityTesting: canProceedToProductionQualityTesting(
        contract.readiness,
      ),
    };
  });
}
