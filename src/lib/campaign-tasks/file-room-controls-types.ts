import type { ProductionRole } from "./types";

export type FileRoomTaskPermissions = {
  canClaim: boolean;
  canRelease: boolean;
  canSubmitHandoff: boolean;
  canReassign: boolean;
};

export type FileRoomTaskOperator = {
  userId: string;
  capabilities: readonly ProductionRole[];
  canReassign: boolean;
};

export type ReassignCandidate = {
  userId: string;
  displayName: string;
  roles: readonly ProductionRole[];
};

export type FileRoomTaskOperatorContext = {
  canOperate: boolean;
  operator: FileRoomTaskOperator;
  reassignCandidates: readonly ReassignCandidate[];
};
