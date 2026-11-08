import { devStorageEnabled, notFound, serveFile, verifySigned } from "@/lib/cms/dev-storage";

/** Local-only equivalent of a Supabase signed download URL (private buckets). */
export async function GET(req: Request) {
  if (!devStorageEnabled()) return notFound();
  const url = new URL(req.url);
  const target = verifySigned(url);
  if (!target) return new Response("Link expired", { status: 403 });
  return serveFile(target.bucket, target.path, { download: url.searchParams.get("dl") ?? undefined });
}
