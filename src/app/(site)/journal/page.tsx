import type { Metadata } from "next";
import Link from "next/link";
import { publishedPosts } from "@/content/journal";
import { PhotoFill } from "@/components/media/Photo";
import { SamplePlate } from "@/components/media/SamplePlate";
import { getSiteData, getT } from "@/lib/cms/data";
import { editedPost } from "@/lib/cms/texts";
import { journalCover } from "@/lib/cms/resolve";
import { Container, PageHero } from "@/components/ui/primitives";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Journal: Photography Guides & Stories",
  description: "Practical, honest guides for family, pet, horse and brand photo sessions in South Georgia and North Florida.",
  path: "/journal",
});

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function JournalPage() {
  const d = await getSiteData();
  const t = await getT();
  const posts = publishedPosts().map((p) => editedPost(t.texts, p));
  return (
    <>
      <PageHero eyebrow={t("journal.eyebrow")} title={t("journal.title")} lede={t("journal.lede")} />
      <Container>
        <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <li key={p.slug} data-reveal style={{ ["--reveal-delay" as string]: `${(i % 3) * 80}ms` }}>
              <Link href={`/journal/${p.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-sand">
                  <span className="absolute inset-0 transition-transform duration-1000 group-hover:scale-[1.04]">
                    {(() => {
                      const cover = journalCover(d, p.slug);
                      return cover ? (
                        <PhotoFill photo={cover} sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" showSampleLabel={false} />
                      ) : (
                        <SamplePlate photo={{ id: `j-${p.slug}`, category: p.coverCategory, title: p.title, tone: i * 4 + 2, width: 4, height: 3 }} showLabel={false} />
                      );
                    })()}
                  </span>
                </div>
                <p className="eyebrow mt-5">
                  {p.category} · <time dateTime={p.date}>{fmt(p.date)}</time>
                </p>
                <h2 className="mt-2 text-[1.55rem] leading-snug group-hover:text-clay-deep">{p.title}</h2>
                <p className="mt-2 text-muted">{p.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
