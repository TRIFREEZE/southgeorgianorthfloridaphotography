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
  await page.getByTestId("save-categories").click();
  await expect(page.getByText(/Categories saved/)).toBeVisible();

  await page.goto("/admin/content");
  await page.getByTestId("tab-texts").click();
  await page.getByTestId("text-home.hero.headline").fill("Unhurried photos of the people you love");
  // Any text on the site is reachable by search, e.g. a service page's name.
  await page.getByTestId("text-search").fill("Pets & Horses");
  await page.getByTestId("text-services.pets-horses.name").fill("Horses, Dogs & Barn Cats");
  await page.getByTestId("text-search").fill("");
  await page.getByRole("button", { name: "About page" }).click();
  await page.getByTestId("text-about.valuesTitle").fill("What I care about");
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
  await expect(visitor.locator("main")).not.toContainText("Natural-light portraits, pets, weddings, businesses");
  await visitor.goto("/services");
  await expect(visitor.getByRole("heading", { name: "Horses, Dogs & Barn Cats" })).toBeVisible();
  await visitor.goto("/services/pets-horses");
  await expect(visitor.locator("p.eyebrow").first()).toHaveText("Horses, Dogs & Barn Cats");
  await visitor.goto("/about");
  await expect(visitor.getByRole("heading", { name: "What I care about" })).toBeVisible();
  await visitor.goto("/portfolio");
  const filters = visitor.getByRole("navigation", { name: "Portfolio categories" });
  await expect(filters.getByRole("link", { name: "Portraits & Families" })).toHaveAttribute("href", "/portfolio/people");
  await expect(filters.getByRole("link", { name: "Maternity" })).toBeVisible();
  expect((await visitor.request.get("/portfolio/maternity")).status()).toBe(200);
  await visitor.goto("/pricing");
  await expect(visitor.getByText("· 12 edited photos").first()).toBeVisible();
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
