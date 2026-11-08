-- Southstill — initial schema
-- Run with the Supabase CLI (`supabase db push`) or paste into the Supabase SQL editor.
-- Safe to re-run: objects are created only if missing.

create extension if not exists pgcrypto;

do $$ begin
  create type public.inquiry_status as enum ('new', 'contacted', 'quoted', 'accepted', 'declined', 'booked', 'archived');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- inquiries
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.inquiry_status not null default 'new',
  kind text not null check (kind in ('quick', 'wizard', 'contact', 'story')),
  category text not null check (category in ('people', 'animals', 'weddings-events', 'business-branding', 'other')),
  package_id text check (package_id in ('little', 'full', 'whole')),
  extra_photos integer not null default 0 check (extra_photos between 0 and 60),
  add_ons text[] not null default '{}',
  group_details text,
  animals text,
  special_needs text,
  location_preference text,
  city text,
  zip text check (zip is null or zip ~ '^\d{5}$'),
  date_flexibility text check (date_flexibility in ('flexible', 'specific', 'range')),
  preferred_date date,
  preferred_date_alt date,
  preferred_time text check (preferred_time in ('morning', 'midday', 'evening', 'any')),
  travel_notes text,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) <= 200),
  phone text,
  sms_opt_in boolean not null default false,
  message text check (message is null or char_length(message) <= 4000),
  inspiration_photo_ids text[] not null default '{}',
  story_subject text,
  story_feeling text,
  estimate_cents integer,
  estimate_label text,
  estimate_detail jsonb,
  consent_privacy boolean not null check (consent_privacy),
  consent_at timestamptz not null,
  utm jsonb not null default '{}',
  landing_path text,
  referrer text,
  ip_hash text,
  user_agent text,
  dedupe_key text,
  owner_notification text,
  client_confirmation text,
  admin_notes text
);

create index if not exists inquiries_created_idx on public.inquiries (created_at desc);
create index if not exists inquiries_status_idx on public.inquiries (status, created_at desc);
create index if not exists inquiries_dedupe_idx on public.inquiries (dedupe_key, created_at desc);
create index if not exists inquiries_email_idx on public.inquiries (lower(email));

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists inquiries_touch on public.inquiries;
create trigger inquiries_touch before update on public.inquiries
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- pipeline history
create table if not exists public.inquiry_events (
  id bigint generated always as identity primary key,
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  created_at timestamptz not null default now(),
  actor text,
  type text not null,
  from_status public.inquiry_status,
  to_status public.inquiry_status,
  note text
);
create index if not exists inquiry_events_inquiry_idx on public.inquiry_events (inquiry_id, created_at desc);

-- ---------------------------------------------------------------- rate limiting (hashed IPs only)
create table if not exists public.submission_events (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  outcome text not null,
  created_at timestamptz not null default now()
);
create index if not exists submission_events_ip_idx on public.submission_events (ip_hash, created_at desc);

-- Housekeeping: call from the SQL editor or schedule with pg_cron (see README).
create or replace function public.prune_submission_events() returns void
language sql set search_path = '' as $$
  delete from public.submission_events where created_at < now() - interval '7 days';
$$;

-- ---------------------------------------------------------------- portfolio photos
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  storage_path text not null unique,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  bytes integer,
  blur_data_url text,
  original_filename text,
  category text not null default 'people' check (category in ('people', 'animals', 'weddings-events', 'brands', 'about')),
  subcategory text,
  title text,
  alt text not null default '',
  location text,
  capture_date date,
  focal_x smallint not null default 50 check (focal_x between 0 and 100),
  focal_y smallint not null default 50 check (focal_y between 0 and 100),
  sort_order integer not null default 100,
  featured boolean not null default false,
  hero boolean not null default false,
  published boolean not null default false,
  story_slug text,
  story_text text,
  license_status text not null default 'pending'
    check (license_status in ('owner_original', 'client_release', 'model_release', 'licensed', 'pending')),
  permission_note text,
  -- A photo can only be public once it has alt text and a confirmed license/permission.
  constraint photos_publishable check (not published or (char_length(btrim(alt)) > 0 and license_status <> 'pending'))
);
create index if not exists photos_public_idx on public.photos (published, sort_order, created_at desc);

drop trigger if exists photos_touch on public.photos;
create trigger photos_touch before update on public.photos
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- row level security
-- Inquiries, events and rate-limit rows have NO public policies: only the server
-- (service role / secret key) can read or write them.
alter table public.inquiries enable row level security;
alter table public.inquiry_events enable row level security;
alter table public.submission_events enable row level security;
alter table public.photos enable row level security;

drop policy if exists "Published photos are public" on public.photos;
create policy "Published photos are public" on public.photos
  for select to anon, authenticated using (published = true);

-- ---------------------------------------------------------------- storage
-- portfolio: public, optimized derivatives only (metadata stripped on upload).
-- portfolio-uploads: private staging for originals; deleted after processing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 15728640, array['image/jpeg', 'image/webp', 'image/avif', 'image/png'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-uploads', 'portfolio-uploads', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff'])
on conflict (id) do nothing;
