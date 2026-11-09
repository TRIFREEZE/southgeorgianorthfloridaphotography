-- Southstill: bookings you add yourself from /admin/emails ("Booking confirmed").
-- Run after 20261110000000_social.sql. Safe to re-run.
--
-- They're saved as leads with status "booked" and the kind "booking". Until this
-- runs they're still saved (as kind "wizard", marked in the message).

alter table public.inquiries drop constraint if exists inquiries_kind_check;
alter table public.inquiries add constraint inquiries_kind_check check (kind in ('quick', 'wizard', 'contact', 'story', 'booking'));
