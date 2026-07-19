import os from "node:os";

import { customerJourneyV1 } from "@/config/customer-journey-v1";

const VIRTUAL_IFACE =
  /virtual|vethernet|hyper-v|docker|wsl|vpn|loopback|bluetooth|vmware|vbox/i;

/** Prefer private LAN addresses phones can reach; skip link-local and virtual NICs. */
export function pickLanIPv4(
  interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces(),
): string | null {
  type Candidate = { address: string; score: number };
  const candidates: Candidate[] = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs || VIRTUAL_IFACE.test(name)) continue;
    for (const addr of addrs as os.NetworkInterfaceInfo[]) {
      const family = String(addr.family);
      if ((family !== "IPv4" && family !== "4") || addr.internal) continue;
      if (addr.address.startsWith("169.254.")) continue;

      let score = 0;
      if (addr.address.startsWith("192.168.")) score += 30;
      else if (addr.address.startsWith("10.")) score += 28;
      else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(addr.address)) score += 26;
      else continue;

      if (/wi-?fi|wlan|wireless|ethernet|eth|en\d|local area/i.test(name)) score += 10;
      candidates.push({ address: addr.address, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.address ?? null;
}

export function resolveDevPreviewPort(hostHeader: string | null): string {
  if (!hostHeader) return "3000";
  const host = hostHeader.split(",")[0]?.trim() ?? "";
  const match = host.match(/:(\d+)$/);
  return match?.[1] ?? "3000";
}

/** QR must open the real page — never the Studio Review sheet overlay. */
export function stripStudioReviewSearch(search: string): string {
  if (!search || search === "?") return "";
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  params.delete("studioReview");
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function buildDevDevicePreviewUrl(input: {
  lanAddress: string | null;
  port: string;
  pathname: string;
  search: string;
}): { url: string; usedLan: boolean; note: string | null } {
  const path = input.pathname.startsWith("/") ? input.pathname : `/${input.pathname}`;
  const search = stripStudioReviewSearch(
    !input.search || input.search === "?"
      ? ""
      : input.search.startsWith("?")
        ? input.search
        : `?${input.search}`,
  );

  if (input.lanAddress) {
    return {
      url: `http://${input.lanAddress}:${input.port}${path}${search}`,
      usedLan: true,
      note: null,
    };
  }

  return {
    url: `http://localhost:${input.port}${path}${search}`,
    usedLan: false,
    note: "No LAN IP detected. A phone on another device cannot open localhost — connect both to the same Wi‑Fi and retry, or check that this machine has a private network address.",
  };
}

/** Map the current path to a customer-facing Studio page name when known. */
export function ownerQaPageLabelForPath(pathname: string): string {
  const path = pathname.split("?")[0] || "/";
  for (const step of customerJourneyV1.steps) {
    if (step.route === path) return step.name;
    if (step.routeAliases?.includes(path as never)) return step.name;
  }
  if (path === "/") return "Studio Lobby";
  return "Current page";
}
