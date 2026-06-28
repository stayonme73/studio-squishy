"use client";

import { usePathname } from "next/navigation";

import OwnerQaPanel from "@/components/dev/OwnerQaPanel";

/** Client-facing routes where Studio Review must not cover content (including dev screenshots). */
const HIDDEN_ROUTE_PREFIXES = ["/project-details", "/studio-board"];

function isHiddenClientRoute(pathname: string): boolean {
  return HIDDEN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Owner QA nav — local development only; hidden on customer Project Details + Studio Board. */
export default function OwnerQaRoot() {
  const pathname = usePathname();

  if (process.env.NODE_ENV !== "development") return null;
  if (isHiddenClientRoute(pathname)) return null;

  return <OwnerQaPanel />;
}
