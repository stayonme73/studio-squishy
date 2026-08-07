import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import StudioKitchenLiveDetailScene from "@/components/studio-kitchen/StudioKitchenLiveDetailScene";
import { isStaffOrOwner } from "@/lib/auth/roles";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import {
  isKitchenFixtureDemoRequested,
  loadKitchenProjectionDetail,
} from "@/lib/studio-kitchen";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../../mobile-route-fixes.css";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ demo?: string }>;
};

/** Studio Kitchen Foundation — staff-only campaign detail from live projection. */
export default async function StudioKitchenCampaignPage({ params, searchParams }: Props) {
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user || !isStaffOrOwner(user)) {
    notFound();
  }

  const { campaignId } = await params;
  const queryParams = await searchParams;
  const query = new URLSearchParams();
  if (queryParams.demo) query.set("demo", queryParams.demo);

  const detail = await loadKitchenProjectionDetail(user, campaignId, {
    fixtureDemoRequested: isKitchenFixtureDemoRequested(query),
  });

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <StudioKitchenLiveDetailScene detail={detail} />
    </main>
  );
}
