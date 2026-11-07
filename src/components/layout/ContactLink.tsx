"use client";

import { track } from "@/lib/analytics";

export function ContactLink({
  kind,
  value,
  className,
  label,
}: {
  kind: "email" | "phone";
  value: string;
  className?: string;
  label?: string;
}) {
  const href = kind === "email" ? `mailto:${value}` : `tel:${value.replace(/[^\d+]/g, "")}`;
  return (
    <a href={href} className={className} onClick={() => track(kind === "email" ? "click_email" : "click_phone")}>
      {label ?? value}
    </a>
  );
}
