/**
 * One-time arrival signal for Project Record: RouteMapScene appends this query param on the
 * post-intake redirect; CampaignDetailsScene shows the arrival message once and strips the
 * param so a refresh or a direct visit never re-triggers it.
 */

export const PROJECT_RECORD_ARRIVAL_PARAM = "arrived";
const PROJECT_RECORD_ARRIVAL_VALUE = "1";

export function projectRecordArrivalHref(baseHref: string): string {
  return `${baseHref}?${PROJECT_RECORD_ARRIVAL_PARAM}=${PROJECT_RECORD_ARRIVAL_VALUE}`;
}

export function shouldShowProjectRecordArrival(
  paramValue: string | null | undefined,
  paymentReceivedAt: string | null | undefined,
): boolean {
  return paramValue === PROJECT_RECORD_ARRIVAL_VALUE && Boolean(paymentReceivedAt);
}
