import type { CampaignExceptionStatus } from "./exceptions-types";

export const TERMINAL_EXCEPTION_STATUSES: readonly CampaignExceptionStatus[] = [
  "resolved",
  "cancelled",
] as const;

export function isOpenExceptionStatus(status: CampaignExceptionStatus): boolean {
  return !TERMINAL_EXCEPTION_STATUSES.includes(status);
}
