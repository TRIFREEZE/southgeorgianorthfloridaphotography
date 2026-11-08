import { ImageResponse } from "next/og";
import { logoSvg } from "@/components/ui/logo-paths";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const mark = `data:image/svg+xml;base64,${Buffer.from(logoSvg({ word: false })).toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F6F2EA" }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- rendered to PNG by ImageResponse */}
        <img src={mark} width={140} height={100} />
      </div>
    ),
    size,
  );
}
