/**
 * Names the room the customer asked to open.
 * Does not change allowlisted return paths or auth gates.
 */
export function resolveSignInDestinationTitle(returnTo: string): string {
  const [pathname] = returnTo.split("?");
  if (pathname === "/studio-board") return "Sign in to open Studio Board";
  if (pathname === "/campaign-details") return "Sign in to open Project Record";
  if (pathname === "/feedback-studio" || pathname === "/review-room") {
    return "Sign in to open Review Room";
  }
  if (pathname === "/deliverables") return "Sign in to open Final Delivery";
  return "Sign in to The Studio";
}
