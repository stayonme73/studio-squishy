import DraftRoomIntakeScene from "@/components/draft-room/DraftRoomIntakeScene";
import DraftRoomScene from "@/components/draft-room/DraftRoomScene";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";
import "../draft-room-intake.css";

type Props = {
  searchParams: Promise<{ package?: string; from?: string; begin?: string; edit?: string }>;
};

const PACKAGE_IDS = ["spark", "momentum", "growth"] as const;

function parsePackageId(value?: string): StudioGuidePackageId | undefined {
  if (!value) return undefined;
  return PACKAGE_IDS.includes(value as StudioGuidePackageId)
    ? (value as StudioGuidePackageId)
    : undefined;
}

/** Draft Room — intro plate, or clipboard wizard when ?begin=1. */
export default async function DraftRoomPage({ searchParams }: Props) {
  const { package: packageId, begin, edit } = await searchParams;
  const pkg = parsePackageId(packageId);
  const isWizard = begin === "1";

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden`}
    >
      {isWizard ? (
        <DraftRoomIntakeScene packageId={pkg} editMode={edit === "1"} />
      ) : (
        <DraftRoomScene packageId={pkg} />
      )}
    </main>
  );
}
