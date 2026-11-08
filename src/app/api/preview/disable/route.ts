import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

/** Leave preview. Anyone may turn it off. */
export async function GET(req: Request) {
  const to = new URL(req.url).searchParams.get("to") ?? "/admin";
  (await draftMode()).disable();
  redirect(to.startsWith("/") && !to.startsWith("//") ? to : "/admin");
}
