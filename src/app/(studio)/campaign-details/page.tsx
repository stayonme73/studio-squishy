import { redirect } from "next/navigation";

import "../../studio-customer-last-paint.css";

/** Submitted project facts now open inside Studio Board. */
export default function CampaignDetailsPage() {
  redirect("/studio-board#sb-project-details");
}

