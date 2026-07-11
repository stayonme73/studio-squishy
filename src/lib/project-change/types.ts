import type { ServiceId } from "@/catalog/types";

/** Typed, allowlisted post-payment plan delta — never derived from freeform request text. */
export type ProjectChangeDelta =
  | { kind: "add_service"; serviceId: ServiceId }
  | { kind: "remove_service"; serviceId: ServiceId };

export const PROJECT_CHANGE_DELTA_KINDS = new Set<ProjectChangeDelta["kind"]>([
  "add_service",
  "remove_service",
]);

export function isProjectChangeDeltaKind(value: string): value is ProjectChangeDelta["kind"] {
  return PROJECT_CHANGE_DELTA_KINDS.has(value as ProjectChangeDelta["kind"]);
}

export function parseProjectChangeDelta(value: unknown): ProjectChangeDelta | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const kind = record.kind;
  const serviceId = record.serviceId;
  if (typeof kind !== "string" || !isProjectChangeDeltaKind(kind)) return null;
  if (typeof serviceId !== "string" || !serviceId.trim()) return null;
  return { kind, serviceId: serviceId.trim() as ServiceId };
}

export function projectChangeDeltasMatch(
  left: ProjectChangeDelta,
  right: ProjectChangeDelta,
): boolean {
  return left.kind === right.kind && left.serviceId === right.serviceId;
}
