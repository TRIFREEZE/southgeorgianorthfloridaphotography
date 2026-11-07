import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Container({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-[84rem] px-5 sm:px-8 lg:px-12 ${className}`}>{children}</div>;
}

type Variant = "primary" | "secondary" | "ghost" | "light";

const variants: Record<Variant, string> = {
  primary:
    "px-6 bg-ink text-gallery hover:bg-clay-deep active:translate-y-px shadow-[0_1px_0_rgba(0,0,0,0.04),0_10px_24px_-12px_rgba(37,39,35,0.55)]",
  secondary: "px-6 border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-gallery",
  ghost: "text-ink underline decoration-ink/30 underline-offset-[0.3em] hover:decoration-clay px-0 min-h-11",
  light: "px-6 bg-gallery text-ink hover:bg-sand",
};

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full text-[0.95rem] font-semibold tracking-[0.01em] transition-[background-color,border-color,color,transform] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60";

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
  ...rest
}: { href: string; variant?: Variant; className?: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: { variant?: Variant; className?: string; children: ReactNode } & ComponentProps<"button">) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Arrow({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 10h11M11 5.5 15.5 10 11 14.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  as: As = "h2",
  className = "",
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
  id?: string;
}) {
  return (
    <div className={`${align === "center" ? "mx-auto text-center" : ""} max-w-3xl ${className}`} data-reveal>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <As id={id} className={As === "h1" ? "text-display-lg" : "text-display-md"}>
        {title}
      </As>
      {lede && <p className="mt-5 text-lede text-muted">{lede}</p>}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="pt-14 pb-12 sm:pt-20 sm:pb-16 lg:pt-28">
      <Container>
        <div className="max-w-4xl">
          {eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>}
          <h1 className="text-display-lg">{title}</h1>
          {lede && <p className="mt-6 max-w-2xl text-lede text-muted">{lede}</p>}
          {children}
        </div>
      </Container>
    </section>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-line" />
      <span className="h-1.5 w-1.5 rotate-45 bg-clay" />
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
