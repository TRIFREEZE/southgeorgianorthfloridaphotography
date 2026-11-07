/**
 * Original brand mark: a sun rising over furrowed red-clay fields, held in an
 * aperture ring. Works small (favicon) and large (social lockups).
 */
export function LogoMark({ className = "h-8 w-8", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role={title ? "img" : "presentation"} aria-label={title} aria-hidden={title ? undefined : true}>
      <circle cx="24" cy="24" r="21.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M13.5 26.5a10.5 10.5 0 0 1 21 0" fill="#A46B55" />
      <path d="M7 26.5h34" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10.5 32h27M15.5 37.2h17" stroke="#A46B55" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 8.2v3.4M12.6 12.9l2.3 2.3M35.4 12.9l-2.3 2.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-[1.32rem] leading-none tracking-[-0.01em] ${className}`}>
      Red Clay <span className="italic text-clay">&amp;</span> Light
    </span>
  );
}

export function Lockup({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <Wordmark />
    </span>
  );
}
