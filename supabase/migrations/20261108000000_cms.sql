-- Southstill: photography CMS (draft → preview → publish), site content,
-- private client galleries and storage usage.
-- Run after 20261107000000_init.sql. Safe to re-run.

-- ---------------------------------------------------------------- media library
-- Each photo keeps a published state (`live`) and a working copy (`draft`).
-- Admin edits only touch `draft`; "Publish" copies draft → live for every dirty row.
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  live jsonb,                       -- null until first published
  draft jsonb not null,
  published boolean not null default false,  -- true once a live version exists (live.published decides visibility)
  dirty boolean not null default true,       -- draft differs from live
  pending_delete boolean not null default false,
  orphan_paths text[] not null default '{}'  -- old files to remove once a replacement is published
);
create index if not exists media_published_idx on public.media (published);
create index if not exists media_dirty_idx on public.media (dirty) where dirty;

drop trigger if exists media_touch on public.media;
create trigger media_touch before update on public.media
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- site content
-- One row per editable area: layout (photo placements), categories, pricing,
-- texts, faqs, testimonials. Same draft/published pattern.
create table if not exists public.site_content (
  key text primary key check (key in ('layout', 'categories', 'pricing', 'texts', 'faqs', 'testimonials')),
  draft jsonb not null,
  published jsonb,
  dirty boolean not null default true,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

drop trigger if exists site_content_touch on public.site_content;
create trigger site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- client galleries (private)
create table if not exists public.client_galleries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null unique,               -- unguessable, used in the share link
  title text not null,
  client_name text,
  message text,
  password_hash text not null,             -- scrypt, never the password itself
  expires_at timestamptz,
  allow_downloads boolean not null default true,
  active boolean not null default true
);

drop trigger if exists client_galleries_touch on public.client_galleries;
create trigger client_galleries_touch before update on public.client_galleries
  for each row execute function public.touch_updated_at();

create table if not exists public.client_gallery_photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries (id) on delete cascade,
  created_at timestamptz not null default now(),
  web_path text not null,
  original_path text not null,
  filename text,
  width integer not null,
  height integer not null,
  bytes integer,
  original_bytes integer,
  blur_data_url text,
  sort_order integer not null default 0
);
create index if not exists client_gallery_photos_idx on public.client_gallery_photos (gallery_id, sort_order);

-- ---------------------------------------------------------------- row level security
-- No public policies: the website reads through the server (secret key) only,
-- so drafts, galleries and passwords are never reachable from a browser.
alter table public.media enable row level security;
alter table public.site_content enable row level security;
alter table public.client_galleries enable row level security;
alter table public.client_gallery_photos enable row level security;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-galleries', 'client-galleries', false, 104857600, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff'])
on conflict (id) do nothing;

-- Originals are preserved in portfolio-uploads/originals; allow larger files.
update storage.buckets set file_size_limit = 104857600 where id = 'portfolio-uploads';

-- Storage usage for the dashboard (server/secret key only).
create or replace function public.storage_usage()
returns table (bucket text, files bigint, bytes bigint)
language sql security definer set search_path = '' as $$
  select o.bucket_id::text, count(*)::bigint, coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects o
  where o.bucket_id in ('portfolio', 'portfolio-uploads', 'client-galleries')
  group by o.bucket_id;
$$;
revoke all on function public.storage_usage() from public, anon, authenticated;
grant execute on function public.storage_usage() to service_role;

-- ---------------------------------------------------------------- carry over photos from v1 (if any)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'photos') then
    insert into public.media (id, created_at, live, draft, published, dirty)
    select p.id, p.created_at,
      case when p.published then s.state end,
      s.state,
      p.published,
      not p.published
    from public.photos p
    cross join lateral (
      select jsonb_build_object(
        'storagePath', p.storage_path, 'width', p.width, 'height', p.height, 'bytes', p.bytes,
        'blur', p.blur_data_url, 'originalPath', null, 'originalBytes', null, 'filename', p.original_filename,
        'title', coalesce(p.title, ''), 'alt', p.alt, 'description', coalesce(p.story_text, ''),
        'location', coalesce(p.location, ''),
        'categoryId', case when p.category = 'about' then null else p.category end,
        'sortOrder', p.sort_order, 'featured', p.featured, 'published', p.published,
        'focal', jsonb_build_object('dx', p.focal_x, 'dy', p.focal_y, 'mx', p.focal_x, 'my', p.focal_y),
        'zoom', jsonb_build_object('d', 1, 'm', 1),
        'license', p.license_status, 'permissionNote', coalesce(p.permission_note, '')
      ) as state
    ) s
    on conflict (id) do nothing;
  end if;
end $$;
