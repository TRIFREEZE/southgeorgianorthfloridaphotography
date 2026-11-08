"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminConfig, checkPassword, endSession, requireAdmin, startSession } from "@/lib/admin-auth";
import { STATUSES } from "@/lib/admin-data";
import { serverEnv } from "@/lib/server-env";
import { clientIp, hashIp } from "@/lib/security";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type ActionState = { ok?: boolean; error?: string; message?: string };

/* ------------------------------------------------------------------ auth */

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const cfg = adminConfig();
  if (!cfg.ok) return { error: `Admin is not configured: ${cfg.problem}` };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const ipHash = hashIp(clientIp(await headers()));
  if ((await recentLoginFailures(ipHash)) >= 8) return { error: "Too many attempts. Please wait 15 minutes." };

  const allowed = serverEnv().adminEmails.includes(email);
  const valid = allowed && (await checkPassword(email, password));
  if (!valid) {
    await recordLoginFailure(ipHash);
    return { error: "That email and password didn't match an admin account." };
  }
  await startSession(email);
  redirect("/admin");
}

/* Login throttling: stored in Supabase in production; in memory for local dev only. */
const localFails = new Map<string, number[]>();
async function recentLoginFailures(ipHash: string) {
  const since = Date.now() - 15 * 60_000;
  if (!isSupabaseConfigured()) return (localFails.get(ipHash) ?? []).filter((t) => t > since).length;
  const { count } = await getServiceClient()
    .from("submission_events")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("outcome", "login-fail")
    .gte("created_at", new Date(since).toISOString());
  return count ?? 0;
}
async function recordLoginFailure(ipHash: string) {
  if (!isSupabaseConfigured()) {
    localFails.set(ipHash, [...(localFails.get(ipHash) ?? []), Date.now()]);
    return;
  }
  await getServiceClient().from("submission_events").insert({ ip_hash: ipHash, outcome: "login-fail" });
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

/* ------------------------------------------------------------------ leads */

export async function updateLeadStatus(formData: FormData) {
  const admin = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const to = z.enum(STATUSES).parse(formData.get("status"));
  const db = getServiceClient();
  const { data: before } = await db.from("inquiries").select("status").eq("id", id).single();
  const { error } = await db.from("inquiries").update({ status: to }).eq("id", id);
  if (error) throw new Error(error.message);
  await db.from("inquiry_events").insert({ inquiry_id: id, type: "status", from_status: before?.status ?? null, to_status: to, actor: admin.email });
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/leads");
}

export async function addLeadNote(formData: FormData) {
  const admin = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const note = z.string().trim().min(1).max(4000).parse(formData.get("note"));
  const db = getServiceClient();
  const { data } = await db.from("inquiries").select("admin_notes").eq("id", id).single();
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const notes = `${data?.admin_notes ? `${data.admin_notes}\n\n` : ""}[${stamp}] ${note}`;
  await db.from("inquiries").update({ admin_notes: notes }).eq("id", id);
  await db.from("inquiry_events").insert({ inquiry_id: id, type: "note", note, actor: admin.email });
  revalidatePath(`/admin/leads/${id}`);
}

export async function deleteLead(formData: FormData) {
  await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  if (formData.get("confirm") !== "DELETE") throw new Error("Type DELETE to confirm.");
  await getServiceClient().from("inquiries").delete().eq("id", id);
  revalidatePath("/admin/leads");
  redirect("/admin/leads");
}
