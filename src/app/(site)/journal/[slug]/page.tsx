import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { journalPosts, postBySlug, publishedPosts, type Block } from "@/content/journal";
import { site } from "@/content/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { PhotoFill } from "@/components/media/Photo";
import { Arrow, ButtonLink, Container } from "@/components/ui/primitives";
import { getSiteData } from "@/lib/cms/data";
import { journalCover } from "@/lib/cms/resolve";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return journalPosts.filter((p) => p.published).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) return {};
  const base = pageMetadata({ title: post.title, description: post.description, path: `/journal/${post.slug}` });
  return { ...base, openGraph: { ...base.openGraph, type: "article", publishedTime: post.date } };
}

function render(b: Block, i: number) {
  switch (b.type) {
    case "p":
      return <p key={i}>{b.text}</p>;
    case "h2":
      return <h2 key={i}>{b.text}</h2>;
    case "h3":
      return <h3 key={i}>{b.text}</h3>;
    case "ul":
      return (
        <ul key={i}>
          {b.items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      );
    case "note":
      return (
        <aside key={i} className="rounded-xl border-l-2 border-clay bg-gallery px-5 py-4 text-[0.98rem]">
          {b.text}
        </aside>
      );
  }
}

/** Unlisted paths wait for the complete static page (so unknown ones get a real 404). */
export const ensureStatic = "navigation";

/**
 * The body sits in a Suspense boundary so the page can be regenerated on demand
 * after an edit is published (params are only known per path). Known paths
 * still prerender completely, so the HTML search engines see is unchanged.
 */
export default function PostPage({ params }: PageProps<"/journal/[slug]">) {
  return (
    <Suspense fallback={null}>
      <PostPageBody params={params} />
    </Suspense>
  );
}

async function PostPageBody({ params }: Pick<PageProps<"/journal/[slug]">, "params">) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();
  const cover = journalCover(await getSiteData(), post.slug);
  const more = publishedPosts().filter((p) => p.slug !== post.slug).slice(0, 2);
  const date = new Date(`${post.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

  return (
    <article className="pt-14 sm:pt-20 lg:pt-24">
      <Container>
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link href="/journal" className="underline">
            Journal
          </Link>{" "}
          / {post.category}
        </nav>
        <header className="mt-6 max-w-3xl">
          <h1 className="text-display-lg">{post.title}</h1>
          <p className="mt-5 text-lede text-muted">{post.description}</p>
          <p className="mt-5 text-sm text-muted">
            <time dateTime={post.date}>{date}</time> · {post.readingMinutes} min read
          </p>
        </header>
        {cover && (
          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-[1.4rem] bg-sand">
            <PhotoFill photo={cover} priority sizes="(min-width: 1280px) 1200px, 100vw" />
          </div>
        )}
        <div className="prose-rcl mt-12 text-[1.08rem]">{post.body.map(render)}</div>
        <div className="mt-16 flex flex-wrap gap-3 border-t border-line pt-10">
          <ButtonLink href="/book">
            Plan your session <Arrow />
          </ButtonLink>
          <ButtonLink href="/journal" variant="secondary">
            More from the journal
          </ButtonLink>
        </div>
        {more.length > 0 && (
          <aside className="mt-14" aria-label="More posts">
            <ul className="grid gap-6 md:grid-cols-2">
              {more.map((p) => (
                <li key={p.slug}>
                  <Link href={`/journal/${p.slug}`} className="block rounded-[var(--radius-card)] border border-line bg-gallery p-6 hover:border-ink/40">
                    <p className="eyebrow">{p.category}</p>
                    <p className="mt-2 font-display text-[1.35rem] leading-snug">{p.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </Container>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            mainEntityOfPage: absoluteUrl(`/journal/${post.slug}`),
            author: { "@type": "Organization", name: site.name },
            publisher: { "@id": absoluteUrl("/#business") },
          },
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Journal", path: "/journal" },
            { name: post.title, path: `/journal/${post.slug}` },
          ]),
        ]}
      />
    </article>
  );
}
