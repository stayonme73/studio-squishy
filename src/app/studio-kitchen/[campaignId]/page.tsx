import StudioKitchenDetailScene from "@/components/studio-kitchen/StudioKitchenDetailScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../../mobile-route-fixes.css";

type Props = {
  params: Promise<{ campaignId: string }>;
};

/** Studio Kitchen V2 — campaign detail workflow. */
export default async function StudioKitchenCampaignPage({ params }: Props) {
  const { campaignId } = await params;

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <StudioKitchenDetailScene campaignId={campaignId} />
    </main>
  );
}
