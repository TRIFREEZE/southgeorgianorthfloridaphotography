import { BRAND_CLAY, LOGO } from "./logo-paths";

/** The Southstill mark: a sun setting into still water, inside an open ring. */
export function LogoMark({ className = "h-8 w-auto", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox={LOGO.iconBox} className={className} role={title ? "img" : "presentation"} aria-label={title} aria-hidden={title ? undefined : true}>
      <path fill={BRAND_CLAY} d={LOGO.iconClay} />
      <path fill="currentColor" fillRule="evenodd" d={LOGO.iconDark} />
    </svg>
  );
}

/** The Southstill wordmark on its own. Height drives size. */
export function Wordmark({ className = "h-[1.6rem]" }: { className?: string }) {
  return (
    <svg viewBox={LOGO.wordBox} className={`w-auto ${className}`} role="img" aria-label="Southstill">
      <path fill="currentColor" fillRule="evenodd" d={LOGO.word} />
    </svg>
  );
}

/**
 * Mark and wordmark together, spaced exactly as in the artwork. Set the height
 * (e.g. `h-9`); the width follows. The box hugs the artwork top and bottom, so
 * it centres cleanly next to buttons.
 */
export function Lockup({ className = "h-8" }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${LOGO.lockupW} ${LOGO.lockupH}`} className={`w-auto shrink-0 ${className}`} role="img" aria-label="Southstill">
      <path fill={BRAND_CLAY} d={LOGO.iconClay} />
      <path fill="currentColor" fillRule="evenodd" d={LOGO.iconDark} />
      <g transform={`translate(${LOGO.wordX} ${LOGO.wordY})`}>
        <path fill="currentColor" fillRule="evenodd" d={LOGO.word} />
      </g>
    </svg>
  );
}
