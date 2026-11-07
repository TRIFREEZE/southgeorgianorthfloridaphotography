"use client";

import { useSearchParams } from "next/navigation";

export function ThanksRef() {
  const ref = useSearchParams().get("ref");
  if (!ref || !/^RCL-[A-Z0-9]{6}$/.test(ref)) return null;
  return (
    <p className="mt-8 inline-flex rounded-full border border-line bg-gallery px-5 py-2 text-sm">
      Your reference: <strong className="ml-1.5 tracking-wider">{ref}</strong>
    </p>
  );
}
