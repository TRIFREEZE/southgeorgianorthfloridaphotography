import type { Metadata } from "next";
import Link from "next/link";
import { publishedPosts } from "@/content/journal";
import { SamplePlate } from "@/components/media/SamplePlate";
import { Container, PageHero } from "@/components/ui/primitives";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Journal: Photography Guides & Stories",
  description: "Practical, honest guides for family, pet, horse and brand photo sessions in South Georgia and North Florida.",
  path: "/journal",
});

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function JournalPage() {
  const posts = publishedPosts();
  return (
    <>
      <PageHero eyebrow="Journal" title="Notes from behind the camera." lede="Useful guides before your session, and stories from real shoots once clients say we can share them." />
      <Container>
        <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <li key={p.slug} data-reveal style={{ ["--reveal-delay" as string]: `${(i % 3) * 80}ms` }}>
              <Link href={`/journal/${p.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-sand">
                  <span className="absolute inset-0 transition-transform duration-1000 group-hover:scale-[1.04]">
                    <SamplePlate photo={{ id: `j-${p.slug}`, category: p.coverCategory, title: p.title, tone: i * 4 + 2, width: 4, height: 3 }} showLabel={false} />
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
