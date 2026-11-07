import type { Photo } from "@/lib/photo-types";

/**
 * An abstract, brand-colored art plate that stands in for a real photograph
 * until the owner publishes one. Always carries a visible "Sample" label.
 */
const palettes = [
  ["#e9dccb", "#d9b8a6", "#a46b55", "#5f4639"],
  ["#e6d3cc", "#cfa996", "#8e5a46", "#3b3a33"],
  ["#dfd2c0", "#b9b39d", "#727f70", "#3d4439"],
  ["#efe4d4", "#d8c1a4", "#b07b5f", "#4b3b31"],
  ["#e4dacb", "#c7b9a3", "#8a8770", "#3a3a32"],
] as const;

export function SamplePlate({
  photo,
  className = "",
  showLabel = true,
}: {
  photo: Pick<Photo, "id" | "category" | "title" | "tone" | "width" | "height">;
  className?: string;
  showLabel?: boolean;
}) {
  const tone = photo.tone ?? 0;
  const [sky, mid, accent, deep] = palettes[tone % palettes.length];
  const gid = `sp-${photo.id}`;
  const sunX = 30 + ((tone * 17) % 45);
  const sunY = 34 + ((tone * 11) % 18);

  return (
    <div className={`relative h-full w-full overflow-hidden bg-sand ${className}`} aria-hidden={!showLabel || undefined}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        role="presentation"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky} />
            <stop offset="0.62" stopColor={mid} />
            <stop offset="1" stopColor={accent} />
          </linearGradient>
          <radialGradient id={`${gid}-sun`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff8ec" stopOpacity="0.95" />
            <stop offset="0.55" stopColor="#fbe7d4" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fbe7d4" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${gid}-sky)`} />
        <circle cx={sunX} cy={sunY} r="26" fill={`url(#${gid}-sun)`} />
        <circle cx={sunX} cy={sunY} r="7" fill="#fff6ea" opacity="0.85" />
        {photo.category === "animals" ? (
          <g>
            <path d="M0 70 Q 30 58 60 66 T 100 62 V100 H0Z" fill={deep} opacity="0.55" />
            <path d="M0 80 Q 40 70 100 78 V100 H0Z" fill={deep} opacity="0.85" />
            {[12, 26, 40, 54, 68, 82].map((x) => (
              <rect key={x} x={x} y={66 - (x % 7)} width="1.1" height="16" fill={deep} opacity="0.7" />
            ))}
            <path d="M8 72 L 92 68" stroke={deep} strokeWidth="0.5" opacity="0.6" />
          </g>
        ) : photo.category === "weddings-events" ? (
          <g>
            <path d="M34 100 V58 a16 16 0 0 1 32 0 V100" fill="none" stroke="#fff6ea" strokeWidth="1.4" opacity="0.8" />
            {[18, 30, 72, 84, 50, 62].map((x, i) => (
              <circle key={x} cx={x} cy={20 + ((i * 13) % 30)} r={1.4 + (i % 3)} fill="#fff6ea" opacity="0.35" />
            ))}
            <path d="M0 86 Q 50 78 100 86 V100 H0Z" fill={deep} opacity="0.8" />
          </g>
        ) : photo.category === "brands" ? (
          <g>
            <rect x="0" y="72" width="100" height="28" fill={deep} opacity="0.82" />
            <rect x="30" y="44" width="16" height="28" rx="1" fill={accent} />
            <ellipse cx="62" cy="72" rx="9" ry="2.2" fill={deep} opacity="0.5" />
            <rect x="53" y="52" width="18" height="20" rx="9" fill="#fff6ea" opacity="0.8" />
            <circle cx="40" cy="38" r="5" fill="#fff6ea" opacity="0.4" />
          </g>
        ) : (
          <g>
            <path d="M0 74 Q 25 66 55 72 T 100 70 V100 H0Z" fill={deep} opacity="0.5" />
            <path d="M0 84 Q 50 76 100 84 V100 H0Z" fill={deep} opacity="0.85" />
            <g fill={deep} opacity="0.9">
              <ellipse cx="46" cy="58" rx="3.2" ry="3.6" />
              <path d="M41 84 Q 41 64 46 63 Q 51 64 51 84Z" />
              <ellipse cx="56" cy="62" rx="2.6" ry="3" />
              <path d="M52 84 Q 52 67 56 66 Q 60 67 60 84Z" />
            </g>
          </g>
        )}
      </svg>
      {showLabel && (
        <span className="absolute bottom-3 left-3 z-[2] inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-gallery">
          <span className="h-1.5 w-1.5 rounded-full bg-clay-light" aria-hidden />
          Sample · owner photo goes here
        </span>
      )}
    </div>
  );
}
