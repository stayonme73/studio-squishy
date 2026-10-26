import type {
  StudioTeamProducerRoleId,
  StudioTeamRoleId,
} from "@/config/studio-production-team-communication-bridge-v1";

export type SharedJobRevisionState = {
  included: number;
  used: number;
  remaining: number;
};

export type TeamHandoffResult =
  | "ok"
  | "blocked"
  | "rejected"
  | "needs_owner"
  | "stalled"
  | "intentional_stop";

export type TeamHandoff = {
  from: StudioTeamRoleId | "customer";
  received: string;
  did: string;
  result: TeamHandoffResult;
  blocking?: string | null;
};

export type RecordedTeamHandoff = TeamHandoff & {
  nextActor: StudioTeamRoleId | "customer" | null;
  recordedBy: "machine";
  at: string;
};

export type SharedJobTruth = {
  jobId: string;
  company: string;
  project: string;
  skuId: string;
  authorizedFacts: Record<string, string>;
  materialsReceived: boolean;
  materialsMissing: boolean;
  customerPromisedMaterials: boolean;
  rightsStatus: "pass" | "fail" | "waiting" | "ambiguous";
  customerInstructions: string;
  deadlineStatus: string;
  productionAssignment: StudioTeamProducerRoleId | null;
  priorCompletedWork: string[];
  revisionState: SharedJobRevisionState;
  applicableRules: string[];
  currentActor: StudioTeamRoleId | "customer" | null;
  nextExpectedActor: StudioTeamRoleId | "customer" | null;
  blockers: string[];
  ownerDecision: string | null;
  ownerOnDesk: boolean;
  expectedToContinue: boolean;
  intentionalStop: boolean;
  scoutListening: boolean;
  qaPassed: boolean | null;
  reviewReady: boolean;
  customerRevisionConsumedOnInternalFix: boolean;
  handoffs: RecordedTeamHandoff[];
};

export type MachineRouteDecision = {
  truth: SharedJobTruth;
  nextActor: StudioTeamRoleId | "customer" | null;
  ownerEscalation: boolean;
  scoutOnRoutinePath: boolean;
};
