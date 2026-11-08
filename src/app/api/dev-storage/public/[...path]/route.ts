import { devStorageEnabled, notFound, serveFile } from "@/lib/cms/dev-storage";

/** Local-only equivalent of the public `portfolio` bucket. */
export async function GET(_req: Request, ctx: RouteContext<"/api/dev-storage/public/[...path]">) {
  if (!devStorageEnabled()) return notFound();
  const { path } = await ctx.params;
  return serveFile("portfolio", path.map(decodeURIComponent).join("/"), { immutable: true });
}
