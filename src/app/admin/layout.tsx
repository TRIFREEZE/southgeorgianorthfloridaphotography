import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Lockup } from "@/components/ui/Logo";
import { getAdmin } from "@/lib/admin-auth";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Red Clay & Light" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gallery">
      <header className="border-b border-line bg-parchment">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link href="/admin" className="flex items-center gap-3">
            <Lockup />
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-gallery">Admin</span>
          </Link>
          <Suspense fallback={null}>
            <AdminNav />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}

async function AdminNav() {
  const admin = await getAdmin();
  if (!admin) return null;
  return (
    <nav aria-label="Admin" className="flex flex-wrap items-center gap-1 text-sm font-semibold">
      <Link className="rounded-full px-3 py-2 hover:bg-gallery" href="/admin">
        Overview
      </Link>
      <Link className="rounded-full px-3 py-2 hover:bg-gallery" href="/admin/leads">
        Leads
      </Link>
      <Link className="rounded-full px-3 py-2 hover:bg-gallery" href="/admin/photos">
        Photos
      </Link>
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
