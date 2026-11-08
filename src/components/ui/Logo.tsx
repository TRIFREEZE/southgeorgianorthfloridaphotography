import { BRAND_CLAY, LOGO } from "./logo-paths";

/** The Southstill mark: a sun over a still horizon, held in a ring. */
export function LogoMark({ className = "h-8 w-8", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox={LOGO.iconBox} className={className} role={title ? "img" : "presentation"} aria-label={title} aria-hidden={title ? undefined : true}>
      <path fill="currentColor" fillRule="evenodd" d={LOGO.iconDark} />
      <path fill={BRAND_CLAY} d={LOGO.iconClay} />
    </svg>
  );
}

/** The Southstill wordmark (traced from the logo artwork). Height drives size. */
export function Wordmark({ className = "h-[1.6rem]" }: { className?: string }) {
  return (
    <svg viewBox={LOGO.wordBox} className={`w-auto ${className}`} role="img" aria-label="Southstill">
      <path fill="currentColor" fillRule="evenodd" d={LOGO.word} />
    </svg>
  );
}

export function Lockup({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <Wordmark className="h-[1.6rem]" />
    </span>
  );
}
