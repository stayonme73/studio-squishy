import type { ProductionRole, QaAction } from "./types";

export type FileRoomTaskPermissions = {
  canClaim: boolean;
  canRelease: boolean;
  canSubmitHandoff: boolean;
  canReassign: boolean;
  canQaPass: boolean;
  canQaFail: boolean;
  canQaBlock: boolean;
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

export type FileRoomTaskQaSummary = {
  total: number;
  passes: number;
  fails: number;
  blocks: number;
};

export type FileRoomQaHistoryEntry = {
  id: string;
  action: QaAction;
  actionLabel: string;
  categoryLabel: string | null;
  actorDisplayName: string;
  createdAt: string;
  notesPreview: string | null;
};
