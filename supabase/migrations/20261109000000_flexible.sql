-- Southstill: flexible categories, packages and the story builder.
-- Run after 20261108000000_cms.sql. Safe to re-run.
--
-- * Inquiries can now be for any category you create in /admin → Categories,
--   and for any package (including "Custom"), so the fixed lists are relaxed to
--   a simple shape check.
-- * site_content gains a 'story' row for the Build-your-story options.

alter table public.inquiries drop constraint if exists inquiries_category_check;
alter table public.inquiries add constraint inquiries_category_check check (category ~ '^[a-z0-9-]{1,70}$');

alter table public.inquiries drop constraint if exists inquiries_package_id_check;
alter table public.inquiries add constraint inquiries_package_id_check check (package_id is null or package_id ~ '^[a-z0-9-]{1,40}$');

alter table public.site_content drop constraint if exists site_content_key_check;
alter table public.site_content add constraint site_content_key_check
  check (key in ('layout', 'categories', 'pricing', 'texts', 'faqs', 'testimonials', 'story'));
