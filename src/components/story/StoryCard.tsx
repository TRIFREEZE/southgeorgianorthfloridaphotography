import Link from "next/link";
import { formatPrice, pricing } from "@/content/pricing";
import { site } from "@/content/site";
import type { ComposedStory } from "@/content/story";
import type { Photo } from "@/lib/photo-types";
import { PhotoFill } from "@/components/media/Photo";

export function storyBookingHref(story: ComposedStory) {
  const q = new URLSearchParams({ category: story.subject.booking, subject: story.subject.id, feeling: story.feeling.id });
  if (story.subject.pkg) q.set("package", story.subject.pkg);
  if (story.town) q.set("town", story.town);
  return `/book?${q.toString()}`;
}

export function storyShareQuery(story: ComposedStory) {
  const q = new URLSearchParams({ s: story.subject.id, f: story.feeling.id });
  if (story.town) q.set("t", story.town);
  if (story.season) q.set("w", story.season.id);
  return q.toString();
}

/** The composed, shareable session story card. Only uses the owner's published portfolio images. */
export function StoryCard({ story, photos, actions }: { story: ComposedStory; photos: Photo[]; actions?: React.ReactNode }) {
  const town = site.serviceArea.towns.find((t) => t.slug === story.town);
  const pkg = story.subject.pkg ? pricing.packages.find((p) => p.id === story.subject.pkg) : null;
  const title = `${story.feeling.label.replace(" & easy", "")} ${story.subject.id === "wedding" ? "celebration" : story.subject.id === "business" ? "brand session" : `${story.subject.id} portraits`}`;
  const mood = photos.slice(0, 4);

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-line bg-gallery shadow-[0_30px_60px_-40px_rgba(37,39,35,0.5)]" aria-labelledby="story-card-title">
      <div className="grid grid-cols-4 gap-1 bg-ink p-1">
        {mood.map((p, i) => (
          <div key={p.id} className={`relative overflow-hidden rounded-[0.8rem] ${i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"} ${mood.length < 4 && i === mood.length - 1 ? "col-span-2" : ""}`}>
            <PhotoFill photo={p} sizes="(min-width: 768px) 25vw, 50vw" showSampleLabel={false} />
          </div>
        ))}
      </div>
      <div className="p-6 sm:p-8">
        <p className="eyebrow">Your session story</p>
        <h3 id="story-card-title" className="mt-3 text-[2rem] capitalize leading-tight">
          {title}
          {town ? ` near ${town.name}` : ""}
        </h3>
        <p className="mt-2 text-muted">
          A {story.feeling.line} session{story.season && story.season.id !== "unsure" ? `, ${story.season.label.toLowerCase()}` : ""}.
          {mood.some((m) => m.isSample) ? " (Mood images are placeholders until the portfolio is published.)" : ""}
        </p>
        <dl className="mt-6 grid gap-4 text-[0.95rem] sm:grid-cols-2">
          <div className="rounded-xl bg-parchment p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-clay-deep">Suggested session</dt>
            <dd className="mt-1">
              {pkg ? (
                <>
                  {pkg.name}: {pkg.photos} edited photos, <strong>{formatPrice(pkg.priceCents)}</strong>
                </>
              ) : (
                <>Custom quote, based on coverage and scope</>
              )}
            </dd>
          </div>
          <div className="rounded-xl bg-parchment p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-clay-deep">Location &amp; travel</dt>
            <dd className="mt-1">{town ? `${town.name}, ${town.state} is in our service area. Any travel is quoted before you book.` : "Tell us where. Travel is quoted up front."}</dd>
          </div>
          <div className="rounded-xl bg-parchment p-4 sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-clay-deep">One prep tip</dt>
            <dd className="mt-1">{story.tip}</dd>
          </div>
        </dl>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href={storyBookingHref(story)} className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 font-semibold text-gallery hover:bg-clay-deep">
            Plan this session
          </Link>
          {actions}
        </div>
      </div>
    </article>
  );
}
