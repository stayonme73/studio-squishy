import BusinessDiscoveryStudioScene from "@/components/business-discovery-studio/BusinessDiscoveryStudioScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";
import "../mobile-route-fixes.css";
import "../business-discovery-studio.css";

type Props = {
  searchParams: Promise<{ debug?: string }>;
};

/** Project Discovery — drafting-table discovery workspace. */
export default async function BusinessDiscoveryStudioPage({ searchParams }: Props) {
  const { debug } = await searchParams;
  const showDebug = debug === "1";

  return (
    <main
      className={`${utilityPageFontClassName} business-discovery-studio journey-shell flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden`}
    >
      <BusinessDiscoveryStudioScene debug={showDebug} />
    </main>
  );
}
