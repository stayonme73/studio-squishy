export type FactoryReadiness =
  | "READY"
  | "READY_WITH_EXPLICIT_LIMITS"
  | "PARTIAL"
  | "MISSING"
  | "DO_NOT_USE";

export type FactoryCapabilityRow = {
  id: string;
  label: string;
  readiness: FactoryReadiness;
  note: string;
};

export function localVisibilityFactoryCapabilityMap(): readonly FactoryCapabilityRow[] {
  return [
    {
      id: "copy_generation",
      label: "Copy generation",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Email/SMS/social/ad-text factories exist. V1 assembles from customer facts only.",
    },
    {
      id: "claims_fact_gating",
      label: "Claims / fact gating",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Fact lexicon + forbidden ranking/lead/AI-claim patterns. Conflicts fail closed.",
    },
    {
      id: "customer_fact_binding",
      label: "Customer-fact binding",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Deliverable answers may use only supplied tokens plus structural words.",
    },
    {
      id: "qa",
      label: "QA",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Fact gate is required before the pack is written. Quality is not skipped.",
    },
    {
      id: "revision",
      label: "Revision",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "One included pack revision for a supplied factual correction.",
    },
    {
      id: "final_delivery",
      label: "Final delivery",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Per-campaign artifact root. Paste-ready files. Customer implements.",
    },
    {
      id: "public_source_inspection",
      label: "Public-source inspection",
      readiness: "DO_NOT_USE",
      note: "V1 does not fetch websites, listings, or Google Business. URL is a customer-stated label only.",
    },
    {
      id: "isolation",
      label: "Customer isolation",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Artifact root is data/campaign-design-artifacts/${campaignId}/local-visibility-v1.",
    },
    {
      id: "account_login",
      label: "Account login / profile management",
      readiness: "DO_NOT_USE",
      note: "Customer owns accounts, publishing, and implementation.",
    },
    {
      id: "ranking_promises",
      label: "Ranking / leads / AI recommendation promises",
      readiness: "DO_NOT_USE",
      note: "Forbidden in copy and in the offer.",
    },
  ];
}
