import StudioGuidePlateScene from "@/components/studio-guide-prototype/StudioGuidePlateScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";
import "../studio-guide-prototype.css";

type Props = {
  searchParams: Promise<{ debug?: string }>;
};

/** Studio Guide interaction prototype — no payment or intake. */
export default async function StudioGuidePrototypePage({ searchParams }: Props) {
  const { debug } = await searchParams;
  const showDebug = debug === "1";

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden`}
    >
      <StudioGuidePlateScene debug={showDebug} />
    </main>
  );
}
