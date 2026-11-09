import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

/**
 * End-to-end CMS workflow on a production build with the local file backend:
 * log in → replace a site photo → bulk upload → crop for desktop & mobile →
 * preview → publish → see it live → replace → delete → categories → text &
 * pricing → private client gallery.
 */
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "CMS workflow runs once, on desktop");

const EMAIL = "owner@example.test";
const PASSWORD = "e2e-only-password";
const dir = join(tmpdir(), `rcl-e2e-${Date.now()}`);
mkdirSync(dir, { recursive: true });

async function photo(name: string, color: string, w = 2400, h = 3000) {
  const file = join(dir, name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${color}"/><circle cx="${w * 0.7}" cy="${h * 0.3}" r="${w * 0.15}" fill="#fffcf7"/></svg>`;
  writeFileSync(file, await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer());
  return file;
}

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}

async function publish(page: Page) {
  await page.goto("/admin");
  await page.getByTestId("publish").click();
  await page.getByTestId("confirm-ok").click();
  await expect(page.getByText("Published. The live site is updated.")).toBeVisible();
  await expect(page.getByText("Everything is published")).toBeVisible();
}

const heroImg = (page: Page) => page.locator("section").filter({ has: page.locator("#hero-title") }).locator("img").first();

test("owner can log in; wrong password is refused", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill("nope-nope");
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page.getByText(/didn't match/)).toBeVisible();
  await login(page);
  await expect(page.getByTestId("storage-usage")).toBeVisible();
});

test("replace the hero by uploading onto its spot, preview, then publish", async ({ page, browser }) => {
  await login(page);
  await page.goto("/admin/site-photos");
  const hero = page.locator('[data-slot="hero"]');
  await expect(hero.getByText("Sample", { exact: true })).toBeVisible();
  await hero.getByTestId("slot-input").setInputFiles(await photo("golden-hour-family.jpg", "#a46b55"));
  await expect(hero.getByText("Chosen", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("pending-summary")).toContainText("1 new photo");

  // Visitors still see the sample until Publish.
  const visitor = await browser.newPage();
  await visitor.goto("/");
  await expect(heroImg(visitor)).toHaveCount(0);

  // Owner preview (Draft Mode) shows the new hero and the preview banner.
  await page.goto("/api/preview/enable?to=/");
  await expect(page.getByText("Preview: you're seeing unpublished changes")).toBeVisible();
  await expect(heroImg(page)).toHaveAttribute("src", /dev-storage/);
  await page.getByTestId("exit-preview").click();

  await publish(page);
  await visitor.goto("/");
  await expect(heroImg(visitor)).toHaveAttribute("src", /dev-storage/);
  await expect(heroImg(visitor)).toHaveAttribute("alt", "Golden hour family");
  await visitor.close();
});

test("bulk upload into a category, crop for desktop and mobile, publish", async ({ page, browser }) => {
  await login(page);
  await page.goto("/admin/library");
  await page.getByTestId("upload-category").selectOption("people");
  const files = await Promise.all(["#727f70", "#5e6a5c", "#d4a28c", "#8e5a46"].map((c, i) => photo(`session-${i + 1}.jpg`, c, 1800, 1200)));
  await page.getByTestId("upload-input").setInputFiles(files);
  await expect(page.getByTestId("upload-progress")).toContainText("4 of 4 uploaded", { timeout: 60_000 });
  await page.getByRole("tab", { name: /^People & Families/ }).click();
  await expect(page.getByTestId("library-tile")).toHaveCount(4);

  // Crop the first one: desktop focal on the left, mobile focal on the right + zoom.
  // Tiles keep the order the files were chosen in, even though they upload in parallel.
  await expect(page.getByTestId("library-tile").first()).toContainText("Session 1");
  await page.getByTestId("library-tile").filter({ hasText: "Session 1" }).getByRole("button").first().click();
  const area = page.getByTestId("focal-area");
  const box = (await area.boundingBox())!;
  await area.click({ position: { x: box.width * 0.2, y: box.height * 0.5 } });
  await page.getByTestId("crop-tab-mobile").click();
  await area.click({ position: { x: box.width * 0.8, y: box.height * 0.25 } });
  await page.getByTestId("zoom").fill("1.5");
  await page.getByTestId("alt").fill("Siblings racing through a cotton field");
  await page.getByTestId("featured").check();
  await page.getByTestId("save-photo").click();
  await expect(page.getByText("Saved as a draft").last()).toBeVisible();

  await publish(page);
  const visitor = await browser.newPage();
  await visitor.goto("/portfolio/people");
  await expect(visitor.getByText("labeled sample placeholders")).toHaveCount(0);
  const img = visitor.getByRole("img", { name: "Siblings racing through a cotton field" });
  await expect(img).toBeVisible();
  const style = (await img.getAttribute("style")) ?? "";
  expect(style).toMatch(/--pos-d:\s*(1[5-9]|2[0-5])% /);
  expect(style).toMatch(/--pos-m:\s*(7[5-9]|8[0-5])% /);
  expect(style).toMatch(/--z-m:\s*1\.5/);
  // The browser really applies a different crop per screen size.
  const pos = () => img.evaluate((el) => getComputedStyle(el).objectPosition);
  expect(await pos()).toBe("20% 50%");
  await visitor.setViewportSize({ width: 390, height: 844 });
  await expect.poll(pos).toBe("80% 25%");
  await visitor.close();
});

test("30 photos upload in one drop, well within a couple of minutes", async ({ page }) => {
  test.setTimeout(150_000);
  await login(page);
  await page.goto("/admin/library");
  await page.getByTestId("upload-category").selectOption("animals");
  const files = await Promise.all(Array.from({ length: 30 }, (_, i) => photo(`barn-${String(i + 1).padStart(2, "0")}.jpg`, i % 2 ? "#727f70" : "#a46b55", 2400, 1600)));
  const started = Date.now();
  await page.getByTestId("upload-input").setInputFiles(files);
  await expect(page.getByTestId("upload-progress")).toContainText("30 of 30 uploaded", { timeout: 120_000 });
  const seconds = (Date.now() - started) / 1000;
  console.log(`30 uploads processed in ${seconds.toFixed(1)}s`);
  expect(seconds).toBeLessThan(120);
  // Tidy up so later tests start from a known state: select all 30 and delete (never published = removed now).
  await page.getByRole("tab", { name: /^Pets/ }).click();
  await expect(page.getByTestId("library-tile")).toHaveCount(30);
  for (const box of await page.getByTestId("library-tile").getByRole("checkbox").all()) await box.check();
  await expect(page.getByTestId("bulk-bar")).toContainText("30 selected");
  await page.getByTestId("bulk-bar").getByRole("button", { name: "Delete" }).click();
  await page.getByLabel(/Type “DELETE”/).fill("DELETE");
  await page.getByTestId("confirm-ok").click();
  await expect(page.getByTestId("library-tile")).toHaveCount(0);
});

test("replace a published photo keeps its text, delete needs confirmation", async ({ page, browser }) => {
  await login(page);
  await page.goto("/admin/library");
  const tile = page.getByTestId("library-tile").filter({ hasText: "Session 2" });
  await tile.getByRole("button").first().click();
  const oldSrc = await page.getByTestId("focal-area").locator("img").getAttribute("src");
  await page.getByTestId("replace-input").setInputFiles(await photo("session-2-retouched.jpg", "#33352f", 1600, 1600));
  await expect(page.getByText("Photo replaced")).toBeVisible({ timeout: 30_000 });
  await tile.getByRole("button").first().click();
  await expect(page.getByTestId("title")).toHaveValue("Session 2");
  expect(await page.getByTestId("focal-area").locator("img").getAttribute("src")).not.toBe(oldSrc);
  await page.getByRole("button", { name: "Close" }).first().click();

  // Delete Session 3: cancel first, then confirm.
  await page.getByTestId("library-tile").filter({ hasText: "Session 3" }).getByRole("button").first().click();
  await page.getByTestId("delete-photo").click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByTestId("delete-photo").click();
  await page.getByTestId("confirm-ok").click();
  await expect(page.getByText(/Marked for deletion/)).toBeVisible();

  const visitor = await browser.newPage();
  await visitor.goto("/portfolio/people");
  await expect(visitor.getByRole("img", { name: "Session 3" })).toBeVisible(); // still live until Publish
  await publish(page);
  await visitor.reload();
  await expect(visitor.getByRole("img", { name: "Session 3" })).toHaveCount(0);
  await visitor.close();
});

test("categories: rename, add, reorder; text and pricing edits go live", async ({ page, browser }) => {
  await login(page);
  await page.goto("/admin/categories");
  const first = page.getByTestId("category-row").first();
  await first.getByLabel("Name").fill("Portraits & Families");
  await page.getByTestId("new-category").fill("Maternity");
  await page.getByRole("button", { name: "Add" }).click();
  // A brand-new session type with its own custom-quote setup.
  await page.getByTestId("new-category").fill("Cars, trucks & bikes");
  await page.getByRole("button", { name: "Add" }).click();
  const cars = page.locator('[data-category="cars-trucks-and-bikes"]');
  await expect(cars.getByTestId("category-setup-panel")).toBeVisible();
  await cars.getByTestId("svc-mode-quote").check({ force: true });
  await cars.getByTestId("svc-quote-intro").fill("Every vehicle shoot is quoted for the car, the location and how you'll use the photos.");
  await cars.getByTestId("svc-headline").fill("Your ride, in its best light.");
  // Service wording for the built-in categories is edited here too.
  const animals = page.locator('[data-category="animals"]');
  await animals.getByTestId("category-setup").click();
  await animals.getByTestId("svc-name").fill("Horses, Dogs & Barn Cats");
  await page.getByTestId("save-categories").click();
  await expect(page.getByText(/Categories saved/)).toBeVisible();

  await page.goto("/admin/content");
  await page.getByTestId("tab-texts").click();
  await page.getByTestId("text-home.hero.headline").fill("Unhurried photos of the people you love");
  // Choose how many words at the end are colored, italic and bold.
  await page.getByTestId("text-home.hero.colorWords").fill("3");
  await page.getByTestId("text-home.hero.italicWords").fill("2");
  await page.getByTestId("text-home.hero.boldWords").fill("1");
  // Wording stored with pricing (the "no stopwatch" promise) is editable right here too.
  await page.getByTestId("text-pricing:noStopwatch.body").fill("We stay until the photos are right. Promise.");
  await page.getByRole("button", { name: "About page" }).click();
  await page.getByTestId("text-about.valuesTitle").fill("What I care about");
  await page.getByTestId("text-about.name2").fill("Founder Two Test");
  await page.getByTestId("text-about.story2").fill("First paragraph about the second founder.\n\nSecond paragraph.");
  await page.getByTestId("save-texts").click();
  await expect(page.getByText("Saved as a draft").last()).toBeVisible();
  await page.getByTestId("tab-pricing").click();
  await page.getByTestId("pkg-photos-0").fill("12");
  await page.getByTestId("save-pricing").click();
  await expect(page.getByText("Saved as a draft").last()).toBeVisible();

  await publish(page);
  const visitor = await browser.newPage();
  await visitor.goto("/");
  await expect(visitor.locator("#hero-title")).toContainText("Unhurried photos of the people you");
  const hero = visitor.locator("#hero-title .headline-reveal > span");
  await expect(hero.locator("xpath=self::*[contains(@class,'text-clay')]")).toHaveCount(3);
  await expect(hero.locator("xpath=self::*[contains(@class,'italic')]")).toHaveCount(2);
  await expect(hero.locator("xpath=self::*[contains(@class,'font-semibold')]")).toHaveCount(1);
  await expect(visitor.locator("main")).not.toContainText("Natural-light portraits, pets, weddings, businesses");
  await expect(visitor.locator("section", { has: visitor.locator("#promise-title") })).toContainText("We stay until the photos are right. Promise.");
  await visitor.goto("/services");
  await expect(visitor.getByRole("heading", { name: "Horses, Dogs & Barn Cats" })).toBeVisible();
  await visitor.goto("/services/pets-horses");
  await expect(visitor.locator("p.eyebrow").first()).toHaveText("Horses, Dogs & Barn Cats");
  await visitor.goto("/about");
  await expect(visitor.getByRole("heading", { name: "What I care about" })).toBeVisible();
  const second = visitor.getByTestId("founder-2");
  await expect(second.getByRole("heading", { name: "Founder Two Test" })).toBeVisible();
  await expect(second.locator("p")).toContainText(["First paragraph about the second founder.", "Second paragraph."]);
  await visitor.goto("/");
  await expect(visitor.locator("section", { has: visitor.locator("#meet-title") })).toContainText("Founder Two Test");
  await visitor.goto("/portfolio");
  const filters = visitor.getByRole("navigation", { name: "Portfolio categories" });
  await expect(filters.getByRole("link", { name: "Portraits & Families" })).toHaveAttribute("href", "/portfolio/people");
  await expect(filters.getByRole("link", { name: "Maternity" })).toBeVisible();
  expect((await visitor.request.get("/portfolio/maternity")).status()).toBe(200);
  await visitor.goto("/pricing");
  await expect(visitor.getByText("· 12 edited photos").first()).toBeVisible();
  await expect(visitor.getByRole("heading", { name: "Custom", exact: true })).toBeVisible();
  await expect(visitor.getByTestId("custom-quotes")).toContainText("Every vehicle shoot is quoted");

  // The new category is everywhere: services list, its own page, the session finder.
  await visitor.goto("/services");
  await expect(visitor.getByRole("heading", { name: "Cars, trucks & bikes" })).toBeVisible();
  await visitor.goto("/services/cars-trucks-and-bikes");
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Your ride, in its best light.");
  await visitor.goto("/book");
  await visitor.getByText("Cars, trucks & bikes", { exact: true }).first().click();
  await visitor.getByRole("button", { name: "Continue" }).click();
  await expect(visitor.getByText("This one gets a custom quote")).toBeVisible();
  await visitor.close();
});

test("About page: extra photo strip from Site photos", async ({ page, browser }) => {
  await login(page);
  await page.goto("/admin/site-photos");
  const slot = page.locator('[data-slot="about:0"]');
  await expect(slot.getByText("Empty", { exact: true })).toBeVisible();
  await slot.getByTestId("slot-input").setInputFiles(await photo("porch-light.jpg", "#d4a28c", 1600, 2000));
  await expect(slot.getByText("Chosen", { exact: true })).toBeVisible({ timeout: 30_000 });
  await publish(page);
  const visitor = await browser.newPage();
  await visitor.goto("/about");
  const strip = visitor.locator("section", { has: visitor.locator("#about-photos-title") });
  await expect(strip.getByRole("img", { name: "Porch light" })).toBeVisible();
  await visitor.close();
});

test("homepage selected work shows exactly the picked photos", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "desktop", "one run is enough");
  test.setTimeout(180_000); // two real uploads + a publish; slow machines need the room
  await login(page);
  await page.goto("/admin/site-photos");
  // Wait until the page is interactive, or an early file drop is silently ignored.
  await page.waitForLoadState("networkidle");
  const clear = page.getByTestId("mosaic-clear");
  if (await clear.isVisible()) {
    await clear.click();
    await expect(clear).toBeHidden();
  }
  // The first pick starts a fresh list, even when dropped on spot #4.
  const fourth = page.locator('[data-slot="mosaic:3"]');
  await fourth.getByTestId("slot-input").setInputFiles(await photo("river-bend.jpg", "#6f7f8a", 1800, 1200));
  const first = page.locator('[data-slot="mosaic:0"]');
  await expect(first.getByText("Chosen", { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-slot="mosaic:1"]').getByText("Empty", { exact: true })).toBeVisible();
  const second = page.locator('[data-slot="mosaic:1"]');
  await second.getByTestId("slot-input").setInputFiles(await photo("pine-shadow.jpg", "#7a6a50", 1200, 1600));
  await expect(second.getByText("Chosen", { exact: true })).toBeVisible({ timeout: 60_000 });
  await publish(page);

  const visitor = await browser.newPage();
  await visitor.goto("/");
  const cluster = visitor.getByTestId("cluster");
  await cluster.scrollIntoViewIfNeeded();
  await expect(cluster.locator("button")).toHaveCount(2);
  await expect(cluster.getByRole("button", { name: /River bend/ })).toBeVisible();
  await expect(cluster.getByRole("button", { name: /Pine shadow/ })).toBeVisible();
  await visitor.close();

  await page.goto("/admin/site-photos");
  await page.locator('[data-slot="mosaic:0"]').getByTestId("slot-remove").click();
  await expect(page.locator('[data-slot="mosaic:1"]').getByText("Empty", { exact: true })).toBeVisible();
  await page.getByTestId("mosaic-clear").click();
  await expect(page.getByTestId("mosaic-clear")).toBeHidden();
  await publish(page);
});

test("Emails page previews the client confirmation and the owner email", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one run is enough");
  await login(page);
  await page.goto("/admin/emails");
  await expect(page.getByTestId("email-subject")).toHaveText("We got your note · Southstill");
  const frame = page.frameLocator("[data-testid=email-frame]");
  await expect(frame.getByText("How it works from here")).toBeVisible();
  await expect(frame.getByText("Happening now")).toBeVisible();
  await page.getByRole("button", { name: "Your new-inquiry email" }).click();
  await expect(page.getByTestId("email-subject")).toContainText("New inquiry RCL-SAMPLE");
  await expect(frame.getByRole("link", { name: /Reply to/ })).toBeVisible();
  // Without Resend set up, a test send explains what's missing instead of failing silently.
  await page.getByTestId("send-test-email").click();
  await expect(page.getByText(/RESEND_API_KEY/).last()).toBeVisible();
});

test("private client gallery: password, signed photos, downloads", async ({ page, browser }) => {
  await login(page);
  await page.goto("/admin/galleries");
  await page.getByTestId("gallery-title").fill("The Carter Family");
  await page.getByTestId("gallery-password").fill("pecan-sunset-42");
  await page.getByTestId("create-gallery").click();
  await expect(page.getByTestId("share-url")).toBeVisible();
  await page.getByTestId("gallery-input").setInputFiles([await photo("carter-01.jpg", "#a46b55", 1200, 800), await photo("carter-02.jpg", "#727f70", 800, 1200)]);
  await expect(page.getByTestId("upload-progress")).toContainText("2 of 2 uploaded", { timeout: 30_000 });
  const share = (await page.getByTestId("share-url").textContent())!.trim();

  const client = await browser.newContext();
  const c = await client.newPage();
  await c.goto(share);
  await expect(c.getByTestId("client-photos")).toHaveCount(0);
  await c.getByTestId("gallery-unlock-password").fill("wrong-guess");
  await c.getByRole("button", { name: "Open gallery" }).click();
  await expect(c.getByText("That password didn't work")).toBeVisible();
  await c.getByTestId("gallery-unlock-password").fill("pecan-sunset-42");
  await c.getByRole("button", { name: "Open gallery" }).click();
  await expect(c.getByTestId("gallery-heading")).toHaveText("The Carter Family");
  await expect(c.getByTestId("client-photos").locator("img")).toHaveCount(2);
  const dl = await c.getByRole("link", { name: /Download/ }).first().getAttribute("href");
  expect(dl).toMatch(/signed/);
  const res = await c.request.get(dl!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toContain("attachment");
  // Private files can't be fetched without a valid signature.
  const forged = dl!.replace(/s=[^&]+/, "s=forged");
  expect((await c.request.get(forged)).status()).toBe(403);
  await client.close();
});

test("admin pages and actions require a session", async ({ page }) => {
  await page.goto("/admin/library");
  await expect(page).toHaveURL(/\/admin\/login/);
  const res = await page.request.get("/api/preview/enable?to=/");
  expect(res.status()).toBe(401);
});
