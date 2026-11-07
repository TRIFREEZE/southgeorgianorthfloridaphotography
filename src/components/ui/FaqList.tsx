/** Native <details> accordions: keyboard and screen-reader friendly, works without JS. */
export function FaqList({ items, headingLevel = 3 }: { items: { id?: string; q: string; a: string }[]; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((f, i) => (
        <details key={f.id ?? i} className="group py-1" id={f.id ? `faq-${f.id}` : undefined}>
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 [&::-webkit-details-marker]:hidden">
            <H className="font-display text-[1.25rem] leading-snug sm:text-[1.4rem]">{f.q}</H>
            <span
              aria-hidden
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/20 transition-transform duration-300 group-open:rotate-45"
            >
              <span className="absolute h-px w-3.5 bg-ink" />
              <span className="absolute h-3.5 w-px bg-ink" />
            </span>
          </summary>
          <p className="max-w-3xl pb-6 pr-12 text-ink-soft">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
