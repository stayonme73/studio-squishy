import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AccountHandoffScene from "@/components/auth/AccountHandoffScene";
import { safeReturnPath } from "@/lib/auth/safe-return-path";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

export const metadata = {
  title: "Open Your Studio Board | The Studio",
  description:
    "Create an account or sign in to open your Studio Board and follow your project.",
};

type AccountHandoffPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

/**
 * Server reads `from` and passes it as a prop so the client scene never needs
 * useSearchParams / Suspense — those were producing Handoff hydration overlays.
 *
 * Signed-in customers redirect to the allowlisted Board return before the
 * account-choice card can paint.
 */
export default async function AccountHandoffPage({ searchParams }: AccountHandoffPageProps) {
  const params = await searchParams;
  const fromParam = firstQueryValue(params.from);
  const returnTo = safeReturnPath(fromParam);

  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (user) {
    redirect(returnTo);
  }

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col`}
    >
      <AccountHandoffScene fromParam={fromParam} />
    </main>
  );
}
