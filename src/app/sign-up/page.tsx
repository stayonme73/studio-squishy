import SignUpScene from "@/components/auth/SignUpScene";
import StudioMobileLoungeShell from "@/components/shared/StudioMobileLoungeShell";
import { safeReturnPath } from "@/lib/auth/safe-return-path";
import { studioBuildManrope } from "@/fonts/studio-build-manrope";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../studio-customer-last-paint.css";

export const metadata = {
  title: "Create Account",
  description:
    "Create a Studio account to open your Board and follow your project.",
};

type SignUpPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

/** Server resolves and allowlists `from` so first markup stays stable. */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const fromParam = firstQueryValue(params.from);
  const returnTo = safeReturnPath(fromParam);

  return (
    <StudioMobileLoungeShell
      className={`${studioBuildManrope.className} ${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col`}
    >
      <SignUpScene returnTo={returnTo} />
    </StudioMobileLoungeShell>
  );
}
