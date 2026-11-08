import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-auth";

/** Admin-only: turn on Draft Mode so the public pages show unpublished changes. */
export async function GET(req: Request) {
  if (!(await getAdmin())) return new Response("Log in to the dashboard to preview.", { status: 401 });
  const to = new URL(req.url).searchParams.get("to") ?? "/";
  (await draftMode()).enable();
  redirect(to.startsWith("/") && !to.startsWith("//") ? to : "/");
}
