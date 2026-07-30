import { redirect } from "next/navigation";

import { buildDeliverablesCompatibilityRedirectPath } from "@/lib/c8d-unified-room-state";

type DeliverablesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * C8d — legacy Final Delivery path enters the unified room Delivery state.
 * Canonical room route remains `/feedback-studio`.
 */
export default async function DeliverablesPage({ searchParams }: DeliverablesPageProps) {
  const params = await searchParams;
  redirect(buildDeliverablesCompatibilityRedirectPath(params));
}
