import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The whole CMS workflow against the file-based repo:
 * upload → draft → crop → place → publish → replace → delete, plus categories and galleries.
 */
const dir = mkdtempSync(join(tmpdir(), "rcl-cms-"));
process.env.CMS_LOCAL_DIR = dir;

type Ops = typeof import("@/lib/cms/ops");
let ops: Ops;
let repo: import("@/lib/cms/repo/types").CmsRepo;
let localFile: (b: string, p: string) => string;
let resolve: typeof import("@/lib/cms/resolve");

async function fakeUpload(name: string, color: string, w = 3000, h = 2000) {
  const buf = await sharp({ create: { width: w, height: h, channels: 3, background: color } })
    .jpeg()
    .withMetadata({ orientation: 1 })
    .toBuffer();
  const path = `incoming/${crypto.randomUUID()}.jpg`;
  const file = localFile("portfolio-uploads", path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buf);
  return { path, filename: name };
}

beforeAll(async () => {
  ops = await import("@/lib/cms/ops");
  const local = await import("@/lib/cms/repo/local");
  localFile = local.localFile;
  repo = new local.LocalRepo();
  resolve = await import("@/lib/cms/resolve");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("photo workflow", () => {
  let id = "";

  it("uploads into a draft that visitors can't see yet", async () => {
    const up = await fakeUpload("pecan-grove-family.jpg", "#a46b55");
    id = await ops.addPhoto(repo, { ...up, categoryId: "people", consent: true });
    const m = (await repo.getMedia(id))!;
    expect(m.published).toBe(false);
    expect(m.draft.width).toBe(2560); // master capped at 2560px
    expect(m.draft.height).toBe(1707);
    expect(m.draft.title).toBe("Pecan grove family");
    expect(m.draft.alt).toBe("Pecan grove family");
    expect(m.draft.blur).toMatch(/^data:image\/webp;base64,/);
    expect(existsSync(localFile("portfolio", m.draft.storagePath))).toBe(true);
    expect(m.draft.originalPath).toMatch(/^originals\//);
    expect(existsSync(localFile("portfolio-uploads", m.draft.originalPath!))).toBe(true);
    expect(existsSync(localFile("portfolio-uploads", up.path))).toBe(false);
    expect(await repo.listPublishedMedia()).toHaveLength(0);
  });

  it("camera file names don't become alt text", async () => {
    const up = await fakeUpload("IMG_2041.JPG", "#727f70", 800, 1200);
    const other = await ops.addPhoto(repo, { ...up, categoryId: "animals", consent: true });
    const s = (await repo.getMedia(other))!.draft;
    expect(s.title).toBe("");
    expect(s.alt).toMatch(/ photograph$/);
    expect(s.alt).not.toMatch(/IMG/);
  });

  it("sets independent desktop and mobile crops", async () => {
    await ops.patchPhotos(repo, [id], { focal: { dx: 20, dy: 30, mx: 70, my: 40 }, zoom: { d: 1, m: 1.4 }, alt: "Family walking under pecan trees", featured: true });
    const s = (await repo.getMedia(id))!.draft;
    expect(s.focal).toEqual({ dx: 20, dy: 30, mx: 70, my: 40 });
    expect(s.zoom).toEqual({ d: 1, m: 1.4 });
  });

  it("places the photo in the hero slot and previews it before publishing", async () => {
    await ops.setSlot(repo, "hero", id);
    const draft = await ops.draftSiteData(repo);
    expect(resolve.heroPhoto(draft).id).toBe(id);
    expect(resolve.heroPhoto(draft).focalMX).toBe(70);
    const pending = await ops.pendingChanges(repo);
    expect(pending.newPhotos).toBe(2);
    expect(pending.content).toContain("layout");
  });

  it("blocks publishing a photo without permission", async () => {
    const up = await fakeUpload("mystery.jpg", "#222222", 400, 400);
    const pid = await ops.addPhoto(repo, { ...up, categoryId: "people", consent: false });
    await expect(ops.publishAll(repo)).rejects.toThrow(/permission/i);
    await ops.patchPhotos(repo, [pid], { license: "owner_original" });
  });

  it("publishes drafts to live in one step", async () => {
    await ops.publishAll(repo);
    const live = await repo.listPublishedMedia();
    expect(live.map((l) => l.id)).toContain(id);
    expect((await ops.pendingChanges(repo)).total).toBe(0);
    const layout = (await repo.listContent()).find((r) => r.key === "layout")!;
    expect((layout.published as { hero: string }).hero).toBe(id);
  });

  it("replaces a live photo without breaking the live site until publish", async () => {
    const before = (await repo.getMedia(id))!;
    const up = await fakeUpload("new-version.jpg", "#d4a28c", 1600, 2400);
    await ops.replacePhotoFile(repo, id, up.path, up.filename);
    const after = (await repo.getMedia(id))!;
    expect(after.draft.storagePath).not.toBe(before.draft.storagePath);
    expect(after.draft.alt).toBe("Family walking under pecan trees"); // text kept
    expect(after.live!.storagePath).toBe(before.draft.storagePath); // live untouched
    expect(existsSync(localFile("portfolio", before.draft.storagePath))).toBe(true);
    await ops.publishAll(repo);
    expect(existsSync(localFile("portfolio", before.draft.storagePath))).toBe(false); // old file cleaned up
    expect((await repo.getMedia(id))!.live!.storagePath).toBe(after.draft.storagePath);
  });

  it("deletes safely: stays live until publish, can be restored", async () => {
    await ops.deletePhoto(repo, id);
    expect((await repo.listPublishedMedia()).map((l) => l.id)).toContain(id);
    await ops.restorePhoto(repo, id);
    expect((await repo.getMedia(id))!.pendingDelete).toBe(false);
    await ops.deletePhoto(repo, id);
    const m = (await repo.getMedia(id))!;
    await ops.publishAll(repo);
    expect(await repo.getMedia(id)).toBeNull();
    expect(existsSync(localFile("portfolio", m.draft.storagePath))).toBe(false);
    const layout = (await repo.listContent()).find((r) => r.key === "layout")!;
    expect((layout.published as { hero: string | null }).hero).toBeNull();
  });

  it("discard throws away unpublished uploads", async () => {
    const up = await fakeUpload("oops.jpg", "#111111", 300, 300);
    const pid = await ops.addPhoto(repo, { ...up, categoryId: null, consent: true });
    await ops.discardAll(repo);
    expect(await repo.getMedia(pid)).toBeNull();
  });
});

describe("categories", () => {
  it("renames, reorders, and never deletes photos with a category", async () => {
    const up = await fakeUpload("horse.jpg", "#5e6a5c", 500, 500);
    const pid = await ops.addPhoto(repo, { ...up, categoryId: "animals", consent: true });
    const cats = (await ops.draftContent(repo)).categories;
    const next = [{ ...cats.find((c) => c.id === "weddings-events")!, label: "Weddings & Celebrations" }, ...cats.filter((c) => c.id !== "weddings-events" && c.id !== "animals"), { id: "maternity", slug: "maternity", label: "Maternity", description: "", visible: true }];
    const r = await ops.saveCategories(repo, next);
    expect(r.moved).toBeGreaterThan(0);
    expect((await repo.getMedia(pid))!.draft.categoryId).toBeNull();
    const saved = (await ops.draftContent(repo)).categories;
    expect(saved[0].label).toBe("Weddings & Celebrations");
    expect(saved.map((c) => c.id)).toContain("maternity");
    await expect(ops.saveCategories(repo, [...next, { ...next[0], id: "dupe" }])).rejects.toThrow(/web address/);
  });
});

describe("mosaic placement", () => {
  it("keeps card positions stable", () => {
    expect(ops.placeInMosaic(["a", "b", "c"], 1, "z")).toEqual(["a", "z", "c"]);
    expect(ops.placeInMosaic(["a", "b", "c"], 0, "c")).toEqual(["c", "b", "a"]);
    expect(ops.placeInMosaic(["a"], 4, "z")).toEqual(["a", "z"]);
    expect(ops.placeInMosaic(["a", "b"], 0, null)).toEqual(["b"]);
  });
});

describe("content", () => {
  it("validates pricing before saving", async () => {
    const c = await ops.draftContent(repo);
    await expect(ops.saveContent(repo, "pricing", { ...c.pricing, packages: c.pricing.packages.slice(0, 2) })).rejects.toThrow();
    const p = { ...c.pricing, packages: c.pricing.packages.map((k, i) => (i === 0 ? { ...k, priceCents: 22500 } : k)) };
    await ops.saveContent(repo, "pricing", p);
    expect((await ops.draftContent(repo)).pricing.packages[0].priceCents).toBe(22500);
  });
});

describe("client galleries", () => {
  it("hashes passwords and ties access to the current password", async () => {
    const g = await import("@/lib/cms/galleries");
    const hash = await g.hashPassword("pecan-sunset-42");
    expect(hash).not.toContain("pecan");
    expect(await g.verifyPassword("pecan-sunset-42", hash)).toBe(true);
    expect(await g.verifyPassword("wrong", hash)).toBe(false);
    const rec = { id: "00000000-0000-4000-8000-000000000001", passwordHash: hash };
    const token = g.accessToken(rec);
    expect(g.hasAccess(rec, token)).toBe(true);
    expect(g.hasAccess({ ...rec, passwordHash: await g.hashPassword("new-one-99") }, token)).toBe(false);
    expect(g.hasAccess(rec, `${Date.now() - 1}.${token.split(".")[1]}`)).toBe(false);
  });
});
