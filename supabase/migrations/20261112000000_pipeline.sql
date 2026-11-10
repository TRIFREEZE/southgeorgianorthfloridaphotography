-- Southstill: leads you add yourself, session dates, and the after-booking stages.
-- Run after 20261111000000_bookings.sql. Safe to re-run.
--
-- - New stages after "booked": shot → edited → delivered.
-- - session_date / session_time: the confirmed shoot date, for "Coming up".
-- - kind "manual": leads you add from the dashboard.
-- Until this runs, the new stages and session dates can't be saved (the dashboard says so).

alter type public.inquiry_status add value if not exists 'shot' after 'booked';
alter type public.inquiry_status add value if not exists 'edited' after 'shot';
alter type public.inquiry_status add value if not exists 'delivered' after 'edited';

alter table public.inquiries add column if not exists session_date date;
alter table public.inquiries add column if not exists session_time text;
alter table public.inquiries drop constraint if exists inquiries_session_time_len;
alter table public.inquiries add constraint inquiries_session_time_len check (session_time is null or char_length(session_time) <= 60);
create index if not exists inquiries_session_idx on public.inquiries (session_date) where session_date is not null;

alter table public.inquiries drop constraint if exists inquiries_kind_check;
alter table public.inquiries add constraint inquiries_kind_check check (kind in ('quick', 'wizard', 'contact', 'story', 'booking', 'manual'));
