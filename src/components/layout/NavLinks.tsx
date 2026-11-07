"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/content/site";

function List({ active }: { active?: string }) {
  return (
    <ul className="flex items-center gap-1">
      {site.nav.map((item) => {
        const isActive = active ? active === item.href || active.startsWith(item.href + "/") : false;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`relative inline-flex min-h-11 items-center rounded-full px-3.5 text-[0.92rem] font-medium transition-colors hover:text-clay-deep ${
                isActive ? "text-ink after:absolute after:inset-x-3.5 after:bottom-2 after:h-px after:bg-clay" : "text-ink-soft"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function NavLinks() {
  const pathname = usePathname();
  return <List active={pathname} />;
}

export function NavLinksStatic() {
  return <List />;
}
