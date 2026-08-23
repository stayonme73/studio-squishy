import { describe, expect, it } from "vitest";

import { browserSafeRedirectUrl } from "@/lib/browser-safe-redirect-url";

describe("browserSafeRedirectUrl", () => {
  it("prefers Host header over listen address in request.url", () => {
    const request = new Request("http://0.0.0.0:3000/lobby-entry/begin-new", {
      headers: { host: "localhost:3000" },
    });
    const url = browserSafeRedirectUrl(request, "/");
    expect(url.toString()).toBe("http://localhost:3000/");
  });

  it("rewrites bare 0.0.0.0 to localhost when Host is also unsafe", () => {
    const request = new Request("http://0.0.0.0:3000/lobby-entry/begin-new", {
      headers: { host: "0.0.0.0:3000" },
    });
    const url = browserSafeRedirectUrl(request, "/");
    expect(url.toString()).toBe("http://localhost:3000/");
  });

  it("keeps a real LAN Host so phone preview still works", () => {
    const request = new Request("http://0.0.0.0:3000/lobby-entry/begin-new", {
      headers: { host: "10.1.10.208:3000" },
    });
    const url = browserSafeRedirectUrl(request, "/");
    expect(url.toString()).toBe("http://10.1.10.208:3000/");
  });

  it("preserves caller query on the destination path", () => {
    const request = new Request(
      "http://0.0.0.0:3000/lobby-entry/begin-new?studioPaymentSandbox=1",
      {
        headers: { host: "10.1.10.208:3000" },
      },
    );
    const url = browserSafeRedirectUrl(
      request,
      "/studio-conversation-room?studioPaymentSandbox=1",
    );
    expect(url.toString()).toBe(
      "http://10.1.10.208:3000/studio-conversation-room?studioPaymentSandbox=1",
    );
  });

  it("does not copy incoming request query onto a path without query", () => {
    const request = new Request("http://localhost:3000/lobby-entry/begin-new?evil=1", {
      headers: { host: "localhost:3000" },
    });
    const url = browserSafeRedirectUrl(request, "/");
    expect(url.toString()).toBe("http://localhost:3000/");
  });

  it("honors x-forwarded-proto + x-forwarded-host", () => {
    const request = new Request("http://0.0.0.0:3000/lobby-entry/begin-new", {
      headers: {
        host: "0.0.0.0:3000",
        "x-forwarded-host": "studio.example",
        "x-forwarded-proto": "https",
      },
    });
    const url = browserSafeRedirectUrl(request, "/");
    expect(url.toString()).toBe("https://studio.example/");
  });
});
