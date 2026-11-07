import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F6F2EA" }}>
        <svg width="140" height="140" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="21.5" fill="none" stroke="#252723" strokeWidth="2.4" />
          <path d="M13.5 26.5a10.5 10.5 0 0 1 21 0" fill="#A46B55" />
          <path d="M7 26.5h34" stroke="#252723" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M10.5 32h27M15.5 37.2h17" stroke="#A46B55" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M24 8.2v3.4M12.6 12.9l2.3 2.3M35.4 12.9l-2.3 2.3" stroke="#252723" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
