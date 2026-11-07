import Link from "next/link";
import { Suspense } from "react";
import { site } from "@/content/site";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { Container } from "@/components/ui/primitives";
import { MobileNav } from "./MobileNav";
import { NavLinks, NavLinksStatic } from "./NavLinks";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-parchment/90 backdrop-blur-md supports-[backdrop-filter]:bg-parchment/75">
      <Container className="flex h-[4.25rem] items-center justify-between gap-4 lg:h-20">
        <Link href="/" className="-m-2 rounded-lg p-2 text-ink" aria-label={`${site.shortName}, home`}>
          <span className="inline-flex items-center gap-2.5">
            <LogoMark className="h-8 w-8 shrink-0" />
            <Wordmark className="max-[359px]:sr-only" />
          </span>
        </Link>
        <nav aria-label="Primary" className="hidden lg:block">
          <Suspense fallback={<NavLinksStatic />}>
            <NavLinks />
          </Suspense>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={site.bookCta.href}
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-gallery transition-colors hover:bg-clay-deep sm:px-5"
          >
            <span className="sm:hidden">Book</span>
            <span className="hidden sm:inline">{site.bookCta.label}</span>
          </Link>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
