import Link from "next/link";
import { Suspense } from "react";
import { site } from "@/content/site";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { Container } from "@/components/ui/primitives";
import { getT } from "@/lib/cms/data";
import { editedNav } from "@/lib/cms/texts";
import { MobileNav } from "./MobileNav";
import { NavLinks, NavLinksStatic } from "./NavLinks";

export async function Header() {
  const t = await getT();
  const nav = editedNav(t.texts).map(({ label, href }) => ({ label, href }));
  const book = t("site.bookCta");
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-parchment/90 backdrop-blur-md supports-[backdrop-filter]:bg-parchment/75">
      <Container className="flex h-[4.25rem] items-center justify-between gap-4 lg:h-20">
        <Link href="/" className="-m-2 rounded-lg p-2 text-ink" aria-label={`${site.shortName}, home`}>
          <span className="inline-flex items-center gap-2">
            <LogoMark className="h-8 w-8 shrink-0 lg:h-9 lg:w-9" />
            <Wordmark className="h-[1.6rem] max-[359px]:hidden lg:h-[1.8rem]" />
          </span>
        </Link>
        <nav aria-label="Primary" className="hidden lg:block">
          <Suspense fallback={<NavLinksStatic items={nav} />}>
            <NavLinks items={nav} />
          </Suspense>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={site.bookCta.href}
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-gallery transition-colors hover:bg-clay-deep sm:px-5"
          >
            <span className="sm:hidden">Book</span>
            <span className="hidden sm:inline">{book}</span>
          </Link>
          <MobileNav items={nav} bookLabel={book} />
        </div>
      </Container>
    </header>
  );
}
