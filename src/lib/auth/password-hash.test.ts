import { describe, expect, it } from "vitest";

import {
  hashPassword,
  isPasswordHash,
  validateNewPassword,
  verifyPassword,
} from "@/lib/auth/password-hash";

describe("password-hash", () => {
  it("hashes and verifies with scrypt encoding", async () => {
    const hash = await hashPassword("correct-horse-battery");
    expect(isPasswordHash(hash)).toBe(true);
    expect(await verifyPassword("correct-horse-battery", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("rejects invalid stored encodings", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "scrypt$bad")).toBe(false);
  });

  it("validates new password length", () => {
    expect(validateNewPassword("short")).toMatch(/at least/i);
    expect(validateNewPassword("a".repeat(200))).toMatch(/at most/i);
    expect(validateNewPassword("long-enough-password")).toBeNull();
  });
});
