import { redirect } from "next/navigation";

import { projectDiscoveryHref } from "@/config/customer-journey-v1";

type Props = {
  searchParams: Promise<{ package?: string }>;
};

/** Legacy route — redirects to Project Discovery. */
export default async function IntakePage({ searchParams }: Props) {
  const { package: packageId } = await searchParams;
  redirect(projectDiscoveryHref(packageId));
}
