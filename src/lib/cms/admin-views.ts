import "server-only";
import { publishedPosts } from "@/content/journal";
import { services } from "@/content/services";
import type { SlotView } from "@/components/admin/SlotBoard";
import { adminPhotos, draftSiteData } from "./ops";
import { categoryCover, founderPhoto, heroPhoto, journalCover, mosaicPhotos, serviceCover, visibleCategories } from "./resolve";
import type { CmsRepo } from "./repo/types";

/** Every photo position on the public site, resolved exactly as it will look after Publish. */
export async function siteSlots(repo: CmsRepo): Promise<SlotView[]> {
  const d = await draftSiteData(repo);
  const l = d.content.layout;
  const mosaic = mosaicPhotos(d, 7);
  const slots: SlotView[] = [
    { key: "hero", group: "Homepage", label: "Hero (top of homepage)", hint: "The first photo every visitor sees. Tall on desktop, 4:5 on phones.", ratio: "3 / 4", current: heroPhoto(d), explicitId: l.hero, categoryId: null, href: "/" },
    ...Array.from({ length: 7 }, (_, i) => ({
      key: `mosaic:${i}`,
      group: "Homepage",
      label: `Selected work #${i + 1}`,
      hint: i === 0 ? "The large tile in the homepage gallery (also used in Flick's film strip)." : "Homepage gallery tile.",
      ratio: i === 0 ? "4 / 5" : "1 / 1",
      current: mosaic[i] ?? null,
      explicitId: l.mosaic[i] ?? null,
      categoryId: null,
      href: "/#work",
    })),
    { key: "founder", group: "About page", label: "Founder 1 portrait", hint: "About page and “Meet the founders” on the homepage. Name and story are in Page text → About page.", ratio: "4 / 5", current: founderPhoto(d, 1), explicitId: l.founder, categoryId: null, href: "/about" },
    { key: "founder2", group: "About page", label: "Founder 2 portrait", hint: "About page and “Meet the founders” on the homepage. Name and story are in Page text → About page.", ratio: "4 / 5", current: founderPhoto(d, 2), explicitId: l.founder2, categoryId: null, href: "/about" },
    ...[0, 1, 2].map((i) => {
      const id = l.aboutPhotos[i] ?? null;
      return {
        key: `about:${i}`,
        group: "About page",
        label: `About page photo #${i + 1}`,
        hint: "Optional photo strip on the About page. Empty spots are simply hidden.",
        ratio: "4 / 5",
        current: id ? (d.photos.find((p) => p.id === id) ?? null) : null,
        explicitId: id,
        categoryId: null,
        href: "/about",
      };
    }),
    ...visibleCategories(d).map((c) => ({
      key: `category:${c.id}`,
      group: "Portfolio category covers",
      label: c.label,
      hint: "Cover for this category on the homepage story cards. Uploads here also join the category's gallery.",
      ratio: "4 / 5",
      current: categoryCover(d, c.id),
      explicitId: l.categoryCovers[c.id] ?? null,
      categoryId: c.id,
      href: `/portfolio/${c.slug}`,
    })),
    ...services.map((s) => ({
      key: `service:${s.slug}`,
      group: "Service pages",
      label: s.name,
      hint: "Cover photo on the Services list and this service page.",
      ratio: "4 / 3",
      current: serviceCover(d, s.slug, s.category),
      explicitId: l.serviceCovers[s.slug] ?? null,
      categoryId: s.category,
      href: `/services/${s.slug}`,
    })),
    ...publishedPosts().map((p) => ({
      key: `journal:${p.slug}`,
      group: "Journal covers",
      label: p.title,
      hint: "Cover for this journal post. Shows an art plate until you choose one.",
      ratio: "16 / 9",
      current: journalCover(d, p.slug),
      explicitId: l.journalCovers[p.slug] ?? null,
      categoryId: null,
      href: `/journal/${p.slug}`,
    })),
  ];
  return slots;
}

export async function libraryData(repo: CmsRepo) {
  const [photos, d] = await Promise.all([adminPhotos(repo), draftSiteData(repo)]);
  return { photos, categories: d.content.categories };
}
