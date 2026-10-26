import { describe, expect, it } from "vitest";

import { resolveSignInDestinationTitle } from "@/lib/auth/sign-in-destination-copy";

describe("sign-in destination honesty", () => {
  it("names the requested room without changing return-path rules", () => {
    expect(resolveSignInDestinationTitle("/studio-board")).toBe("Sign in to open Studio Board");
    expect(resolveSignInDestinationTitle("/campaign-details")).toBe(
      "Sign in to open Project Record",
    );
    expect(resolveSignInDestinationTitle("/feedback-studio")).toBe("Sign in to open Review Room");
    expect(resolveSignInDestinationTitle("/review-room")).toBe("Sign in to open Review Room");
    expect(resolveSignInDestinationTitle("/deliverables")).toBe("Sign in to open Final Delivery");
    expect(resolveSignInDestinationTitle("/help-center")).toBe("Sign in to The Studio");
    expect(resolveSignInDestinationTitle("/studio-board?x=1")).toBe("Sign in to open Studio Board");
  });
});
