import type { PhotoCategory } from "@/lib/photo-types";

export interface FilmStripPhoto {
  id: string;
  src: string | null;
  alt: string;
  tone: number;
  category: PhotoCategory;
  title: string;
  width: number;
  height: number;
}

export type FlickMood = "neutral" | "happy" | "sleepy" | "surprised" | "curious";
export type FlickProp = null | "map" | "cloth";
