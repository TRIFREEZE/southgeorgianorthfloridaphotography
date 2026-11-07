import { useId, type Ref } from "react";
import type { FlickMood, FlickProp } from "./types";

/**
 * Flick: the ECHO ring, recolored for Red Clay & Light.
 * Geometry mirrors ECHO's EchoRing::paint, scaled to r = 20:
 *   - dark lens face, ring stroke with a slowly rotating two-tone gradient, restrained halo
 *   - round eyes at x = ±0.33r, y = −0.06r, radius 0.15r; gaze offset up to 0.16r
 *   - blink squashes eyes to 0.35×; "happy" swaps them for upturned arcs
 * Pure SVG (crisp at every size), no raster sprites.
 */
const R = 20;
const EYE_R = R * 0.15;
const EYE_X = R * 0.33;
const EYE_Y = -R * 0.06;

function happyArc(cx: number) {
  // Arc centred slightly below the eye, spanning ±0.45π from 12 o'clock (ECHO's addCentredArc).
  const cy = EYE_Y + EYE_R * 0.6;
  const rr = EYE_R * 1.2;
  const a = Math.PI * 0.45;
  const x1 = cx + rr * Math.sin(-a);
  const y1 = cy - rr * Math.cos(-a);
  const x2 = cx + rr * Math.sin(a);
  const y2 = cy - rr * Math.cos(a);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${rr} ${rr} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function FlickSVG({
  mood = "neutral",
  prop = null,
  feet = false,
  eyesRef,
  className = "",
  title,
}: {
  mood?: FlickMood;
  prop?: FlickProp;
  feet?: boolean;
  eyesRef?: Ref<SVGGElement>;
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const ring = `fr-ring-${uid}`;
  const halo = `fr-halo-${uid}`;
  const face = `fr-face-${uid}`;
  const eyeScale = mood === "surprised" ? 1.22 : 1;

  return (
    <svg viewBox="-40 -40 80 80" className={className} role={title ? "img" : "presentation"} aria-label={title} aria-hidden={title ? undefined : true} overflow="visible">
      <defs>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C98468" />
          <stop offset="0.5" stopColor="#A46B55" />
          <stop offset="1" stopColor="#E9DCCB" />
        </linearGradient>
        <radialGradient id={halo}>
          <stop offset="0.45" stopColor="#A46B55" stopOpacity="0.16" />
          <stop offset="1" stopColor="#A46B55" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={face} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#3a3c36" />
          <stop offset="1" stopColor="#1b1c19" />
        </radialGradient>
      </defs>

      {/* restrained halo */}
      <circle r={R * 1.75} fill={`url(#${halo})`} />

      {/* feet peek out during hops and walks */}
      <g className="flick-feet" style={{ opacity: feet ? 1 : 0, transition: "opacity 160ms ease" }}>
        <ellipse cx={-6.5} cy={R + 1.6} rx={3.6} ry={2.1} fill="#A46B55" />
        <ellipse cx={6.5} cy={R + 1.6} rx={3.6} ry={2.1} fill="#A46B55" />
      </g>

      {/* lens face */}
      <circle r={R} fill={`url(#${face})`} />
      {/* faint glass reflection, a lens, not a ghost */}
      <path d={`M${-R * 0.62} ${-R * 0.28} A${R * 0.7} ${R * 0.7} 0 0 1 ${-R * 0.12} ${-R * 0.7}`} stroke="#FFFCF7" strokeOpacity="0.14" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* ring with a slowly rotating gradient */}
      <circle r={R} fill="none" stroke={`url(#${ring})`} strokeWidth={4} className="flick-ring" />

      {/* eyes */}
      <g ref={eyesRef} className="flick-eyes" style={{ transition: "transform 140ms cubic-bezier(.22,1,.36,1)" }}>
        {mood === "happy"
          ? [-1, 1].map((s) => (
              <path key={s} d={happyArc(s * EYE_X)} stroke="#FFFCF7" strokeWidth={Math.max(1.2, EYE_R * 0.7)} strokeLinecap="round" fill="none" />
            ))
          : [-1, 1].map((s) => (
              <ellipse
                key={s}
                className="flick-eye"
                cx={s * EYE_X}
                cy={EYE_Y + (mood === "sleepy" ? 1 : 0)}
                rx={EYE_R * eyeScale}
                ry={(mood === "sleepy" ? EYE_R * 0.35 : EYE_R) * eyeScale}
                fill="#FFFCF7"
              />
            ))}
        {/* almost-invisible mouth, only when it has something to say */}
        {mood === "happy" && <path d="M-2.6 6.4 Q0 8.6 2.6 6.4" stroke="#FFFCF7" strokeOpacity="0.45" strokeWidth="1.3" fill="none" strokeLinecap="round" />}
        {mood === "surprised" && <ellipse cx={0} cy={7} rx={1.4} ry={1.7} fill="#FFFCF7" fillOpacity="0.5" />}
      </g>

      {/* camera-flash snap */}
      <circle r={R - 2} fill="#FFFCF7" className="flick-flash" opacity="0" />

      {prop === "map" && (
        <g transform="translate(15 13) rotate(-12)">
          <line x1="-4" y1="-2" x2="-11" y2="-1" stroke="#A46B55" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="-1" y="-7" width="17" height="12.5" rx="1.2" fill="#F6F2EA" stroke="#5d5c55" strokeWidth="0.8" />
          <path d="M4.6 -7 V5.5 M10.3 -7 V5.5" stroke="#5d5c55" strokeWidth="0.6" />
          <path d="M1.5 2.5 C 4 -2, 7 3, 13 -3.5" stroke="#A46B55" strokeWidth="0.9" fill="none" strokeDasharray="1.4 1.1" />
          <circle cx="13" cy="-3.5" r="1.1" fill="#8E5A46" />
        </g>
      )}
      {prop === "hammer" && (
        <g transform="translate(17 4)">
          <g className="flick-hammer">
            <line x1="-6" y1="6" x2="0" y2="0" stroke="#A46B55" strokeWidth="2.6" strokeLinecap="round" />
            <rect x="1" y="-17" width="3.2" height="18" rx="1.2" fill="#8a6a4f" transform="rotate(30)" />
            <rect x="-6" y="-21" width="15" height="7" rx="1.6" fill="#5d5c55" stroke="#3b3a33" strokeWidth="0.6" transform="rotate(30)" />
          </g>
        </g>
      )}
      {prop === "wrench" && (
        <g transform="translate(17 6)">
          <g className="flick-wrench">
            <line x1="-6" y1="5" x2="0" y2="0" stroke="#A46B55" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M0 0 L9 -12" stroke="#9aa09a" strokeWidth="3.4" strokeLinecap="round" />
            <path d="M6.5 -16 a4.6 4.6 0 1 0 6.4 2.4 l-3 1.2 -1.6 -2.6 z" fill="#9aa09a" />
          </g>
        </g>
      )}
      {prop === "cloth" && (
        <g className="flick-cloth">
          <rect x="-7" y="-6" width="12" height="10" rx="2.5" fill="#E6D3CC" stroke="#cfa996" strokeWidth="0.7" transform="rotate(-14)" />
        </g>
      )}
    </svg>
  );
}
