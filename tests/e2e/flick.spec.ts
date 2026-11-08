import { expect, test, type Page } from "@playwright/test";

const flickButton = (page: Page) => page.getByRole("button", { name: /^Flick, the site helper/ });
const skipIntro = (page: Page) => page.addInitScript(() => window.localStorage.setItem("rcl:flick:introduced", "1"));

test.describe("Flick", () => {
  test("introduces himself on a first visit, explains how to ask and mute, and only once", async ({ page }) => {
    await page.goto("/");
    const intro = page.getByRole("dialog", { name: "Hi! I'm Flick." });
    await expect(intro).toBeVisible({ timeout: 12_000 });
    await expect(intro).toContainText("Tap me anytime");
    await expect(intro).toContainText("Quiet please");
    await expect(intro).toBeInViewport();
    await intro.getByRole("button", { name: "Got it" }).click();
    await expect(intro).toHaveCount(0);
    await page.reload();
    await expect(flickButton(page)).toBeVisible({ timeout: 12_000 });
    await page.waitForTimeout(2500);
    await expect(page.getByRole("dialog", { name: "Hi! I'm Flick." })).toHaveCount(0);
  });

  test("is big and visible in the corner when idle, on desktop and phones", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/pricing");
    const flick = flickButton(page);
    await expect(flick).toBeInViewport({ ratio: 0.95, timeout: 12_000 });
    const box = (await flick.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(90);
    const vp = page.viewportSize()!;
    expect(box.x + box.width).toBeGreaterThan(vp.width * 0.7);
    expect(box.y + box.height).toBeGreaterThan(vp.height * 0.7);
  });

  test("stays in his corner: only up and down his own side on desktop, fully still on phones", async ({ page, isMobile }) => {
    await skipIntro(page);
    await page.goto("/");
    const flick = flickButton(page);
    await expect(flick).toBeInViewport({ ratio: 0.95, timeout: 12_000 });
    await page.waitForTimeout(1500);
    const vp = page.viewportSize()!;
    const samples: { x: number; y: number }[] = [];
    for (let i = 0; i < 28; i++) {
      const b = (await flick.boundingBox())!;
      samples.push({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
      await page.waitForTimeout(500);
    }
    const xs = samples.map((s) => s.x);
    const ys = samples.map((s) => s.y);
    expect(Math.min(...xs)).toBeGreaterThan(vp.width * 0.75);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(isMobile ? 6 : 30);
    if (isMobile) expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(24); // idle float only
  });

  test("menu: hide and bring back from the footer", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop interaction test");
    await skipIntro(page);
    await page.goto("/");
    const flick = flickButton(page);
    await expect(flick).toBeInViewport({ ratio: 0.9, timeout: 12_000 });
    // The hover animation keeps the element "unstable" for Playwright; open via keyboard (also proves keyboard access).
    await flick.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("group", { name: "Flick options" })).toBeVisible();
    await page.getByRole("group", { name: "Flick options" }).getByRole("button", { name: /Hide Flick/ }).click();
    await expect(flick).toHaveCount(0);
    await page.getByRole("button", { name: /Show Flick/ }).click();
    await expect(flickButton(page)).toBeVisible({ timeout: 12_000 });
  });

  test("Ask Flick answers from site config and admits what it doesn't know", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop interaction test");
    await skipIntro(page);
    await page.goto("/pricing");
    const flick = flickButton(page);
    await expect(flick).toBeInViewport({ ratio: 0.9, timeout: 12_000 });
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

  test("does a different trick each time and leaves nothing behind", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/");
    const flick = flickButton(page);
    await expect(flick).toBeInViewport({ ratio: 0.9, timeout: 12_000 });
    const body = page.locator("[data-flick-root] > div").nth(1);
    const before = await body.evaluate((el) => el.querySelectorAll(":scope > span").length);
    const seen: string[] = [];
    for (let i = 0; i < 2; i++) {
      await expect(flick).toHaveCSS("pointer-events", "auto", { timeout: 6000 });
      await flick.focus();
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Do a trick" }).click();
      seen.push((await page.evaluate(() => sessionStorage.getItem("rcl:flick:trick"))) ?? "");
      // While performing, Flick never catches clicks meant for the page.
      await page.waitForTimeout(400);
      expect(await flick.evaluate((b) => getComputedStyle(b).pointerEvents)).toBe("none");
      await page.waitForTimeout(3600);
    }
    expect(seen[0]).not.toBe(seen[1]);
    await expect.poll(() => body.evaluate((el) => el.querySelectorAll(":scope > span").length), { timeout: 4000 }).toBe(before);
    const pageAnims = await page.evaluate(() => document.getAnimations().filter((a) => !(a instanceof CSSAnimation) && (a.effect as KeyframeEffect | null)?.target && !(a.effect as KeyframeEffect).target!.closest("[data-flick-root]")).length);
    expect(pageAnims).toBe(0);
  });

  test("stays fully visible but clear of the field while the visitor types", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop");
    await skipIntro(page);
    await page.goto("/contact");
    const flick = flickButton(page);
    await expect(flick).toBeVisible({ timeout: 12_000 });
    const field = page.locator("#contact-name");
    await field.click();
    await page.waitForTimeout(1500);
    const [f, b] = await Promise.all([field.boundingBox(), flick.boundingBox()]);
    // fully on screen
    expect(b!.x).toBeGreaterThanOrEqual(0);
    expect(b!.x + b!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    expect(b!.y + b!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
    // not on top of the field being typed in
    const overlap = !(b!.x + b!.width < f!.x || b!.x > f!.x + f!.width || b!.y + b!.height < f!.y || b!.y > f!.y + f!.height);
    expect(overlap).toBe(false);
  });

  test("choosing options in the booking wizard doesn't send him away", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/book");
    const flick = flickButton(page);
    await expect(flick).toBeVisible({ timeout: 12_000 });
    await page.locator("fieldset input[type=radio]").first().check({ force: true });
    await page.waitForTimeout(1200);
    const b = await flick.boundingBox();
    expect(b!.x).toBeGreaterThanOrEqual(0);
    expect(b!.x + b!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  });

  test("respects prefers-reduced-motion (no echo trail)", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => window.localStorage.setItem("rcl:flick:introduced", "1"));
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(flickButton(page)).toBeVisible({ timeout: 12_000 });
    await page.waitForTimeout(1200);
    const echoes = await page.locator("[data-flick-root] span.rounded-full").count();
    expect(echoes).toBe(0);
    await ctx.close();
  });
});
