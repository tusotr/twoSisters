-- Two Sisters Tampa — customer database for Supabase
-- Run this ONCE in Supabase → SQL Editor → New query → paste → Run.
-- Before running, put the real login emails in section 1.

-- 1) WHO IS ALLOWED IN ----------------------------------------------------
-- Only the emails listed here can read or change anything. Create the same
-- people under Authentication → Users → Add user (tick "Auto Confirm User").
create table if not exists public.staff (email text primary key);
alter table public.staff enable row level security;   -- no policies = not readable through the API

insert into public.staff (email) values
  ('cuccu771@gmail.com')
  -- , ('your-sister@example.com')
on conflict do nothing;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- 2) CUSTOMERS ------------------------------------------------------------
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  fb_link       text not null default '',
  phone         text not null default '',
  email         text not null default '',
  delivery_date date,
  categories    text[] not null default '{}',
  items         jsonb not null default '[]'::jsonb,
  detail        text not null default '',
  note          text not null default '',
  total         numeric(12,2),
  image_ids     text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Already ran an earlier version of this script? This adds the price-breakdown column:
alter table public.customers add column if not exists items jsonb not null default '[]'::jsonb;

create index if not exists customers_delivery_date_idx on public.customers (delivery_date);

alter table public.customers enable row level security;
drop policy if exists "staff full access" on public.customers;
create policy "staff full access" on public.customers
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- 3) REFERENCE PICTURES (private storage bucket) ---------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('customer-pictures', 'customer-pictures', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "staff pictures" on storage.objects;
create policy "staff pictures" on storage.objects
  for all to authenticated
  using (bucket_id = 'customer-pictures' and public.is_staff())
  with check (bucket_id = 'customer-pictures' and public.is_staff());
