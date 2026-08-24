import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "fs";
import path from "path";

import { POST as loginPOST } from "@/app/api/auth/login/route";
import {
  OWNER_CERT_STAFF_EMAIL,
  OWNER_CERT_STAFF_ID,
  PRODUCTION_CUSTOMER_IDENTITY_LIMIT,
  isProductionRuntime,
  ownerCertStaffRecord,
  seedHasPlaintextPasswordFields,
  setVitestProductionIdentity,
} from "@/lib/auth/production-staff-identity";
import { isPasswordHash } from "@/lib/auth/password-hash";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  readSessionFromCookieHeader,
} from "@/lib/auth/session";
import {
  createClientAccount,
  findUserById,
  productionUserFileIoCount,
  verifyLogin,
} from "@/lib/auth/users";
import seedUsers from "@/lib/auth/studio-users.seed.json";

const FIXTURE_PATH = path.join(process.cwd(), ".studio-owner-cert.local.json");

type OwnerCertFixture = {
  email: string;
  password: string;
};

function loadOwnerCertFixture(): OwnerCertFixture {
  expect(
    existsSync(FIXTURE_PATH),
    "ignored Owner cert fixture is required for this proof",
  ).toBe(true);
  const parsed = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as OwnerCertFixture;
  expect(parsed.email).toBe(OWNER_CERT_STAFF_EMAIL);
  expect(typeof parsed.password).toBe("string");
  expect(parsed.password.length).toBeGreaterThanOrEqual(8);
  expect(parsed.password).not.toBe("dev-only");
  return parsed;
}

function stubProductionIdentity(): void {
  setVitestProductionIdentity(true);
}

describe("production Owner staff identity", () => {
  afterEach(() => {
    setVitestProductionIdentity(false);
    vi.unstubAllEnvs();
  });

  it("treats Netlify production as the in-memory staff path", () => {
    expect(isProductionRuntime({ NODE_ENV: "production" })).toBe(true);
    expect(
      isProductionRuntime({ NODE_ENV: "production", VITEST: "true" }),
    ).toBe(false);
    setVitestProductionIdentity(true);
    expect(
      isProductionRuntime({ NODE_ENV: "test", VITEST: "true" }),
    ).toBe(true);
  });

  it("keeps plaintext passwords out of the committed seed", () => {
    expect(seedHasPlaintextPasswordFields()).toBe(false);
    for (const user of seedUsers as Array<{ password?: string }>) {
      expect(user.password).toBeUndefined();
    }
  });

  it("stores only a scrypt hash on the Owner staff record", () => {
    const owner = ownerCertStaffRecord();
    expect(owner).not.toBeNull();
    expect(owner?.id).toBe(OWNER_CERT_STAFF_ID);
    expect(owner?.password).toBeUndefined();
    expect(owner?.passwordHash && isPasswordHash(owner.passwordHash)).toBe(true);
  });

  it("rejects the publicly known Git-history seed password in production", async () => {
    stubProductionIdentity();
    const user = await verifyLogin(OWNER_CERT_STAFF_EMAIL, "dev-only");
    expect(user).toBeNull();
  });

  it("performs production staff login with no studio-users.json filesystem write", async () => {
    stubProductionIdentity();
    vi.stubEnv("SESSION_SECRET", "production-owner-auth-cert-session");
    const fixture = loadOwnerCertFixture();
    const ioBefore = productionUserFileIoCount();

    const user = await verifyLogin(fixture.email, fixture.password);
    expect(user?.id).toBe(OWNER_CERT_STAFF_ID);
    expect(user?.roles).toContain("owner");
    expect(productionUserFileIoCount()).toBe(ioBefore);
  });

  it("authenticates the committed Owner hash from the ignored cert fixture", async () => {
    stubProductionIdentity();
    const fixture = loadOwnerCertFixture();
    const user = await verifyLogin(fixture.email, fixture.password);
    expect(user?.id).toBe(OWNER_CERT_STAFF_ID);
    expect(user?.email).toBe(OWNER_CERT_STAFF_EMAIL);
  });

  it("returns 401 Invalid credentials for the wrong password", async () => {
    stubProductionIdentity();
    vi.stubEnv("SESSION_SECRET", "production-owner-auth-cert-session");
    const response = await loginPOST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: OWNER_CERT_STAFF_EMAIL,
          password: "wrong-password-not-the-cert-secret",
        }),
      }),
    );
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe("Invalid credentials");
  });

  it("validates a production staff session from bundled staff without reading studio-users.json", async () => {
    stubProductionIdentity();
    vi.stubEnv("SESSION_SECRET", "production-owner-auth-cert-session");
    const fixture = loadOwnerCertFixture();
    const ioBefore = productionUserFileIoCount();
    const user = await verifyLogin(fixture.email, fixture.password);
    expect(user).not.toBeNull();
    const token = await createSessionToken(user!);

    const restored = await findUserById(OWNER_CERT_STAFF_ID);
    expect(restored?.id).toBe(OWNER_CERT_STAFF_ID);
    const fromCookie = await readSessionFromCookieHeader(
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    );
    expect(fromCookie?.id).toBe(OWNER_CERT_STAFF_ID);
    expect(fromCookie?.roles).toContain("owner");
    expect(productionUserFileIoCount()).toBe(ioBefore);
  });

  it("fail-closes production customer signup and does not claim durable customer identity", async () => {
    stubProductionIdentity();
    const ioBefore = productionUserFileIoCount();
    const result = await createClientAccount({
      email: "customer-cert@example.com",
      password: "secure-pass-99",
      displayName: "Cert Customer",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("durable_identity_unavailable");
    expect(result.message).toBe(PRODUCTION_CUSTOMER_IDENTITY_LIMIT);
    expect(productionUserFileIoCount()).toBe(ioBefore);
  });
});
