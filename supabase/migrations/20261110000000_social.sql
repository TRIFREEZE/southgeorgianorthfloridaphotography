-- Southstill: a social media link on every inquiry.
-- Run after 20261109000000_flexible.sql. Safe to re-run.
--
-- Visitors now add their Facebook or Instagram name (or a link, if they like)
-- so you know who you'll be photographing. Until this runs, inquiries are still
-- saved: the link is kept at the top of the message instead.

alter table public.inquiries add column if not exists social_link text;
alter table public.inquiries drop constraint if exists inquiries_social_link_len;
alter table public.inquiries add constraint inquiries_social_link_len check (social_link is null or char_length(social_link) <= 300);
