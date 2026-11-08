import "server-only";
import sharp from "sharp";

/**
 * Turns an uploaded original into the site's master file:
 * auto-rotated from EXIF, converted to sRGB, capped at 2560px on the long edge,
 * stripped of all metadata (including GPS), saved as a high-quality JPEG, plus a
 * tiny blurred placeholder. Vercel's image optimizer then serves responsive
 * AVIF/WebP sizes from this master. The untouched original is kept separately.
 */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"] as const;

export const extFor = (type: string, filename: string) => {
  const fromName = filename.toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1];
  const map: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/tiff": "tif" };
  return map[type] ?? fromName ?? "bin";
};

export interface Processed {
  data: Buffer;
  width: number;
  height: number;
  bytes: number;
  blur: string;
}

export class ImageError extends Error {}

export async function processImage(input: Buffer, maxEdge = 2560, quality = 86): Promise<Processed> {
  try {
    const out = await sharp(input, { failOn: "error", limitInputPixels: 300_000_000 })
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
      .toColorspace("srgb")
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toBuffer({ resolveWithObject: true });
    const tiny = await sharp(out.data).resize(24, 24, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
    return { data: out.data, width: out.info.width, height: out.info.height, bytes: out.info.size, blur: `data:image/webp;base64,${tiny.toString("base64")}` };
  } catch {
    throw new ImageError("That file couldn't be read as a photo. If it's an iPhone HEIC file, export it as JPEG and try again.");
  }
}

/** A readable default title/alt from a file name; camera names like IMG_2041 give nothing useful. */
export function titleFromFilename(filename: string) {
  const base = filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base || /^(img|dsc|dscf|dsc_|_mg|pxl|mvimg|photo|image|p)\s?\d+[a-z]?$/i.test(base) || /^\d+$/.test(base.replace(/\s/g, ""))) return "";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export const slugify = (s: string, fallback = "photo") =>
  s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || fallback;
