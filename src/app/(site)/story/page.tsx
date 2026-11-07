import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/primitives";
import { getPortfolioPhotos } from "@/lib/photos";
import { SharedStory } from "./SharedStory";

export const metadata: Metadata = {
  title: "A session story",
  description: "A shared session idea from Red Clay & Light.",
  robots: { index: false, follow: true },
};

export default async function StoryPage() {
  const { photos } = await getPortfolioPhotos();
  return (
    <section className="py-16 sm:py-24">
      <Container className="max-w-3xl">
        <Suspense fallback={<p className="text-muted">Loading story…</p>}>
          <SharedStory photos={photos} />
        </Suspense>
      </Container>
    </section>
  );
}
