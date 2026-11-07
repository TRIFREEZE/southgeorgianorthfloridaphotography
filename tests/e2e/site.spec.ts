import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/", "/portfolio", "/portfolio/people", "/portfolio/animals", "/portfolio/weddings-events", "/portfolio/brands",
  "/services", "/services/portraits-families", "/services/pets-horses", "/services/weddings-events", "/services/business-branding",
  "/pricing", "/experience", "/about", "/locations", "/journal", "/journal/how-to-prepare-your-horse-for-a-portrait-session",
  "/contact", "/book", "/faq", "/privacy", "/terms", "/accessibility", "/client-gallery", "/book/thanks",
];

test("every public route renders with one h1 and no horizontal overflow", async ({ page }) => {
  for (const r of routes) {
    const res = await page.goto(r);
    expect(res?.status(), r).toBe(200);
    await expect(page.locator("h1"), r).toHaveCount(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${r} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
  }
});

test("unpublished city pages 404 and stay out of the sitemap", async ({ page, request }) => {
  const res = await page.goto("/locations/thomasville-ga");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("wandered off");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/locations/thomasville-ga");
  expect(sitemap).toContain("/services/pets-horses");
});

test("key pages have no serious accessibility violations", async ({ page }) => {
  for (const r of ["/", "/pricing", "/book", "/portfolio", "/contact"]) {
    await page.goto(r);
    await page.waitForTimeout(1800); // let entrance animations finish so contrast is measured at rest
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).exclude("[data-flick-root]").analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`), r).toEqual([]);
  }
});

test("booking wizard submits and lands on the confirmation page", async ({ page }) => {
  await page.goto("/book");
  const wizard = page.locator("form[aria-labelledby=wizard-step-title]");
  await page.locator("form[aria-labelledby=wizard-step-title] label", { hasText: "Pets & horses" }).click();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#wizard-step-title")).toHaveText("What would make this perfect?");
  // Estimate updates live from config.
  await wizard.locator("label", { hasText: "20" }).filter({ hasText: "photos" }).first().click();
  await expect(page.getByLabel("Estimate")).toContainText("$149");
  await wizard.getByRole("button", { name: "One more extra photo" }).click();
  await expect(page.getByLabel("Estimate")).toContainText("$161");
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("City or area").fill("Thomasville, GA");
  await wizard.getByRole("button", { name: "Continue" }).click();
  // Validation: consent and email required.
  await wizard.getByRole("button", { name: "Send my inquiry" }).click();
  await expect(wizard.getByText("Please add your name.")).toBeVisible();
  await wizard.getByLabel("Your name").fill("Test Person");
  await wizard.getByLabel("Email").fill("test@example.com");
  await wizard.getByLabel(/I agree to the/).check();
  await page.waitForTimeout(2600); // the server rejects impossibly fast bots
  await wizard.getByRole("button", { name: "Send my inquiry" }).click();
  await expect(page).toHaveURL(/\/book\/thanks\?ref=RCL-/);
  await expect(page.getByText(/Your reference:/)).toBeVisible();
});

test("quick inquiry validates on the server and inline", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page.getByText("Please add your name.")).toBeVisible();
});

test("API: honeypot and validation behave", async ({ request }) => {
  const ok = { kind: "quick", category: "people", name: "Bot", email: "bot@example.com", message: "hi", consent: true };
  const bad = await request.post("/api/inquiry", { data: { ...ok, email: "nope" } });
  expect(bad.status()).toBe(422);
  const trap = await request.post("/api/inquiry", { data: { ...ok, company_website: "spam.example" } });
  expect(trap.status()).toBe(200); // looks successful to bots, stores nothing
  const cross = await request.post("/api/inquiry", { data: ok, headers: { origin: "https://evil.example" } });
  expect(cross.status()).toBe(403);
});

test("no-JavaScript quick form still posts", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/contact");
  await page.locator("#contact-name").fill("No Script");
  await page.locator("#contact-email").fill("noscript@example.com");
  await page.locator("#contact-message").fill("Testing without JavaScript");
  await page.locator("#contact-consent").check();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page).toHaveURL(/\/book\/thanks/);
  await ctx.close();
});

test("lightbox opens from the portfolio with keyboard navigation and deep link", async ({ page }) => {
  await page.goto("/portfolio");
  await page.getByRole("button", { name: /Open photo/ }).first().click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\?photo=/);
  await page.keyboard.press("ArrowRight");
  await expect(dialog).toContainText("2 /");
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page).not.toHaveURL(/\?photo=/);
});

test("no horizontal overflow at the brief's breakpoints", async ({ page, isMobile }) => {
  test.skip(isMobile, "viewport sweep runs once");
  for (const width of [320, 360, 375, 390, 414, 768, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    for (const r of ["/", "/pricing", "/book", "/portfolio", "/services/pets-horses"]) {
      await page.goto(r);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${r} @ ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(1);
      await expect(page.getByRole("link", { name: /^Book/ }).first(), `${r} @ ${width}px booking CTA`).toBeVisible();
    }
  }
});
