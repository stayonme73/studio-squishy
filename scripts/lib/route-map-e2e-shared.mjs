/**
 * Shared Route Map E2E helpers — payment → intake → Studio Board.
 * Client session is required before Studio Board (proxy auth); Route Map stays public.
 */
export const ROUTE_MAP_E2E_CAMPAIGN_KEY = "studio-squishy:current-campaign";

export const ROUTE_MAP_E2E_CLIENT_LOGIN = {
  email: "client-a@local.dev",
  password: "dev-only",
};

/** Playwright API login — sets studio_session on the browser context. */
export async function loginBrowserContext(context, baseUrl, login = ROUTE_MAP_E2E_CLIENT_LOGIN) {
  const res = await context.request.post(`${baseUrl}/api/auth/login`, { data: login });
  if (!res.ok()) {
    throw new Error(`Login failed for ${login.email}: ${res.status()} ${await res.text()}`);
  }
}

export async function waitForRouteMapIntake(page) {
  await page.waitForSelector(".route-map-intake, .route-map-social-intake", { timeout: 25000 });
}

export function isSocialPostsIntake(scenario) {
  return scenario.id === "v2-rtu-social-posts" || scenario.jobName?.includes("Social Media Posts");
}

export async function readRouteMapIntakeTitle(page) {
  return page.locator("#route-map-intake-title").innerText();
}

export async function fillClassicRouteMapIntake(page, scenario) {
  let fieldIdx = 0;
  const fields = page.locator(".route-map-intake__field");
  const count = await fields.count();

  for (let i = 0; i < count; i += 1) {
    const spec = scenario.intakeFields[fieldIdx];
    if (!spec) break;

    const field = fields.nth(i);
    const select = field.locator("select");
    const textarea = field.locator("textarea");
    const input = field.locator('input[type="text"]');

    if (spec.type === "select" && (await select.count())) {
      await select.selectOption({ label: spec.value });
      fieldIdx += 1;
    } else if (spec.type === "textarea" && (await textarea.count())) {
      await textarea.fill(spec.value);
      fieldIdx += 1;
    } else if (spec.type === "text" && (await input.count())) {
      await input.fill(spec.value);
      fieldIdx += 1;
    }
  }
}

export async function fillSocialPostsRouteMapIntake(page) {
  await page.getByRole("button", { name: /Promote an offer/i }).click();
  await page.getByRole("button", { name: /Visit website/i }).click();
  await page.getByRole("button", { name: /Instagram Post/i }).click();
  await page.getByRole("button", { name: /I do not have these yet/i }).click();
}

export async function fillRouteMapIntake(page, scenario) {
  if (isSocialPostsIntake(scenario)) {
    await fillSocialPostsRouteMapIntake(page);
    return;
  }
  await fillClassicRouteMapIntake(page, scenario);
}

export async function submitRouteMapIntake(page, scenario) {
  if (isSocialPostsIntake(scenario)) {
    await page.getByRole("button", { name: /SAVE & CONTINUE TO YOUR STUDIO BOARD/i }).click();
    return;
  }
  await page.getByRole("button", { name: /Submit intake/i }).click();
}

/** Complete sign-in when proxy redirects anonymous intake submit to /sign-in. */
export async function completeSignInIfRedirected(page, login = ROUTE_MAP_E2E_CLIENT_LOGIN) {
  if (!page.url().includes("/sign-in")) return;
  await page.locator('input[type="email"]').fill(login.email);
  await page.locator('input[type="password"]').fill(login.password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL(/\/studio-board/, { timeout: 25000 });
}

export async function waitForStudioBoardRecord(page, login = ROUTE_MAP_E2E_CLIENT_LOGIN) {
  try {
    await page.waitForURL(/studio-board.*record=open/, { timeout: 8000 });
  } catch {
    await completeSignInIfRedirected(page, login);
    if (!page.url().includes("record=open")) {
      await page.goto(`${new URL(page.url()).origin}/studio-board?record=open`, {
        waitUntil: "networkidle",
      });
    }
  }
  await page.waitForSelector('[data-testid="route-map-client-summary"]', { timeout: 25000 });
}

export async function clickChooseThisJob(page) {
  const button = page.getByRole("button", { name: /choose this job/i });
  await button.scrollIntoViewIfNeeded();
  await button.click();
}

export async function clickTestPayment(page) {
  const terms = page.locator('input[name="terms"]');
  if (await terms.count()) await terms.check();
  const sandbox = page.getByRole("button", { name: /test payment|sandbox/i });
  await sandbox.first().scrollIntoViewIfNeeded();
  await sandbox.first().click();
}

export function intakeTitleMatches(scenario, title) {
  if (isSocialPostsIntake(scenario)) {
    return title.includes("Social Posts") || title.includes("Social Media");
  }
  return title === scenario.intakeTitle;
}
