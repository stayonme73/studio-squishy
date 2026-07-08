import { studioBoard } from "@/config/studio-board";

/** Room-specific Access Denied explanations — shared card, one message varies. */
export type AccessControlDeniedRoomId =
  | "customer"
  | "file-room"
  | "owner-console"
  | "production-workspace"
  | "team-offices"
  | "studio-self-test";

export type AccessDeniedCopy = {
  eyebrow: string;
  title: string;
  message: string;
  note?: string;
  primaryCta: string;
  secondaryCta: string;
  primaryHref: string;
  secondaryHref: string;
};

export type NoActiveProjectCopy = {
  eyebrow: string;
  title: string;
  message: string;
  messageSecondary?: string;
  footnote?: string;
  primaryCta: string;
  secondaryCta: string;
  primaryHref: string;
  secondaryHref: string;
};

const { routes } = studioBoard;

export const accessControl = {
  denied: {
    eyebrow: "Access Control",
    title: "Access Denied",
    message: "You don't have permission to access this area or project.",
    note: "If you believe you should have access, contact The Studio through the Help Center.",
    primaryCta: "Studio Board",
    secondaryCta: "Help Center",
    primaryHref: routes.studioBoard,
    secondaryHref: routes.helpCenter,
  },
  deniedByRoom: {
    "file-room": {
      message: "The File Room is available only to authorized Studio team members.",
    },
    "owner-console": {
      message: "The Owner Console is restricted to Studio ownership.",
    },
    "production-workspace": {
      message: "The Production Workspace is reserved for active Studio production.",
    },
    "team-offices": {
      message: "The Team Offices are available only to assigned Studio team members.",
    },
    "studio-self-test": {
      message: "Studio Self-Test is available only during internal testing.",
    },
  },
} as const satisfies {
  denied: AccessDeniedCopy;
  deniedByRoom: Record<
    Exclude<AccessControlDeniedRoomId, "customer">,
    { message: string }
  >;
};

export function resolveAccessDeniedCopy(
  room: AccessControlDeniedRoomId = "customer",
): AccessDeniedCopy {
  if (room === "customer") {
    return accessControl.denied;
  }

  const roomCopy = accessControl.deniedByRoom[room];
  return {
    ...accessControl.denied,
    message: roomCopy.message,
    note: undefined,
  };
}

/** Map protected internal routes to room-specific Access Denied copy. */
export function resolveAccessDeniedRoomFromPath(pathname: string): AccessControlDeniedRoomId {
  if (/\/file-room\/[^/]+\/production\//.test(pathname)) {
    return "production-workspace";
  }
  if (/\/file-room\/[^/]+\/office\//.test(pathname)) {
    return "team-offices";
  }
  if (pathname.startsWith("/file-room/owner-console") || /\/file-room\/[^/]+\/owner-console/.test(pathname)) {
    return "owner-console";
  }
  if (pathname.startsWith("/file-room/studio-self-test")) {
    return "studio-self-test";
  }
  if (pathname.startsWith("/file-room") || pathname.startsWith("/studio-kitchen")) {
    return "file-room";
  }
  if (pathname.startsWith("/decision-learner")) {
    return "studio-self-test";
  }
  return "customer";
}

export function isAccessControlDeniedRoomId(value: string | null | undefined): value is AccessControlDeniedRoomId {
  return (
    value === "customer" ||
    value === "file-room" ||
    value === "owner-console" ||
    value === "production-workspace" ||
    value === "team-offices" ||
    value === "studio-self-test"
  );
}
