import { expect, test } from "@playwright/test";

test.describe("Flick", () => {
  test("appears after load, opens its menu, hides and comes back from the footer", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop interaction test");
    await page.goto("/");
    const flick = page.getByRole("button", { name: /^Flick, the site helper/ });
    await expect(flick).toBeInViewport({ ratio: 0.9, timeout: 12_000 });
    // Breathing animation keeps the element "unstable" for Playwright; open it via keyboard (also proves keyboard access).
    await flick.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("group", { name: "Flick options" })).toBeVisible();
    await page.getByRole("group", { name: "Flick options" }).getByRole("button", { name: /Hide Flick/ }).click();
    await expect(flick).toHaveCount(0);
    await page.getByRole("button", { name: /Show Flick/ }).click();
    await expect(page.getByRole("button", { name: /^Flick, the site helper/ })).toBeVisible({ timeout: 10_000 });
  });

  test("Ask Flick answers from site config and admits what it doesn't know", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop interaction test");
    await page.goto("/pricing");
    const flick = page.getByRole("button", { name: /^Flick, the site helper/ });
    await expect(flick).toBeInViewport({ ratio: 0.9, timeout: 12_000 });
    // Breathing animation keeps the element "unstable" for Playwright; open it via keyboard (also proves keyboard access).
    await flick.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Ask Flick a question" }).click();
    const guide = page.getByRole("dialog", { name: "Ask Flick" });
    await expect(guide).toBeVisible();
    await guide.getByRole("button", { name: "What does it cost?" }).click();
    await expect(guide).toContainText("$149");
    await guide.getByRole("button", { name: "Ask something else" }).click();
    await guide.getByLabel("Ask a question").fill("what is the airspeed of a swallow");
    await guide.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(guide).toContainText("rather not guess");
  });

  test("never sits on content: Flick's spot is free of text, links and form fields", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop placement");
    await page.goto("/book");
    const flick = page.getByRole("button", { name: /^Flick, the site helper/ });
    await expect(flick).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(2500);
    const covered = await flick.evaluate((btn) => {
      const r = btn.getBoundingClientRect();
      const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + r.width * 0.25, r.top + r.height * 0.25], [r.right - r.width * 0.25, r.bottom - r.height * 0.25]];
      const root = document.querySelector("[data-flick-root]")!;
      return pts.some(([x, y]) => {
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
        const under = document.elementsFromPoint(x, y).find((el) => !root.contains(el));
        return Boolean(under?.closest("p,h1,h2,h3,a,button,input,textarea,select,label,img,form,[data-flick-avoid]"));
      });
    });
    expect(covered).toBe(false);
  });

  test("tucks away while the visitor types", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop");
    await page.goto("/contact");
    const flick = page.getByRole("button", { name: /^Flick, the site helper/ });
    await expect(flick).toBeVisible({ timeout: 10_000 });
    await page.locator("#contact-name").click();
    await page.waitForTimeout(1500);
    const visibleWidth = await flick.evaluate((b) => {
      const r = b.getBoundingClientRect();
      return Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
    });
    expect(visibleWidth).toBeLessThan(40);
  });

  test("respects prefers-reduced-motion (no echo trail)", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByRole("button", { name: /^Flick, the site helper/ })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1200);
    const echoes = await page.locator("[data-flick-root] span.rounded-full").count();
    expect(echoes).toBe(0);
    await ctx.close();
  });
});
