"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { composeStory, type StoryContent } from "@/content/story";
import type { Pricing } from "@/lib/cms/schema";
import type { Photo } from "@/lib/photo-types";
import { StoryCard } from "@/components/story/StoryCard";

export function SharedStory({ photos, pricing, content, labels }: { photos: Photo[]; pricing: Pricing; content: StoryContent; labels: { eyebrow: string; cta: string } }) {
  const q = useSearchParams();
  const story = composeStory({ subject: q.get("s"), feeling: q.get("f"), town: q.get("t"), season: q.get("w") }, content);
  if (!story) {
    return (
      <div className="text-center">
        <h1 className="text-display-md">That story link looks incomplete.</h1>
        <p className="mt-4 text-muted">
          Build a new one on the <Link className="underline" href="/#bys-title">homepage</Link> or go straight to{" "}
          <Link className="underline" href="/book">booking</Link>.
        </p>
      </div>
    );
  }
  const mood = photos.filter((p) => p.category === story.subject.category).slice(0, 4);
  return (
    <>
      <h1 className="mb-8 text-display-md">Someone shared a session idea with you.</h1>
      <StoryCard story={story} photos={mood.length ? mood : photos.slice(0, 4)} pricing={pricing} labels={labels} />
    </>
  );
}
