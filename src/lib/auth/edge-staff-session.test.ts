import { afterEach, describe, expect, it, vi } from "vitest";
import fs, { promises as fsPromises, readFileSync } from "fs";
import path from "path";

import * as bundledIdentity from "@/lib/auth/bundled-staff-identity";
import {
  OWNER_CERT_STAFF_EMAIL,
  OWNER_CERT_STAFF_ID,
  findBundledStaffById,
  toPublicStaffUser,
} from "@/lib/auth/bundled-staff-identity";
import {
  isFilesystemIdentityUnsafeRuntime,
  readEdgeSafeSessionFromCookieHeader,
} from "@/lib/auth/edge-staff-session";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
} from "@/lib/auth/session-cookie";
import { handleProtectedRoutes } from "../../proxy";
import type { StudioUser } from "@/lib/campaign-store/types";

const SRC_ROOT = path.join(process.cwd(), "src");
const REPO_ROOT = process.cwd();

function makeNextRequest(pathname: string, cookieHeader?: string) {
  const url = new URL(pathname, "http://127.0.0.1:3000");
  const headers = new Headers();
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return {
    url: url.toString(),
    nextUrl: url,
    headers: {
      get(name: string) {
        return headers.get(name);
      },
    },
  } as Parameters<typeof handleProtectedRoutes>[0];
}

async function cookieFor(user: StudioUser): Promise<string> {
  const token = await createSessionToken(user);
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

function resolveLocalSpecifier(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith("@/")) {
    return path.join(SRC_ROOT, specifier.slice(2));
  }
  if (specifier.startsWith(".")) {
    return path.resolve(path.dirname(fromFile), specifier);
  }
  return null;
}

function withTsExtension(file: string): string | null {
  if (file.endsWith(".json")) return file;
  const candidates = [
    file,
    `${file}.ts`,
    `${file}.tsx`,
    path.join(file, "index.ts"),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate, "utf8");
      return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

function collectLocalModuleGraph(entry: string): string[] {
  const queue = [path.resolve(entry)];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    if (current.endsWith(".json")) continue;
    const source = readFileSync(current, "utf8");
    const importRe = /from\s+["']([^"']+)["']/g;
    let match: RegExpExecArray | null;
    while ((match = importRe.exec(source))) {
      const resolved = resolveLocalSpecifier(current, match[1]);
      if (!resolved) continue;
      const withExt = withTsExtension(resolved);
      if (withExt) queue.push(withExt);
    }
  }
  return [...seen];
}

function ownerPublicUser(): StudioUser {
  const record = findBundledStaffById(OWNER_CERT_STAFF_ID);
  expect(record).not.toBeNull();
  return toPublicStaffUser(record!);
}

describe("Edge-safe Owner session gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = "test";
    }
  });

  it("does not import the JSON user repository or Node filesystem from proxy", () => {
    const proxySource = readFileSync(path.join(REPO_ROOT, "proxy.ts"), "utf8");
    const srcProxySource = readFileSync(path.join(SRC_ROOT, "proxy.ts"), "utf8");
    expect(proxySource).toMatch(/from ["']@\/lib\/auth\/edge-staff-session["']/);
    expect(proxySource).not.toMatch(/from ["']@\/lib\/auth\/session["']/);
    expect(proxySource).not.toMatch(/from ["']@\/lib\/auth\/users["']/);
    expect(srcProxySource).not.toMatch(/from ["']@\/lib\/auth\/session["']/);
    expect(srcProxySource).not.toMatch(/from ["']@\/lib\/auth\/users["']/);
    expect(proxySource).toContain("readEdgeSafeSessionFromCookieHeader");

    const files = collectLocalModuleGraph(
      path.join(SRC_ROOT, "lib", "auth", "edge-staff-session.ts"),
    );
    expect(files.some((file) => file.endsWith(`${path.sep}users.ts`))).toBe(false);
    expect(files.some((file) => file.endsWith(`${path.sep}session.ts`))).toBe(false);
    for (const file of files) {
      if (file.endsWith(".json")) continue;
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/from ["']fs["']/);
      expect(source).not.toMatch(/from ["']node:fs["']/);
      expect(source).not.toMatch(/require\(["']fs["']\)/);
    }
  });

  it("treats Deno/Netlify as filesystem-unsafe even when NODE_ENV is absent", () => {
    expect(
      isFilesystemIdentityUnsafeRuntime({
        env: { NETLIFY: "true" },
        cwd: "/platform",
      }),
    ).toBe(true);
    expect(
      isFilesystemIdentityUnsafeRuntime({
        env: { NEXT_RUNTIME: "edge" },
        globalRef: { EdgeRuntime: "edge" } as unknown as typeof globalThis,
      }),
    ).toBe(true);
    expect(
      isFilesystemIdentityUnsafeRuntime({
        env: { NODE_ENV: "development" },
        globalRef: { Deno: {} } as unknown as typeof globalThis,
      }),
    ).toBe(true);
    expect(
      isFilesystemIdentityUnsafeRuntime({
        env: { NODE_ENV: "development" },
        cwd: "C:\\Users\\tagia\\studio",
      }),
    ).toBe(false);
  });

  it("validates a bundled Owner session on a Deno-like runtime with NODE_ENV absent and no file IO", async () => {
    delete process.env.NODE_ENV;
    vi.stubEnv("NETLIFY", "true");
    vi.stubGlobal("Deno", { version: { deno: "2.0.0" } });
    vi.stubEnv("SESSION_SECRET", "edge-owner-session-proof-secret");
    expect(process.env.NODE_ENV).toBeUndefined();

    const mkdirAsync = vi.spyOn(fsPromises, "mkdir");
    const writeAsync = vi.spyOn(fsPromises, "writeFile");
    const readAsync = vi.spyOn(fsPromises, "readFile");
    const mkdirSyncSpy = vi.spyOn(fs, "mkdirSync");
    const writeSyncSpy = vi.spyOn(fs, "writeFileSync");

    const cookie = await cookieFor(ownerPublicUser());
    const restored = await readEdgeSafeSessionFromCookieHeader(cookie);
    expect(restored?.id).toBe(OWNER_CERT_STAFF_ID);
    expect(restored?.email).toBe(OWNER_CERT_STAFF_EMAIL);
    expect(restored?.roles).toContain("owner");

    const board = await handleProtectedRoutes(makeNextRequest("/studio-board", cookie));
    expect(board.status).toBe(200);
    const command = await handleProtectedRoutes(
      makeNextRequest("/file-room/incident-command", cookie),
    );
    expect(command.status).toBe(200);

    expect(mkdirAsync).not.toHaveBeenCalled();
    expect(writeAsync).not.toHaveBeenCalled();
    expect(readAsync).not.toHaveBeenCalled();
    expect(mkdirSyncSpy).not.toHaveBeenCalled();
    expect(writeSyncSpy).not.toHaveBeenCalled();
  });

  it("fail-closes unknown and customer identities", async () => {
    delete process.env.NODE_ENV;
    vi.stubEnv("SESSION_SECRET", "edge-owner-session-proof-secret");
    const unknownCookie = await cookieFor({
      id: "customer-unknown",
      email: "customer-unknown@example.com",
      displayName: "Unknown Customer",
      roles: ["client"],
    });
    expect(await readEdgeSafeSessionFromCookieHeader(unknownCookie)).toBeNull();

    const seedCustomerCookie = await cookieFor({
      id: "client-a",
      email: "client-a@local.dev",
      displayName: "Client A",
      roles: ["client"],
    });
    expect(await readEdgeSafeSessionFromCookieHeader(seedCustomerCookie)).toBeNull();

    const response = await handleProtectedRoutes(
      makeNextRequest("/file-room/incident-command", unknownCookie),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/sign-in");
  });

  it("fail-closes invalid and tampered cookies", async () => {
    delete process.env.NODE_ENV;
    vi.stubEnv("SESSION_SECRET", "edge-owner-session-proof-secret");
    const cookie = await cookieFor(ownerPublicUser());
    const tampered = cookie.replace(/.$/, cookie.endsWith("a") ? "b" : "a");
    expect(await readEdgeSafeSessionFromCookieHeader(tampered)).toBeNull();
    expect(await readEdgeSafeSessionFromCookieHeader(`${SESSION_COOKIE_NAME}=not-a-token`)).toBeNull();
    expect(await readEdgeSafeSessionFromCookieHeader(null)).toBeNull();

    const response = await handleProtectedRoutes(
      makeNextRequest("/studio-board", tampered),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/sign-in");
  });

  it("applies bundled password-change invalidation without a writable store", async () => {
    vi.stubEnv("SESSION_SECRET", "edge-owner-session-proof-secret");
    const owner = findBundledStaffById(OWNER_CERT_STAFF_ID)!;
    const cookie = await cookieFor(toPublicStaffUser(owner));
    vi.spyOn(bundledIdentity, "findBundledStaffById").mockReturnValue({
      ...owner,
      passwordChangedAtMs: Date.now(),
    });
    expect(await readEdgeSafeSessionFromCookieHeader(cookie)).toBeNull();
  });
});
