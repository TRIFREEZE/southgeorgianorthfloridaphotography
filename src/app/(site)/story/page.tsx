import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/primitives";
import { getSiteData } from "@/lib/cms/data";
import { storyPool } from "@/lib/cms/resolve";
import { resolvedStory } from "@/lib/cms/sessions";
import { storyLabels } from "@/lib/cms/texts";
import { SharedStory } from "./SharedStory";

export const metadata: Metadata = {
  title: "A session story",
  description: "A shared session idea from Southstill.",
  robots: { index: false, follow: true },
};

export default async function StoryPage() {
  const d = await getSiteData();
  const story = resolvedStory(d.content);
  const photos = storyPool(d, story);
  const labels = storyLabels(d.content.texts);
  return (
    <section className="py-16 sm:py-24">
      <Container className="max-w-3xl">
        <Suspense fallback={<p className="text-muted">Loading story…</p>}>
          <SharedStory photos={photos} pricing={d.content.pricing} content={story} labels={{ eyebrow: labels.cardEyebrow, cta: labels.cardCta }} />
        </Suspense>
      </Container>
    </section>
  );
}
