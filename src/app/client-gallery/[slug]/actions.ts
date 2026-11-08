"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { accessMaxAge, accessToken, galleryCookie, isAvailable, verifyPassword } from "@/lib/cms/galleries";
import { getRepo } from "@/lib/cms/repo";
import { clientIp, hashIp } from "@/lib/security";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

const localFails = new Map<string, number[]>();
const WINDOW = 15 * 60_000;
const LIMIT = 10;

async function failures(key: string) {
  const since = Date.now() - WINDOW;
  if (!isSupabaseConfigured()) return (localFails.get(key) ?? []).filter((t) => t > since).length;
  const { count } = await getServiceClient().from("submission_events").select("id", { count: "exact", head: true }).eq("ip_hash", key).eq("outcome", "gallery-fail").gte("created_at", new Date(since).toISOString());
  return count ?? 0;
}
async function recordFailure(key: string) {
  if (!isSupabaseConfigured()) return void localFails.set(key, [...(localFails.get(key) ?? []), Date.now()]);
  await getServiceClient().from("submission_events").insert({ ip_hash: key, outcome: "gallery-fail" });
}

export async function unlockGallery(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const slug = String(form.get("slug") ?? "");
  const password = String(form.get("password") ?? "");
  const repo = getRepo();
  if (!repo || !/^[a-z0-9-]{3,80}$/.test(slug)) return { error: "This gallery isn't available." };
  const key = hashIp(clientIp(await headers()));
  if ((await failures(key)) >= LIMIT) return { error: "Too many tries. Please wait 15 minutes, or ask your photographer for help." };
  const g = await repo.getGalleryBySlug(slug);
  if (!g || !isAvailable(g) || !password || !(await verifyPassword(password, g.passwordHash))) {
    await recordFailure(key);
    return { error: "That password didn't work. Check the spelling, or ask your photographer." };
  }
  (await cookies()).set(galleryCookie(g.id), accessToken(g), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/client-gallery/${slug}`,
    maxAge: accessMaxAge,
  });
  redirect(`/client-gallery/${slug}`);
}

export async function lockGallery(form: FormData) {
  const slug = String(form.get("slug") ?? "");
  const repo = getRepo();
  const g = repo && /^[a-z0-9-]{3,80}$/.test(slug) ? await repo.getGalleryBySlug(slug) : null;
  if (g) (await cookies()).delete({ name: galleryCookie(g.id), path: `/client-gallery/${slug}` });
  redirect(`/client-gallery/${slug}`);
}
