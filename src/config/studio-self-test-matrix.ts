import type { ServiceFamilyId } from "@/catalog/types";

import {
  STUDIO_SELF_TEST_CAMPAIGN_ID,
  STUDIO_SELF_TEST_PRIMARY_SERVICE_ID,
} from "@/config/studio-self-test";

/** How a matrix row is verified — runner, store read, API, or manual walkthrough. */
export type SelfTestVerificationMethod = "script" | "store" | "api" | "manual";

/** Persisted row status — updated by runner or left pending for manual scenarios. */
export type SelfTestMatrixStatus = "pass" | "fail" | "pending" | "not_run";

export type SelfTestMatrixRow = {
  id: string;
  category: SelfTestMatrixCategory;
  scenario: string;
  expectedOutcome: string;
  verification: SelfTestVerificationMethod;
  /** Whether seed-studio-self-test.mjs prepares data for this row. */
  seeded: boolean;
  serviceFamily?: ServiceFamilyId;
  serviceId?: string;
};

export type SelfTestMatrixCategory =
  | "identity"
  | "service-family"
  | "journey"
  | "production-pipeline"
  | "materials"
  | "exceptions"
  | "owner-console"
  | "delivery";

/** Locked Self-Test Matrix — structure is canonical; statuses live in results file. */
export const STUDIO_SELF_TEST_MATRIX: readonly SelfTestMatrixRow[] = [
  {
    id: "identity-campaign-record",
    category: "identity",
    scenario: "Canonical self-test campaign exists on server",
    expectedOutcome: `data/campaigns/${STUDIO_SELF_TEST_CAMPAIGN_ID}.json with BUILDING_CONCEPTS and approved sm-001 plan`,
    verification: "store",
    seeded: true,
    serviceId: STUDIO_SELF_TEST_PRIMARY_SERVICE_ID,
  },
  {
    id: "identity-task-plan",
    category: "identity",
    scenario: "Task plan generated for sm-001 social pipeline",
    expectedOutcome:
      "Tasks include strategy_content_direction, copy, creative, qa, delivery_prep for sm-001",
    verification: "store",
    seeded: true,
    serviceFamily: "social_media",
    serviceId: STUDIO_SELF_TEST_PRIMARY_SERVICE_ID,
  },
  {
    id: "identity-materials-ledger",
    category: "identity",
    scenario: "Materials ledger initialized from approved plan",
    expectedOutcome: "data/campaign-materials/studio-self-test.json with plan-derived slots",
    verification: "store",
    seeded: true,
  },
  {
    id: "identity-production-store",
    category: "identity",
    scenario: "Production store synced for sm-001",
    expectedOutcome: "data/campaign-production/studio-self-test.json with sm-001:one_time family",
    verification: "store",
    seeded: true,
    serviceFamily: "social_media",
  },
  // — Service families (catalog coverage) —
  {
    id: "svc-family-social_media",
    category: "service-family",
    scenario: "Social Media Launch Set (sm-001) — full kitchen pipeline",
    expectedOutcome: "Seeded production + tasks at copy QA stage; normal flow exercisable",
    verification: "script",
    seeded: true,
    serviceFamily: "social_media",
    serviceId: "sm-001",
  },
  {
    id: "svc-family-brand_identity",
    category: "service-family",
    scenario: "Brand Identity Refresh (bf-001)",
    expectedOutcome: "Matrix row tracked; not seeded in V1 harness",
    verification: "manual",
    seeded: false,
    serviceFamily: "brand_identity",
    serviceId: "bf-001",
  },
  {
    id: "svc-family-email_marketing",
    category: "service-family",
    scenario: "Email Campaign Build (em-001)",
    expectedOutcome: "Matrix row tracked; not seeded in V1 harness",
    verification: "manual",
    seeded: false,
    serviceFamily: "email_marketing",
    serviceId: "em-001",
  },
  {
    id: "svc-family-marketing_copywriting",
    category: "service-family",
    scenario: "Marketing Copywriting Project (cc-001)",
    expectedOutcome: "Matrix row tracked; not seeded in V1 harness",
    verification: "manual",
    seeded: false,
    serviceFamily: "marketing_copywriting",
    serviceId: "cc-001",
  },
  {
    id: "svc-family-marketing_assets",
    category: "service-family",
    scenario: "Marketing Asset Pack (ma-001)",
    expectedOutcome: "Matrix row tracked; not seeded in V1 harness",
    verification: "manual",
    seeded: false,
    serviceFamily: "marketing_assets",
    serviceId: "ma-001",
  },
  {
    id: "svc-family-ai_voice_over",
    category: "service-family",
    scenario: "AI Voice Over (ap-001)",
    expectedOutcome: "Matrix row tracked; not seeded in V1 harness",
    verification: "manual",
    seeded: false,
    serviceFamily: "ai_voice_over",
    serviceId: "ap-001",
  },
  {
    id: "svc-family-brand_messaging",
    category: "service-family",
    scenario: "Brand messaging family",
    expectedOutcome: "Catalog family tracked; not seeded in V1 harness",
    verification: "manual",
    seeded: false,
    serviceFamily: "brand_messaging",
  },
  {
    id: "svc-family-campaign",
    category: "service-family",
    scenario: "Campaign services family",
    expectedOutcome: "Catalog family tracked; not seeded in V1 harness",
    verification: "manual",
    seeded: false,
    serviceFamily: "campaign",
  },
  {
    id: "svc-family-sms_marketing",
    category: "service-family",
    scenario: "SMS marketing family",
    expectedOutcome: "Catalog family tracked; not seeded in V1 harness",
    verification: "manual",
    seeded: false,
    serviceFamily: "sms_marketing",
  },
  {
    id: "svc-family-content_writing",
    category: "service-family",
    scenario: "Content writing family",
    expectedOutcome: "Catalog family tracked; not seeded in V1 harness",
    verification: "manual",
    seeded: false,
    serviceFamily: "content_writing",
  },
  {
    id: "svc-family-marketing_video",
    category: "service-family",
    scenario: "Marketing video family",
    expectedOutcome: "Catalog family tracked; not seeded in V1 harness",
    verification: "manual",
    seeded: false,
    serviceFamily: "marketing_video",
  },
  {
    id: "svc-family-landing_page_content",
    category: "service-family",
    scenario: "Landing page content family",
    expectedOutcome: "Catalog family tracked; not seeded in V1 harness",
    verification: "manual",
    seeded: false,
    serviceFamily: "landing_page_content",
  },
  {
    id: "svc-family-marketing_optimization",
    category: "service-family",
    scenario: "Marketing optimization family",
    expectedOutcome: "Catalog family tracked; not seeded in V1 harness",
    verification: "manual",
    seeded: false,
    serviceFamily: "marketing_optimization",
  },
  // — Customer journey (Discovery → Delivery) —
  {
    id: "journey-discovery-complete",
    category: "journey",
    scenario: "Project Discovery submitted with self-test answers",
    expectedOutcome: "discoveryAnswers + discoverySubmittedAt on campaign record",
    verification: "store",
    seeded: true,
  },
  {
    id: "journey-project-summary",
    category: "journey",
    scenario: "Project Summary — approved Studio Plan with sm-001",
    expectedOutcome: "approvedStudioPlan.selectedServiceIds includes sm-001",
    verification: "store",
    seeded: true,
    serviceId: STUDIO_SELF_TEST_PRIMARY_SERVICE_ID,
  },
  {
    id: "journey-payment-received",
    category: "journey",
    scenario: "Secure Checkout — payment received",
    expectedOutcome: "paymentReceivedAt set on campaign record",
    verification: "store",
    seeded: true,
  },
  {
    id: "journey-project-details",
    category: "journey",
    scenario: "Project Details intake submitted",
    expectedOutcome: "projectDetailsSubmittedAt + projectDetails.form populated",
    verification: "store",
    seeded: true,
  },
  {
    id: "journey-studio-board",
    category: "journey",
    scenario: "Studio Board — BUILDING_CONCEPTS",
    expectedOutcome: "campaignStatus BUILDING_CONCEPTS after intake",
    verification: "store",
    seeded: true,
  },
  {
    id: "journey-review-room",
    category: "journey",
    scenario: "Review Room — READY_FOR_REVIEW",
    expectedOutcome: "Campaign reaches READY_FOR_REVIEW after production + client review",
    verification: "manual",
    seeded: false,
  },
  {
    id: "journey-final-delivery",
    category: "journey",
    scenario: "Final Delivery — DELIVERED",
    expectedOutcome: "campaignStatus DELIVERED; deliverables route shows completed items",
    verification: "manual",
    seeded: false,
  },
  // — Production pipeline —
  {
    id: "pipeline-normal-flow",
    category: "production-pipeline",
    scenario: "Normal flow: Strategy → Copy → Creative → QA → Delivery",
    expectedOutcome: "Each phase completes with QA pass; delivery_prep reachable",
    verification: "manual",
    seeded: false,
    serviceFamily: "social_media",
  },
  {
    id: "pipeline-strategy-complete",
    category: "production-pipeline",
    scenario: "Strategy content direction complete",
    expectedOutcome: "sm-001:strategy_content_direction workflowState complete",
    verification: "store",
    seeded: true,
    serviceFamily: "social_media",
  },
  {
    id: "pipeline-copy-ready-qa",
    category: "production-pipeline",
    scenario: "Copy stage ready for QA",
    expectedOutcome: "sm-001:copy workflowState ready_for_qa",
    verification: "store",
    seeded: true,
    serviceFamily: "social_media",
  },
  {
    id: "pipeline-qa-fail-revision",
    category: "production-pipeline",
    scenario: "QA fail → revision → re-submit",
    expectedOutcome: "Copy task enters needs_revision; new version after fix",
    verification: "manual",
    seeded: false,
    serviceFamily: "social_media",
  },
  // — Materials —
  {
    id: "materials-missing-required",
    category: "materials",
    scenario: "Missing required client materials block production",
    expectedOutcome: "At least one required material reviewStatus missing",
    verification: "store",
    seeded: true,
  },
  {
    id: "materials-client-request-approved",
    category: "materials",
    scenario: "Client material request raised → Owner approval → promoted slot",
    expectedOutcome: "client_request exception waiting_owner; promotion path available",
    verification: "store",
    seeded: true,
  },
  // — Exceptions —
  {
    id: "exc-compliance-hold",
    category: "exceptions",
    scenario: "Compliance hold — waiting on Owner",
    expectedOutcome: "Open compliance_hold exception status waiting_owner",
    verification: "store",
    seeded: true,
  },
  {
    id: "exc-direction-disagreement",
    category: "exceptions",
    scenario: "Direction disagreement",
    expectedOutcome: "Open direction_disagreement exception",
    verification: "store",
    seeded: true,
  },
  {
    id: "exc-scope-change",
    category: "exceptions",
    scenario: "Scope change request",
    expectedOutcome: "Open scope_change exception waiting_owner",
    verification: "store",
    seeded: true,
  },
  {
    id: "exc-deadline-risk",
    category: "exceptions",
    scenario: "Deadline risk flagged",
    expectedOutcome: "Open deadline_risk exception",
    verification: "store",
    seeded: true,
  },
  {
    id: "exc-missing-client-fact",
    category: "exceptions",
    scenario: "Missing client fact — promotable",
    expectedOutcome: "Open missing_client_fact exception",
    verification: "store",
    seeded: true,
  },
  {
    id: "exc-client-request-pending",
    category: "exceptions",
    scenario: "Client request — Owner approval pending",
    expectedOutcome: "Open client_request exception status waiting_owner with draft",
    verification: "store",
    seeded: true,
  },
  // — Owner Console —
  {
    id: "owner-console-aggregate",
    category: "owner-console",
    scenario: "Self-test campaign surfaces in Owner Console scan",
    expectedOutcome: "GET owner console aggregate includes studio-self-test waiting items",
    verification: "api",
    seeded: true,
  },
  {
    id: "owner-console-remote-resolve",
    category: "owner-console",
    scenario: "Remote Owner Console action (approve / resolve / reassign)",
    expectedOutcome: "Owner can assign exception via tasks API without File Room UI",
    verification: "api",
    seeded: false,
  },
  // — Delivery & closeout —
  {
    id: "delivery-deliverables-route",
    category: "delivery",
    scenario: "Final Delivery route shows campaign deliverables",
    expectedOutcome: "/deliverables reflects DELIVERED state and quota usage",
    verification: "manual",
    seeded: false,
  },
  {
    id: "delivery-archive-closeout",
    category: "delivery",
    scenario: "Campaign archive and closeout",
    expectedOutcome: "Completed campaign retained in File Room; journey closed cleanly",
    verification: "manual",
    seeded: false,
  },
] as const;

export function getSelfTestMatrixRow(id: string): SelfTestMatrixRow | undefined {
  return STUDIO_SELF_TEST_MATRIX.find((row) => row.id === id);
}

export const STUDIO_SELF_TEST_MATRIX_ROW_IDS = STUDIO_SELF_TEST_MATRIX.map((row) => row.id);
