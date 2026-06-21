import StudioScene from "@/components/studio/StudioScene";

export const metadata = {
  title: "Studio",
};

/**
 * Studio environment — immersive warm industrial workspace (Step 2 revised).
 * Squishy and host greeting deferred until environment is approved.
 */
export default function StudioPage() {
  return (
    <main className="flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden">
      <StudioScene />
    </main>
  );
}
