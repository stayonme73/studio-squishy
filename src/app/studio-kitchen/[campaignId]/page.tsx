import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import StudioKitchenDetailScene from "@/components/studio-kitchen/StudioKitchenDetailScene";
import { isStaffOrOwner } from "@/lib/auth/roles";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../../mobile-route-fixes.css";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ campaignId: string }>;
};

/** Studio Kitchen V2 — campaign detail workflow (staff-only). */
export default async function StudioKitchenCampaignPage({ params }: Props) {
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user || !isStaffOrOwner(user)) {
    notFound();
  }

  const { campaignId } = await params;

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <StudioKitchenDetailScene campaignId={campaignId} />
    </main>
  );
}
