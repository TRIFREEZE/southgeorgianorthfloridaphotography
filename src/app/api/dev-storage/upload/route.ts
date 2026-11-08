import { devStorageEnabled, notFound, storeUpload, verifySigned } from "@/lib/cms/dev-storage";

const MAX = 100 * 1024 * 1024;

/** Local-only equivalent of a Supabase signed upload URL. */
export async function PUT(req: Request) {
  if (!devStorageEnabled()) return notFound();
  const target = verifySigned(new URL(req.url));
  if (!target) return new Response("Invalid or expired upload link", { status: 403 });
  const body = await req.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX) return new Response("File too large", { status: 413 });
  await storeUpload(target.bucket, target.path, body);
  return Response.json({ ok: true });
}
