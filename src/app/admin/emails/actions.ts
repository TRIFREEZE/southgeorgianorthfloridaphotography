"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { sendEmail } from "@/lib/email";
import { sampleEmails } from "@/lib/inquiry/email-samples";
import { serverEnv } from "@/lib/server-env";

/** Sends the sample email to the owner's inbox, so it can be checked on a real phone. */
export async function sendTestEmail(which: "client" | "owner"): Promise<{ ok: boolean; message: string }> {
  const admin = await requireAdmin();
  const env = serverEnv();
  if (!env.resendApiKey || !env.emailFrom) return { ok: false, message: "Email isn't set up yet: add RESEND_API_KEY and EMAIL_FROM in Vercel (see DEPLOYMENT.md, step 3)." };
  const to = env.ownerNotificationEmail ?? admin.email;
  const mail = (await sampleEmails())[which];
  const res = await sendEmail({ to, ...mail, subject: `[Test] ${mail.subject}` });
  return res.status === "sent" ? { ok: true, message: `Sent to ${to}. It should arrive within a minute.` } : { ok: false, message: `Couldn't send: ${res.status === "failed" ? res.reason : res.reason}` };
}
