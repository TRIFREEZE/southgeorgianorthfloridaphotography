import Link from "next/link";
import { Suspense } from "react";
import { NewLeadForm } from "@/components/admin/NewLeadForm";
import { requireAdmin } from "@/lib/admin-auth";
import { getSiteData } from "@/lib/cms/data";
import { bookingOptions } from "@/lib/cms/sessions";

export const metadata = { title: "New lead" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireAdmin();
  const { content } = await getSiteData();
  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <Link href="/admin/leads" className="text-sm underline">
          ← All leads
        </Link>
        <h1 className="mt-2 text-display-sm">New lead</h1>
        <p className="mt-2 text-muted">For people who reached you another way: a call, a text, a DM, a friend of a friend. Nothing is sent to them.</p>
      </header>
      <NewLeadForm pricing={content.pricing} options={bookingOptions(content, { includeHidden: true })} />
    </div>
  );
}
