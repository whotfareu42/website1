-- =====================================================================
--  Nation website – Supabase setup
--  Paste everything into Supabase: SQL Editor -> New query -> Run
-- =====================================================================

-- ---------- Admins ----------
-- Only users listed here can log into the Council panel and change content.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Constitution ----------
create table if not exists public.constitution_articles (
  id bigint generated always as identity primary key,
  position int not null default 0,
  title text not null check (char_length(title) <= 150),
  body text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------- Builds ----------
create table if not exists public.builds (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) <= 100),
  builder text not null default '',
  location text not null default '',
  description text not null default '',
  image_path text,
  image_url text,
  created_at timestamptz not null default now()
);

-- ---------- Citizenship applications ----------
create table if not exists public.applications (
  id bigint generated always as identity primary key,
  minecraft_name text not null check (minecraft_name ~ '^[A-Za-z0-9_]{3,16}$'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security (who may do what) ----------
alter table public.admins enable row level security;
alter table public.constitution_articles enable row level security;
alter table public.builds enable row level security;
alter table public.applications enable row level security;

-- Admins can see their own admin entry (nobody can edit this table from the website)
create policy "admins see themselves" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- Everyone can read the constitution and builds; only admins can change them
create policy "public reads constitution" on public.constitution_articles
  for select to anon, authenticated using (true);
create policy "admins manage constitution" on public.constitution_articles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public reads builds" on public.builds
  for select to anon, authenticated using (true);
create policy "admins manage builds" on public.builds
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Anyone can submit an application (always as 'pending'); only admins can see and manage them
create policy "anyone can apply" on public.applications
  for insert to anon, authenticated with check (status = 'pending');
create policy "admins read applications" on public.applications
  for select to authenticated using (public.is_admin());
create policy "admins update applications" on public.applications
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete applications" on public.applications
  for delete to authenticated using (public.is_admin());

-- ---------- Image storage for build screenshots ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('builds', 'builds', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "admins upload build images" on storage.objects
  for insert to authenticated with check (bucket_id = 'builds' and public.is_admin());
create policy "admins update build images" on storage.objects
  for update to authenticated using (bucket_id = 'builds' and public.is_admin());
create policy "admins delete build images" on storage.objects
  for delete to authenticated using (bucket_id = 'builds' and public.is_admin());

-- ---------- Starter content (edit or delete later in the Council panel) ----------
insert into public.constitution_articles (position, title, body) values
  (1, 'Of the Realm', 'The Kingdom is a sovereign nation upon this server, founded by its first citizens in good faith and fellowship.'),
  (2, 'Of the Crown and the Council', 'The Crown leads the Kingdom. A Council of Admins advises the Crown and keeps order in the realm.'),
  (3, 'Of the Citizens', 'Every citizen may build, trade and dwell within the Kingdom''s borders.

Griefing, theft and dishonour towards fellow citizens are forbidden.');

-- =====================================================================
--  ADDING AN ADMIN (run separately, once per admin):
--  1. Authentication -> Users -> "Add user" (email + password, tick "Auto Confirm")
--  2. Then run this line with their email:
--
--  insert into public.admins (user_id) select id from auth.users where email = 'admin@example.com';
-- =====================================================================
