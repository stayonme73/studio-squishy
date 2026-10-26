import SignInScene from "@/components/auth/SignInScene";
import { studioBuildManrope } from "@/fonts/studio-build-manrope";
import StudioMobileLoungeShell from "@/components/shared/StudioMobileLoungeShell";
import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import {
  isExplicitStudioBoardFrom,
  safeReturnPath,
} from "@/lib/auth/safe-return-path";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../studio-customer-last-paint.css";

export const metadata = {
  title: "Client Sign In",
};

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

/**
 * Server resolves and allowlists `from` so first markup never depends on
 * useSearchParams. Mobile lounge backdrop is spine-scoped; desktop tokens stay.
 */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const fromParam = firstQueryValue(params.from);
  const returnTo = safeReturnPath(fromParam);
  const showProjectCreatedLead = isExplicitStudioBoardFrom(fromParam);

  return (
    <StudioMobileLoungeShell
      className={`${studioBuildManrope.className} ${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col`}
    >
      <SignInScene
        returnTo={returnTo}
        showProjectCreatedLead={showProjectCreatedLead}
        showLocalAuthFixture={isLocalAuthFixtureAvailable()}
      />
    </StudioMobileLoungeShell>
  );
}
