import { redirect } from "next/navigation";

import { studioBoard } from "@/config/studio-board";
import { parsePaymentPackageId } from "@/config/payment";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy route — Studio Guide lives on the board nav at /studio-guide-prototype. */
export default async function StudioGuidePage({ searchParams }: Props) {
  const params = await searchParams;
  const packageId = parsePaymentPackageId(params);
  const href = packageId
    ? `${studioBoard.routes.studioGuide}?package=${packageId}`
    : studioBoard.routes.studioGuide;

  redirect(href);
}
