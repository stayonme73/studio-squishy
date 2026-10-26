/**
 * Browser Review Room for the Harbor & Oak kit customer only.
 * Runs only when STUDIO_CAMPAIGN_LAUNCH_KIT_FINISH=1.
 * Does not request a revision and does not call a model.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";
import { describe, expect, it } from "vitest";

import { findUserById } from "@/lib/auth/users";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { loadStudioLocalEnv } from "@/lib/studio-production-team-workforce/anthropic-runtime";

const OWNER = "local-harbor-oak-kit-disposable";

describe.skipIf(process.env.STUDIO_CAMPAIGN_LAUNCH_KIT_FINISH !== "1")(
  "Campaign Launch Kit browser review",
  () => {
    it(
      "opens the Review Room as the kit customer",
      async () => {
        loadStudioLocalEnv();
        const record = await findUserById(OWNER);
        if (!record) throw new Error("Kit customer was not found.");
        const token = await createSessionToken({
          id: record.id,
          email: record.email,
          displayName: record.displayName,
          roles: record.roles,
          currentCampaignId: record.currentCampaignId,
          clientCampaignIds: record.clientCampaignIds,
          emailVerifiedAt: record.emailVerifiedAt ?? null,
        });
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await page.context().addCookies([
          {
            name: SESSION_COOKIE_NAME,
            value: token,
            url: "http://127.0.0.1:3475",
            httpOnly: true,
            sameSite: "Lax",
          },
        ]);
        await page.goto("http://127.0.0.1:3475/feedback-studio", { waitUntil: "networkidle" });
        const body = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 2500);
        const dir = path.join(process.cwd(), "data", "campaign-launch-kit-finish");
        mkdirSync(dir, { recursive: true });
        await page.screenshot({ path: path.join(dir, "review-room.png"), fullPage: true });
        const evidence = {
          url: page.url(),
          hasCampaignLaunchKit: body.includes("Campaign Launch Kit"),
          hasSocialLabel: body.includes("Social & Promo Graphics"),
          hasRevision: /revision/i.test(body),
          hasReadyForDelivery: /delivery/i.test(body),
          excerpt: body,
        };
        await browser.close();
        expect(evidence.url).toContain("127.0.0.1:3475");
        expect(evidence.excerpt.length).toBeGreaterThan(20);
        console.log(JSON.stringify(evidence));
      },
      90000,
    );
  },
);
