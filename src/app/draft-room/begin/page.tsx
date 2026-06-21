import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ package?: string }>;
};

/** Legacy — redirects to /draft-room?begin=1 */
export default async function DraftRoomBeginPage({ searchParams }: Props) {
  const { package: packageId } = await searchParams;
  const query = packageId ? `?begin=1&package=${packageId}` : "?begin=1";
  redirect(`/draft-room${query}`);
}
