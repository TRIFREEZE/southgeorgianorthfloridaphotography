import Image from "next/image";
import type { CSSProperties } from "react";
import type { Photo as PhotoT } from "@/lib/photo-types";
import { SamplePlate } from "./SamplePlate";

/** CSS variables carrying the owner's crop for phones and for desktop (≥768px). */
export function cropStyle(p: Pick<PhotoT, "focalX" | "focalY" | "focalMX" | "focalMY" | "zoomD" | "zoomM">): CSSProperties {
  return {
    ["--pos-d" as string]: `${p.focalX}% ${p.focalY}%`,
    ["--pos-m" as string]: `${p.focalMX ?? p.focalX}% ${p.focalMY ?? p.focalY}%`,
    ["--z-d" as string]: String(p.zoomD ?? 1),
    ["--z-m" as string]: String(p.zoomM ?? 1),
  };
}

export const CROP_CLASS =
  "object-cover [object-position:var(--pos-m)] [transform-origin:var(--pos-m)] [transform:scale(var(--z-m))] md:[object-position:var(--pos-d)] md:[transform-origin:var(--pos-d)] md:[transform:scale(var(--z-d))]";

/**
 * Renders a real photo with next/image (responsive AVIF/WebP generated on demand,
 * lazy by default, blurred preview) using the owner's mobile/desktop crop, or a
 * labeled sample plate. The parent sets the box size/aspect; this fills it.
 */
export function PhotoFill({
  photo,
  sizes,
  priority = false,
  className = "",
  showSampleLabel = true,
  quality = 75,
  crop = true,
}: {
  photo: PhotoT;
  sizes: string;
  priority?: boolean;
  className?: string;
  showSampleLabel?: boolean;
  quality?: 60 | 75 | 85;
  /** false = show the whole frame (lightbox). */
  crop?: boolean;
}) {
  if (!photo.src) {
    return (
      <div className={`absolute inset-0 ${className}`} role="img" aria-label={photo.alt}>
        <SamplePlate photo={photo} showLabel={showSampleLabel} />
      </div>
    );
  }
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      fill
      sizes={sizes}
      quality={quality}
      preload={priority}
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? "eager" : "lazy"}
      placeholder={photo.blurDataUrl ? "blur" : "empty"}
      blurDataURL={photo.blurDataUrl ?? undefined}
      className={`${crop ? CROP_CLASS : "object-contain"} ${className}`}
      style={crop ? cropStyle(photo) : undefined}
    />
  );
}
