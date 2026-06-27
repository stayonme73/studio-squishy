import { describe, expect, it } from "vitest";

import {
  getActiveLaunchServices,
  getRecommendableActiveServices,
  getServiceById,
} from "@/catalog/accessors";
import { SERVICE_CATALOG } from "@/catalog/services";
import { getActivePurchasableServices } from "@/catalog/validate";
import { buildDiscoveryBrief } from "@/lib/discovery-brief";
import { recommendFromDiscovery } from "@/recommendation/engine";
import { getAvailableServicesToAdd } from "@/studio-plan-review/planState";
import type { ServiceId } from "@/catalog/types";

const GREEN_SERVICE_IDS = [
  "bf-001",
  "sm-001",
  "sm-001-monthly",
  "em-001",
  "em-001-monthly",
  "cc-001",
  "ma-001",
  "ap-001",
] as const satisfies readonly ServiceId[];

const LIMITED_SERVICE_IDS = [
  "bf-002",
  "cp-001",
  "mo-001",
  "ma-001-monthly",
  "mo-001-monthly",
  "social_media-execution",
  "social_media-execution-monthly",
  "email_marketing-execution",
  "email_marketing-execution-monthly",
  "sms_marketing-execution",
  "sms_marketing-execution-monthly",
] as const satisfies readonly ServiceId[];

const PAUSED_SERVICE_IDS = [
  "cp-001-monthly",
  "sms-001",
  "sms-001-monthly",
  "cc-001-monthly",
  "cc-002",
  "cc-002-monthly",
  "vp-001",
  "vp-001-monthly",
  "lp-001",
] as const satisfies readonly ServiceId[];

const STARTING_FRESH_BRIEF = buildDiscoveryBrief({
  "your-business": "Test Co",
  "your-situation": "Starting fresh",
  "your-challenge": "Lack of clarity or direction",
  "your-current-tools": "None yet / starting from scratch",
  "your-focus": "Marketing & growth",
  "success-looks-like": "More leads or customers, Launching something new",
  "whats-slowing-you-down": "Low visibility or reach",
});

describe("green services activation", () => {
  it("exposes exactly 8 green services via getActiveLaunchServices", () => {
    const active = getActiveLaunchServices();
    expect(active).toHaveLength(8);
    expect(active.map((service) => service.id).sort()).toEqual([...GREEN_SERVICE_IDS].sort());
  });

  it("getRecommendableActiveServices includes green recommendable SKUs only", () => {
    const recommendable = getRecommendableActiveServices();
    expect(recommendable.every((service) => service.launchStatus === "active")).toBe(true);
    expect(recommendable.every((service) => !service.isExecutionAddOn)).toBe(true);
    expect(recommendable.map((service) => service.id).sort()).toEqual(
      ["bf-001", "cc-001", "em-001", "em-001-monthly", "ma-001", "ap-001", "sm-001", "sm-001-monthly"].sort(),
    );
  });

  it("yellow and red services remain in catalog but are not purchasable", () => {
    for (const id of [...LIMITED_SERVICE_IDS, ...PAUSED_SERVICE_IDS]) {
      expect(getServiceById(id)).toBeDefined();
    }

    const purchasableIds = new Set(
      getActivePurchasableServices(SERVICE_CATALOG).map((service) => service.id),
    );
    for (const id of [...LIMITED_SERVICE_IDS, ...PAUSED_SERVICE_IDS]) {
      expect(purchasableIds.has(id)).toBe(false);
    }
  });

  it("green prices are unchanged", () => {
    const expectedPrices: Record<(typeof GREEN_SERVICE_IDS)[number], number> = {
      "bf-001": 49500,
      "sm-001": 39500,
      "sm-001-monthly": 34900,
      "em-001": 32500,
      "em-001-monthly": 22500,
      "cc-001": 22500,
      "ma-001": 49500,
      "ap-001": 17500,
    };

    for (const id of GREEN_SERVICE_IDS) {
      expect(getServiceById(id)?.priceCents).toBe(expectedPrices[id]);
    }
  });

  it("yellow and red services are not recommended from Discovery", () => {
    const recommendedIds = recommendFromDiscovery(STARTING_FRESH_BRIEF).recommendations.map(
      (entry) => entry.serviceId,
    );

    for (const id of [...LIMITED_SERVICE_IDS, ...PAUSED_SERVICE_IDS]) {
      expect(recommendedIds).not.toContain(id);
    }
  });

  it("yellow and red services are not in getAvailableServicesToAdd", () => {
    const available = getAvailableServicesToAdd([]);
    expect(available).toHaveLength(GREEN_SERVICE_IDS.length);
    expect(available.sort()).toEqual([...GREEN_SERVICE_IDS].sort());

    for (const id of [...LIMITED_SERVICE_IDS, ...PAUSED_SERVICE_IDS]) {
      expect(available).not.toContain(id);
    }
  });

  it("execution add-ons stay hidden even when a green parent is selected", () => {
    const available = getAvailableServicesToAdd(["sm-001", "em-001"]);
    for (const id of [
      "social_media-execution",
      "email_marketing-execution",
      "sms_marketing-execution",
    ] as const) {
      expect(available).not.toContain(id);
    }
  });
});
