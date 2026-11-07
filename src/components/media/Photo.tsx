import Image from "next/image";
import type { Photo as PhotoT } from "@/lib/photo-types";
import { SamplePlate } from "./SamplePlate";

/**
 * Renders a real photo with next/image (responsive AVIF/WebP, lazy by default,
 * blurred preview, focal-point aware crop) or a labeled sample plate.
 * The parent sets the box size/aspect; this fills it.
 */
export function PhotoFill({
  photo,
  sizes,
  priority = false,
  className = "",
  showSampleLabel = true,
  quality = 75,
}: {
  photo: PhotoT;
  sizes: string;
  priority?: boolean;
  className?: string;
  showSampleLabel?: boolean;
  quality?: 60 | 75 | 85;
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
      className={`object-cover ${className}`}
      style={{ objectPosition: `${photo.focalX}% ${photo.focalY}%` }}
    />
  );
}
