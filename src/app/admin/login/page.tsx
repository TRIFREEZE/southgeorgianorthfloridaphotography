import { Suspense } from "react";
import { redirect } from "next/navigation";
import { adminConfig, getAdmin } from "@/lib/admin-auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-display-sm">Owner login</h1>
      <Suspense fallback={null}>
        <LoginGate />
      </Suspense>
    </div>
  );
}

async function LoginGate() {
  const cfg = adminConfig();
  if (!cfg.ok) {
    return (
      <div className="mt-6 rounded-xl border border-clay/40 bg-parchment p-5 text-sm">
        <p className="font-semibold">Admin isn&apos;t set up yet.</p>
        <p className="mt-2 text-muted">{cfg.problem} See the deployment guide (docs/DEPLOYMENT.md) for the environment variables to add in Vercel.</p>
      </div>
    );
  }
  if (await getAdmin()) redirect("/admin");
  return <LoginForm />;
}
