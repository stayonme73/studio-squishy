/**
 * Authoritative rm-j002 / rm-j008 contract projection after Owner A+C decision.
 * Sources: src/catalog/route-map-launch.ts + sku-overrides.ts
 */

import { getServiceById } from "@/catalog";
import { ROUTE_MAP_REVISION_TEMPLATE } from "@/catalog/route-map-shared-copy";
import { getSkuOverride } from "../sku-overrides";
import {
  SOCIAL_PROFILE_SETUP_SKU,
  SOCIAL_PROFILE_UPDATE_SKU,
  type SocialProfileMode,
  type SocialProfileSku,
} from "./types";

export type AuthoritativeSocialProfileContract = {
  skuId: SocialProfileSku;
  mode: SocialProfileMode;
  kitKind: "setup_kit" | "update_kit";
  serviceName: string;
  purpose: string;
  platforms: readonly ("Facebook" | "Instagram" | "TikTok")[];
  priceCents: number;
  priceDisplay: string;
  deliverables: readonly string[];
  exclusions: readonly string[];
  revisionRule: string;
  clientResponsibilities: readonly string[];
  intakeTemplate: "social-setup";
  studioProduces: readonly string[];
  customerDoes: readonly string[];
  ownerDoesRoutine: "NONE";
  directPlatformMutationPromised: false;
  postingContentPromised: false;
  productionReadiness: string;
  productionReadinessNotes: string;
  primaryToolId: string;
  optionalToolIds: readonly string[];
  discrepancies: readonly string[];
};

function loadSku(skuId: SocialProfileSku): AuthoritativeSocialProfileContract {
  const service = getServiceById(skuId);
  if (!service) {
    throw new Error(`${skuId} missing from catalog — cannot invent contract`);
  }
  const override = getSkuOverride(skuId);
  const mode: SocialProfileMode =
    skuId === SOCIAL_PROFILE_SETUP_SKU ? "setup" : "update";
  const kitKind = mode === "setup" ? "setup_kit" : "update_kit";

  const discrepancies: string[] = [];
  if (service.executionMode !== "creation_delivery") {
    discrepancies.push(
      "Kit SKUs must use creation_delivery — not managed platform execution.",
    );
  }
  if (/admin invitation|password|log in and/i.test(service.clientResponsibilities?.join(" ") ?? "")) {
    discrepancies.push(
      "Client responsibilities must not request admin-invite passwords for kit delivery.",
    );
  }

  return {
    skuId,
    mode,
    kitKind,
    serviceName: service.name,
    purpose: service.purpose ?? "",
    platforms: ["Facebook", "Instagram", "TikTok"],
    priceCents: service.priceCents ?? 0,
    priceDisplay: "$99 / platform",
    deliverables: service.deliverables ?? [],
    exclusions: service.exclusions ?? [],
    revisionRule: service.revisionRule ?? ROUTE_MAP_REVISION_TEMPLATE,
    clientResponsibilities: service.clientResponsibilities ?? [],
    intakeTemplate: "social-setup",
    studioProduces: service.deliverables ?? [],
    customerDoes: service.clientResponsibilities ?? [],
    ownerDoesRoutine: "NONE",
    directPlatformMutationPromised: false,
    postingContentPromised: false,
    productionReadiness: override?.readiness ?? "partial",
    productionReadinessNotes: override?.readinessNotes ?? "",
    primaryToolId: override?.primaryTool?.toolId ?? "canva",
    optionalToolIds: (override?.optionalTools ?? []).map((t) => t.toolId),
    discrepancies,
  };
}

export function loadAuthoritativeRmJ002Contract(): AuthoritativeSocialProfileContract {
  return loadSku(SOCIAL_PROFILE_SETUP_SKU);
}

export function loadAuthoritativeRmJ008Contract(): AuthoritativeSocialProfileContract {
  return loadSku(SOCIAL_PROFILE_UPDATE_SKU);
}
