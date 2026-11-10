import { SOON_DAYS, STATUS_LABEL, type Status } from "@/lib/admin-data";

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

export const shortDate = (iso: string) => fmt(iso, { weekday: "short", month: "short", day: "numeric" });
export const longDate = (iso: string) => fmt(iso, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export function countdownText(days: number) {
  if (days < -1) return `${-days} days ago`;
  if (days === -1) return "Yesterday";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/** Red within SOON_DAYS days (and when the date has passed), calm otherwise. */
export function Countdown({ days }: { days: number }) {
  const soon = days <= SOON_DAYS;
  return (
    <span
      data-testid="countdown"
      data-soon={soon ? "true" : "false"}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${soon ? "bg-[#a3392b] text-white" : "bg-sand/60 text-ink"}`}
    >
      {soon && <span aria-hidden>●</span>}
      {countdownText(days)}
    </span>
  );
}

const TONE: Partial<Record<Status, string>> = {
  new: "bg-clay-deep text-gallery",
  booked: "bg-ink text-gallery",
  shot: "bg-[#5e6a5c] text-gallery",
  edited: "bg-[#7a6a50] text-gallery",
  delivered: "bg-[#3f6b4a] text-gallery",
  declined: "bg-line text-muted",
  archived: "bg-line text-muted",
};

export function StageBadge({ status }: { status: Status }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[status] ?? "bg-sand/60 text-ink"}`}>{STATUS_LABEL[status] ?? status}</span>;
}
