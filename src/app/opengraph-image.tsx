import { ImageResponse } from "next/og";
import { logoSvg } from "@/components/ui/logo-paths";
import { site } from "@/content/site";

const lockup = `data:image/svg+xml;base64,${Buffer.from(logoSvg()).toString("base64")}`;

export const alt = `${site.name}: ${site.seoHeadline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card. Typography-led so it never misrepresents a placeholder as portfolio work. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#F6F2EA", padding: 72, color: "#252723" }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- rendered to PNG by ImageResponse */}
        <img src={lockup} width={420} height={82} />
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
