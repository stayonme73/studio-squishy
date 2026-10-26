import { studioBoard } from "@/config/studio-board";

export type AccountPageIdentity = {
  displayName?: string | null;
  email?: string | null;
};

export type AccountPageView =
  | {
      kind: "signed-out";
      title: "My Account";
      message: string;
      signInHref: string;
      signInLabel: "Sign in";
    }
  | {
      kind: "signed-in";
      title: "My Account";
      message: string;
      name: string | null;
      email: string | null;
      signOutLabel: "Sign out";
    };

const SIGNED_OUT_MESSAGE =
  "Sign in with the account connected to your Studio work.";

const SIGNED_IN_MESSAGE =
  "This is the account you use to open your Studio work.";

/**
 * Customer Account page. Shows the signed-in name and email already on the
 * session. Does not offer editing, verification, password changes, or billing.
 */
export function resolveAccountPageView(
  user: AccountPageIdentity | null,
): AccountPageView {
  const email = user?.email?.trim() || null;
  if (!email) {
    return {
      kind: "signed-out",
      title: "My Account",
      message: SIGNED_OUT_MESSAGE,
      signInHref: `/sign-in?from=${encodeURIComponent(studioBoard.routes.studioBoard)}`,
      signInLabel: "Sign in",
    };
  }

  const name = user?.displayName?.trim() || null;
  return {
    kind: "signed-in",
    title: "My Account",
    message: SIGNED_IN_MESSAGE,
    name,
    email,
    signOutLabel: "Sign out",
  };
}
