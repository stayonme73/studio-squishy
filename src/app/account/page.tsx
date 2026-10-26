import { cookies } from "next/headers";
import Link from "next/link";

import ClientAccessGlass from "@/components/auth/ClientAccessGlass";
import AccountSignOutButton from "@/components/auth/AccountSignOutButton";
import StudioMobileLoungeShell from "@/components/shared/StudioMobileLoungeShell";
import { studioBuildManrope } from "@/fonts/studio-build-manrope";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import { studioBoard } from "@/config/studio-board";
import { resolveAccountPageView } from "@/lib/auth/account-page-view";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../studio-customer-last-paint.css";

export const metadata = {
  title: "My Account",
  description: "The account you use to open your Studio work.",
};

export default async function AccountPage() {
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  const view = resolveAccountPageView(
    user ? { displayName: user.displayName, email: user.email } : null,
  );

  return (
    <StudioMobileLoungeShell
      className={`${studioBuildManrope.className} ${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col`}
    >
      <div className="utility-page utility-page--client-access">
        <ClientAccessGlass />
        <UtilityPageHeader
          backHref={studioBoard.routes.studioBoard}
          backLabel="← Back to Studio Board"
          activeNav="account"
          title={view.title}
          lead={view.message}
        />
        <div className="utility-shell utility-shell--narrow">
          <section className="utility-card" aria-labelledby="account-title">
            {view.kind === "signed-in" ? (
              <>
                {view.name ? (
                  <>
                    <p className="utility-eyebrow">Name</p>
                    <p className="utility-lead">{view.name}</p>
                  </>
                ) : null}
                <p className="utility-eyebrow">Email</p>
                <p className="utility-lead">{view.email}</p>
                <div className="utility-form">
                  <AccountSignOutButton />
                </div>
              </>
            ) : (
              <Link href={view.signInHref} className="utility-btn utility-btn--primary">
                {view.signInLabel}
              </Link>
            )}
          </section>
        </div>
      </div>
    </StudioMobileLoungeShell>
  );
}
