/** A displayable photograph (real or labeled sample). `category` holds a category id. */
export interface Photo {
  id: string;
  /** Public, optimized master. null for labeled sample placeholders. */
  src: string | null;
  width: number;
  height: number;
  blurDataUrl?: string | null;
  category: string | null;
  /** Every category the photo appears in (its main one first). Defaults to `[category]`. */
  categories?: string[];
  subcategory?: string | null;
  title: string;
  alt: string;
  location?: string | null;
  storyText?: string | null;
  storySlug?: string | null;
  /** Focal point for desktop (≥768px) and mobile, 0–100. */
  focalX: number;
  focalY: number;
  focalMX?: number;
  focalMY?: number;
  /** Crop zoom (1 = none) for desktop and mobile. */
  zoomD?: number;
  zoomM?: number;
  featured: boolean;
  hero: boolean;
  sortOrder?: number;
  /** True for built-in placeholders. Always visibly labeled on the site. */
  isSample: boolean;
  /** Placeholder art variant. */
  tone?: number;
}

export type PhotoCategory = string | null;

export const orientationOf = (p: Pick<Photo, "width" | "height">) =>
  p.width > p.height * 1.08 ? "landscape" : p.height > p.width * 1.08 ? "portrait" : "square";
