import { redirect } from "next/navigation";

import { projectDiscoveryHref } from "@/config/customer-journey-v1";

type Props = {
  searchParams: Promise<{ package?: string }>;
};

/** Legacy — redirects to Project Discovery (package preserved). */
export default async function DraftRoomBeginPage({ searchParams }: Props) {
  const { package: packageId } = await searchParams;
  redirect(projectDiscoveryHref(packageId));
}
