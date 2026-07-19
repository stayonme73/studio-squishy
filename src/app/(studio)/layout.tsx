/**
 * Studio shell — Slice 1: route-group scaffolding only.
 * Owns nothing yet. Identity, Squishy, context, and navigation land in later slices.
 */
export default function StudioShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
