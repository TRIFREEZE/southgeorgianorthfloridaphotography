import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = `${site.name}: ${site.seoHeadline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card. Typography-led so it never misrepresents a placeholder as portfolio work. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#F6F2EA", padding: 72, color: "#252723" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="21.5" fill="none" stroke="#252723" strokeWidth="2.2" />
            <path d="M13.5 26.5a10.5 10.5 0 0 1 21 0" fill="#A46B55" />
            <path d="M7 26.5h34" stroke="#252723" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M10.5 32h27M15.5 37.2h17" stroke="#A46B55" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 40, letterSpacing: -0.5 }}>Red Clay & Light</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, lineHeight: 1.04, letterSpacing: -2, maxWidth: 980 }}>The good moments deserve more than a timer.</div>
          <div style={{ fontSize: 30, marginTop: 28, color: "#5d5c55" }}>{site.seoHeadline}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#8E5A46" }}>
          <span>Portraits · Families · Pets & Horses · Weddings · Brands</span>
          <span>{site.primaryLine}</span>
        </div>
      </div>
    ),
    size,
  );
}
