import type { ServiceGuideFaqItem, BillingType, ServiceFamilyId, ServiceId } from "@/catalog/types";

export type ServiceGuideTiming = {
  label: string;
};

export type ServiceGuideModel = {
  skuId: ServiceId;
  serviceName: string;
  purpose: string;
  billingType: BillingType;
  priceDisplay: string;
  exactPriceCents: number;
  deliverables: readonly string[];
  exclusions: readonly string[];
  timingWindow: ServiceGuideTiming;
  revisionRule: string;
  clientResponsibilities: readonly string[];
  executionResponsibility: string;
  requiresClientAccess: boolean;
  requiresClientMaterials: boolean;
  parentSkuId?: ServiceId;
  parentFamilyId?: ServiceFamilyId;
  parentServiceName?: string;
  faq: readonly ServiceGuideFaqItem[];
};
