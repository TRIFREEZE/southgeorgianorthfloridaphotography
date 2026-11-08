import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PublishBar } from "@/components/admin/PublishBar";
import { ToastProvider } from "@/components/admin/ui";
import { Lockup } from "@/components/ui/Logo";
import { getAdmin } from "@/lib/admin-auth";
import { pendingChanges } from "@/lib/cms/ops";
import { getRepo } from "@/lib/cms/repo";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Southstill" },
  robots: { index: false, follow: false, nocache: true },
};

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/site-photos", label: "Site photos" },
  { href: "/admin/library", label: "Photo library" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/content", label: "Pricing & text" },
  { href: "/admin/galleries", label: "Client galleries" },
  { href: "/admin/leads", label: "Leads" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-dvh bg-gallery">
        <header className="border-b border-line bg-parchment">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
            <Link href="/admin" className="flex items-center gap-3">
              <Lockup />
              <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-gallery">Dashboard</span>
            </Link>
            <Suspense fallback={null}>
              <AdminNav />
            </Suspense>
          </div>
        </header>
        <Suspense fallback={null}>
          <Bar />
        </Suspense>
        <main className="mx-auto max-w-7xl px-5 py-10">{children}</main>
      </div>
    </ToastProvider>
  );
}

async function Bar() {
  const admin = await getAdmin();
  const repo = getRepo();
  if (!admin || !repo) return null;
  const pending = await pendingChanges(repo).catch(() => null);
  return pending ? <PublishBar pending={pending} /> : null;
}

async function AdminNav() {
  const admin = await getAdmin();
  if (!admin) return null;
  return (
    <nav aria-label="Admin" className="flex flex-wrap items-center gap-1 text-sm font-semibold">
      {NAV.map((n) => (
        <Link key={n.href} className="rounded-full px-3 py-2 hover:bg-gallery" href={n.href}>
          {n.label}
        </Link>
      ))}
      <Link className="rounded-full px-3 py-2 hover:bg-gallery" href="/" target="_blank">
        View site ↗
      </Link>
      <form action={logoutAction}>
        <button className="rounded-full px-3 py-2 text-muted hover:bg-gallery" type="submit">
          Log out
        </button>
      </form>
    </nav>
  );
}
