import Link from "next/link";
import { Suspense } from "react";
import { BookingComposer } from "@/components/admin/EmailComposer";
import { requireAdmin } from "@/lib/admin-auth";
import { getSiteData } from "@/lib/cms/data";
import { draftContent } from "@/lib/cms/ops";
import { getRepo } from "@/lib/cms/repo";
import { bookingOptions } from "@/lib/cms/sessions";

export const metadata = { title: "Send a booking confirmation" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireAdmin();
  const repo = getRepo();
  const content = repo ? await draftContent(repo) : (await getSiteData()).content;
  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <Link href="/admin/emails" className="text-sm underline">
          ← Emails
        </Link>
        <h1 className="mt-2 text-display-sm">Booking confirmation</h1>
        <p className="mt-2 text-muted">
          For clients who booked with you directly. Fill it in like the booking form on the site, add your own note, and watch the email build on the right. It lands in their inbox looking just like the inquiry email, with step 03 <em>Relax &amp; shoot</em> marked <strong>Coming soon</strong>.
        </p>
      </header>
      <BookingComposer pricing={content.pricing} options={bookingOptions(content)} />
    </div>
  );
}
