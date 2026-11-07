"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Container } from "@/components/ui/primitives";

export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="py-24">
      <Container className="max-w-2xl">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 text-display-md">That didn&apos;t load properly.</h1>
        <p className="mt-5 text-muted">It&apos;s us, not you. Try again, or head somewhere else for a moment.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => retry()}>Try again</Button>
          <ButtonLink href="/" variant="secondary">
            Homepage
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Contact us
          </ButtonLink>
        </div>
        {digest && <p className="mt-8 text-xs text-muted">Reference: {digest}</p>}
      </Container>
    </section>
  );
}
