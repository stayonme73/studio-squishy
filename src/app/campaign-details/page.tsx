import { redirect } from "next/navigation";

/** Campaign Details consolidated into Studio Board Campaign Record drawer. */
export default function CampaignDetailsPage() {
  redirect("/studio-board?record=open");
}
