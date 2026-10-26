import { notFound } from "next/navigation";

import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";

import LocalVisualAcceptanceDesk from "@/components/dev/LocalVisualAcceptanceDesk";

export const metadata = {
  title: "Owner visual acceptance",
};

export default function LocalVisualAcceptancePage() {
  if (!isLocalAuthFixtureAvailable()) {
    notFound();
  }

  return <LocalVisualAcceptanceDesk />;
}
