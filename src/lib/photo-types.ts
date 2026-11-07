import type { CategoryId } from "@/content/services";

export type PhotoCategory = CategoryId | "about";

export interface Photo {
  id: string;
  /** Public, optimized derivative. null for labeled sample placeholders. */
  src: string | null;
  width: number;
  height: number;
  blurDataUrl?: string | null;
  category: PhotoCategory;
  subcategory?: string | null;
  title: string;
  alt: string;
  location?: string | null;
  storyText?: string | null;
  storySlug?: string | null;
  focalX: number; // 0–100
  focalY: number; // 0–100
  featured: boolean;
  hero: boolean;
  /** True for built-in placeholders. Always visibly labeled on the site. */
  isSample: boolean;
  /** Placeholder art variant. */
  tone?: number;
}

export const orientationOf = (p: Pick<Photo, "width" | "height">) =>
  p.width > p.height * 1.08 ? "landscape" : p.height > p.width * 1.08 ? "portrait" : "square";
